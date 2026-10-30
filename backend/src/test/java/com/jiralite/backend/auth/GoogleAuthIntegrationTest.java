package com.jiralite.backend.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.json.webtoken.JsonWebSignature;
import com.google.api.client.json.webtoken.JsonWebToken;
import com.google.api.client.testing.http.MockHttpTransport;
import com.google.api.client.testing.http.MockLowLevelHttpRequest;
import com.google.api.client.testing.http.MockLowLevelHttpResponse;
import com.jiralite.backend.BackendApplication;
import com.jiralite.backend.IsolatedDatabaseTestSupport;
import com.jiralite.backend.user.GlobalRole;
import com.jiralite.backend.user.User;
import com.jiralite.backend.user.UserRepository;
import com.jiralite.backend.project.ProjectMember;
import com.jiralite.backend.project.ProjectMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpSession;

import jakarta.servlet.http.Cookie;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.security.web.csrf.CsrfToken;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = BackendApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("isolated-test")
@TestPropertySource(properties = "JIRALITE_GOOGLE_CLIENT_ID=test-client")
@Import(GoogleAuthIntegrationTest.LocalVerifierConfiguration.class)
class GoogleAuthIntegrationTest {
    @Autowired private MockMvc mvc;
    @Autowired private UserRepository users;
    @Autowired private ProjectMemberRepository projectMembers;
    @Autowired private PasswordEncoder encoder;

    @DynamicPropertySource
    static void isolatedDatabase(DynamicPropertyRegistry registry) {
        IsolatedDatabaseTestSupport.registerProperties(registry);
    }

    @BeforeEach
    void cleanUsers() {
        List<String> ownedEmails = List.of(
                "first@example.com", "aud@example.com", "issuer@example.com", "expired@example.com",
                "unverified@example.com", "missing-sub@example.com", "csrf@example.com",
                "collision@example.com", "new-sub@example.com", "accounts.google.com@example.com",
                "https://accounts.google.com@example.com");
        ownedEmails.stream()
                .map(users::findByEmailIgnoreCase)
                .flatMap(Optional::stream)
                .forEach(user -> {
                    List<ProjectMember> ownedMemberships = projectMembers.findAllByUserId(user.getId());
                    projectMembers.deleteAll(ownedMemberships);
                    users.delete(user);
                });
    }

    @Test
    void validFirstAndRepeatSignInCreatesUserAndPersistsSession() throws Exception {
        String token = token("sub-first", "first@example.com", "First User", true,
                "accounts.google.com", Instant.now().plusSeconds(300), "test-client");
        var parsed = com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.parse(
                GsonFactory.getDefaultInstance(), token);
        org.assertj.core.api.Assertions.assertThat(parsed.getPayload().getAudience()).isEqualTo("test-client");
        org.assertj.core.api.Assertions.assertThat(parsed.getPayload().getIssuer()).isEqualTo("accounts.google.com");
        org.assertj.core.api.Assertions.assertThat(parsed.getPayload().getSubject()).isEqualTo("sub-first");
        org.assertj.core.api.Assertions.assertThat(parsed.getPayload().getEmail()).isEqualTo("first@example.com");
        org.assertj.core.api.Assertions.assertThat(parsed.getPayload().getEmailVerified()).isTrue();
        org.assertj.core.api.Assertions.assertThat(parsed.getPayload().getExpirationTimeSeconds())
                .isGreaterThan(Instant.now().getEpochSecond());

        mvc.perform(post("/api/auth/google").with(SecurityMockMvcRequestPostProcessors.csrf()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("first@example.com"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.google_sub").doesNotExist());

        User created = users.findByGoogleSub("sub-first").orElseThrow();
        org.assertj.core.api.Assertions.assertThat(created.getPasswordHash()).isNotBlank();
        org.assertj.core.api.Assertions.assertThat(encoder.matches("not-the-password", created.getPasswordHash()))
                .isFalse();

        var result = mvc.perform(post("/api/auth/google").with(SecurityMockMvcRequestPostProcessors.csrf()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(token)))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession();
        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(created.getId()));
        org.assertj.core.api.Assertions.assertThat(users.findAll().stream()
                .filter(user -> "sub-first".equals(user.getGoogleSub()))
                .count()).isEqualTo(1);
    }

    @Test
    void rejectsTamperingAudienceIssuerExpiryAndUnverifiedEmail() throws Exception {
        assertUnauthorized(token("bad-signature", "bad@example.com", "Bad", true,
                "accounts.google.com", Instant.now().plusSeconds(300), "test-client") + "x");
        assertUnauthorized(token("wrong-audience", "aud@example.com", "Bad", true,
                "accounts.google.com", Instant.now().plusSeconds(300), "other-client"));
        assertUnauthorized(token("wrong-issuer", "issuer@example.com", "Bad", true,
                "https://accounts.google.com.evil", Instant.now().plusSeconds(300), "test-client"));
        assertUnauthorized(token("expired", "expired@example.com", "Bad", true,
                "accounts.google.com", Instant.now().minusSeconds(600), "test-client"));
        assertUnauthorized(token("unverified", "unverified@example.com", "Bad", false,
                "accounts.google.com", Instant.now().plusSeconds(300), "test-client"));
        assertUnauthorized(token(null, "missing-sub@example.com", "Bad", true,
                "accounts.google.com", Instant.now().plusSeconds(300), "test-client"));
        assertUnauthorized(token("missing-email", null, "Bad", true,
                "accounts.google.com", Instant.now().plusSeconds(300), "test-client"));
    }

    @Test
    void acceptsBothDocumentedGoogleIssuerForms() throws Exception {
        for (String issuer : List.of("accounts.google.com", "https://accounts.google.com")) {
            mvc.perform(post("/api/auth/google").with(SecurityMockMvcRequestPostProcessors.csrf()).with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(token("issuer-" + issuer, issuer + "@example.com", "Issuer", true,
                                    issuer, Instant.now().plusSeconds(300), "test-client"))))
                    .andExpect(status().isOk());
        }
        org.assertj.core.api.Assertions.assertThat(users.findAll().stream()
                .filter(user -> user.getGoogleSub() != null
                        && (user.getGoogleSub().equals("issuer-accounts.google.com")
                        || user.getGoogleSub().equals("issuer-https://accounts.google.com")))
                .count()).isEqualTo(2);
    }

    @Test
    void rejectsMissingCsrfAndExistingEmailCollisionWithoutMutation() throws Exception {
        mvc.perform(post("/api/auth/google").with(SecurityMockMvcRequestPostProcessors.csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(token("csrf", "csrf@example.com", "CSRF", true,
                                "accounts.google.com", Instant.now().plusSeconds(300), "test-client"))))
                .andExpect(status().isForbidden());

        User existing = users.save(new User("collision@example.com", "Existing",
                encoder.encode("existing-password"), GlobalRole.USER));
        assertUnauthorized(token("new-sub", "collision@example.com", "Changed", true,
                "accounts.google.com", Instant.now().plusSeconds(300), "test-client"));
        User unchanged = users.findById(existing.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(unchanged.getDisplayName()).isEqualTo("Existing");
        org.assertj.core.api.Assertions.assertThat(unchanged.getGoogleSub()).isNull();
    }

    private void assertUnauthorized(String token) throws Exception {
        mvc.perform(post("/api/auth/google").with(SecurityMockMvcRequestPostProcessors.csrf()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(token)))
        .andExpect(status().isUnauthorized());
    }

    private static String json(String token) {
        return "{\"credential\":\"" + token + "\"}";
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor csrf() {
        return request -> {
            CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            request.addHeader("X-XSRF-TOKEN", token.getToken());
            request.setCookies(new Cookie("XSRF-TOKEN", token.getToken()));
            return request;
        };
    }

    private static String token(String sub, String email, String name, boolean verified,
                                String issuer, Instant expiry, String audience) throws Exception {
        JsonWebSignature.Header header = new JsonWebSignature.Header()
                .setAlgorithm("RS256").setKeyId("test-key").setType("JWT");
        JsonWebToken.Payload payload = new JsonWebToken.Payload()
                .setIssuer(issuer).setAudience(audience).setSubject(sub)
                .setIssuedAtTimeSeconds(Instant.now().getEpochSecond())
                .setExpirationTimeSeconds(expiry.getEpochSecond())
                .set("email", email).set("email_verified", verified).set("name", name);
        return JsonWebSignature.signUsingRsaSha256(privateKey(), GsonFactory.getDefaultInstance(), header, payload);
    }

    private static PrivateKey privateKey() throws Exception {
        String pem = Files.readString(Path.of("src/test/resources/google/test-key.pem"));
        String encoded = pem.replaceAll("-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\\s", "");
        return KeyFactory.getInstance("RSA").generatePrivate(
                new PKCS8EncodedKeySpec(Base64.getDecoder().decode(encoded)));
    }

    @TestConfiguration
    static class LocalVerifierConfiguration {
        @Bean
        @Primary
        GoogleIdTokenVerifier localGoogleVerifier() throws IOException {
            String certificate = Files.readString(Path.of("src/test/resources/google/test-cert.pem"));
            String escapedCertificate = certificate.replace("\\", "\\\\")
                    .replace("\"", "\\\"").replace("\r", "\\r").replace("\n", "\\n");
            String json = "{\"test-key\":\"" + escapedCertificate + "\"}";
            MockLowLevelHttpResponse response = new MockLowLevelHttpResponse()
                    .setStatusCode(200).setContentType("application/json")
                    .addHeader("Cache-Control", "public, max-age=3600").setContent(json);
            MockLowLevelHttpRequest request = new MockLowLevelHttpRequest().setResponse(response);
            MockHttpTransport transport = new MockHttpTransport.Builder()
                    .setLowLevelHttpRequest(request).build();
            return new GoogleIdTokenVerifier.Builder(transport, GsonFactory.getDefaultInstance())
                    .setPublicCertsEncodedUrl("https://local.test/certs")
                    .setIssuers(List.of("accounts.google.com", "https://accounts.google.com"))
                    .setAudience(List.of("test-client")).build();
        }
    }
}
