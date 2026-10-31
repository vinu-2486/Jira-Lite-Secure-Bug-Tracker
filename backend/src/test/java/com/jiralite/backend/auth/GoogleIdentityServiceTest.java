package com.jiralite.backend.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.json.webtoken.JsonWebSignature;
import com.jiralite.backend.security.AppUserDetails;
import com.jiralite.backend.user.GlobalRole;
import com.jiralite.backend.user.User;
import com.jiralite.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class GoogleIdentityServiceTest {
    @Test
    void recoversFromFirstSignInRaceOnlyForTheWinningGoogleIdentity() throws Exception {
        GoogleIdTokenVerifier verifier = mock(GoogleIdTokenVerifier.class);
        UserRepository users = mock(UserRepository.class);
        GoogleUserProvisioningService provisioning = mock(GoogleUserProvisioningService.class);
        User winner = new User("winner@example.com", "Winner",
                "{bcrypt}$2a$10$abcdefghijklmnopqrstuu", GlobalRole.USER);
        winner.setGoogleSub("race-sub");
        when(verifier.verify("credential")).thenReturn(token("race-sub", "winner@example.com"));
        when(users.findByGoogleSub("race-sub")).thenReturn(Optional.empty(), Optional.of(winner));
        when(users.findByEmailIgnoreCase("winner@example.com")).thenReturn(Optional.empty());
        when(provisioning.createUser(anyString(), anyString(), anyString()))
                .thenThrow(new DataIntegrityViolationException("duplicate"));

        GoogleIdentityService service = new GoogleIdentityService(verifier, users, provisioning, "client");

        AppUserDetails result = service.resolve("credential");

        assertThat(result.getUsername()).isEqualTo("winner@example.com");
    }

    @Test
    void disabledGoogleEndpointReturnsNotFoundBeforeCsrfOrVerification() {
        GoogleIdentityService identity = mock(GoogleIdentityService.class);
        when(identity.isEnabled()).thenReturn(false);
        AuthController controller = new AuthController(mock(AuthenticationManager.class),
                mock(com.jiralite.backend.security.LoginAttemptService.class), identity);

        assertThatThrownBy(() -> controller.google(new GoogleLoginRequest("credential"),
                new MockHttpServletRequest(), new MockHttpServletResponse()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode")
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
    }

    @Test
    void rejectsCollisionWithExistingUserAccountWithoutAutoLinking() throws Exception {
        GoogleIdTokenVerifier verifier = mock(GoogleIdTokenVerifier.class);
        UserRepository users = mock(UserRepository.class);
        GoogleUserProvisioningService provisioning = mock(GoogleUserProvisioningService.class);
        User existing = new User("existing@example.com", "Existing",
                "{bcrypt}$2a$10$abcdefghijklmnopqrstuu", GlobalRole.USER);
        assertThat(existing.getGoogleSub()).isNull();

        when(verifier.verify("credential")).thenReturn(token("sub-123", "existing@example.com"));
        when(users.findByGoogleSub("sub-123")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("existing@example.com")).thenReturn(Optional.of(existing));

        GoogleIdentityService service = new GoogleIdentityService(verifier, users, provisioning, "client");

        assertThatThrownBy(() -> service.resolve("credential"))
                .isInstanceOf(GoogleAccountCollisionException.class)
                .hasMessageContaining("An account with this email already exists")
                .hasMessageContaining("Sign in with your password to link your Google account or use account recovery.");

        assertThat(existing.getGoogleSub()).isNull();
        verify(users, never()).saveAndFlush(any());
        verify(users, never()).save(any());
        verifyNoInteractions(provisioning);
    }

    @Test
    void rejectsCollisionWithAdminAccountAndDoesNotLinkOrElevate() throws Exception {
        GoogleIdTokenVerifier verifier = mock(GoogleIdTokenVerifier.class);
        UserRepository users = mock(UserRepository.class);
        GoogleUserProvisioningService provisioning = mock(GoogleUserProvisioningService.class);
        User admin = new User("admin@example.com", "Admin User",
                "{bcrypt}$2a$10$abcdefghijklmnopqrstuu", GlobalRole.APP_ADMIN);
        assertThat(admin.getGoogleSub()).isNull();

        when(verifier.verify("credential")).thenReturn(token("sub-admin", "admin@example.com"));
        when(users.findByGoogleSub("sub-admin")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("admin@example.com")).thenReturn(Optional.of(admin));

        GoogleIdentityService service = new GoogleIdentityService(verifier, users, provisioning, "client");

        assertThatThrownBy(() -> service.resolve("credential"))
                .isInstanceOf(GoogleAccountCollisionException.class)
                .hasMessageContaining("An account with this email already exists")
                .hasMessageContaining("Sign in with your password to link your Google account or use account recovery.");

        assertThat(admin.getGoogleSub()).isNull();
        assertThat(admin.getRole()).isEqualTo(GlobalRole.APP_ADMIN);
        verify(users, never()).saveAndFlush(any());
        verify(users, never()).save(any());
        verifyNoInteractions(provisioning);
    }

    @Test
    void provisionsNewAccountWhenEmailAndSubNotFound() throws Exception {
        GoogleIdTokenVerifier verifier = mock(GoogleIdTokenVerifier.class);
        UserRepository users = mock(UserRepository.class);
        GoogleUserProvisioningService provisioning = mock(GoogleUserProvisioningService.class);
        User created = new User("newuser@example.com", "New User",
                "{bcrypt}$2a$10$abcdefghijklmnopqrstuu", GlobalRole.USER);
        created.setGoogleSub("new-sub");

        when(verifier.verify("credential")).thenReturn(token("new-sub", "newuser@example.com"));
        when(users.findByGoogleSub("new-sub")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("newuser@example.com")).thenReturn(Optional.empty());
        when(provisioning.createUser("new-sub", "newuser@example.com", "New User")).thenReturn(created);

        GoogleIdentityService service = new GoogleIdentityService(verifier, users, provisioning, "client");
        AppUserDetails result = service.resolve("credential");

        assertThat(result.getUsername()).isEqualTo("newuser@example.com");
        verify(provisioning).createUser("new-sub", "newuser@example.com", "New User");
    }

    @Test
    void rejectsWhenEmailNotVerified() throws Exception {
        GoogleIdTokenVerifier verifier = mock(GoogleIdTokenVerifier.class);
        UserRepository users = mock(UserRepository.class);
        GoogleUserProvisioningService provisioning = mock(GoogleUserProvisioningService.class);

        GoogleIdToken unverifiedToken = token("sub-unverified", "unverified@example.com");
        unverifiedToken.getPayload().setEmailVerified(false);
        when(verifier.verify("credential")).thenReturn(unverifiedToken);

        GoogleIdentityService service = new GoogleIdentityService(verifier, users, provisioning, "client");

        assertThatThrownBy(() -> service.resolve("credential"))
                .isInstanceOf(GoogleCredentialException.class);
        verifyNoInteractions(users);
        verifyNoInteractions(provisioning);
    }

    @Test
    void rejectsWhenTokenVerifierReturnsNull() throws Exception {
        GoogleIdTokenVerifier verifier = mock(GoogleIdTokenVerifier.class);
        UserRepository users = mock(UserRepository.class);
        GoogleUserProvisioningService provisioning = mock(GoogleUserProvisioningService.class);

        when(verifier.verify("invalid")).thenReturn(null);

        GoogleIdentityService service = new GoogleIdentityService(verifier, users, provisioning, "client");

        assertThatThrownBy(() -> service.resolve("invalid"))
                .isInstanceOf(GoogleCredentialException.class);
    }

    @Test
    void rejectsWhenSubMismatchOnExistingAccount() throws Exception {
        GoogleIdTokenVerifier verifier = mock(GoogleIdTokenVerifier.class);
        UserRepository users = mock(UserRepository.class);
        GoogleUserProvisioningService provisioning = mock(GoogleUserProvisioningService.class);
        User existing = new User("mismatch@example.com", "Mismatch",
                "{bcrypt}$2a$10$abcdefghijklmnopqrstuu", GlobalRole.USER);
        existing.setGoogleSub("other-sub");

        when(verifier.verify("credential")).thenReturn(token("new-sub", "mismatch@example.com"));
        when(users.findByGoogleSub("new-sub")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("mismatch@example.com")).thenReturn(Optional.of(existing));

        GoogleIdentityService service = new GoogleIdentityService(verifier, users, provisioning, "client");

        assertThatThrownBy(() -> service.resolve("credential"))
                .isInstanceOf(GoogleAccountCollisionException.class);
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void authConfigEndpointReturnsCleanStatus() {
        GoogleIdentityService identity = mock(GoogleIdentityService.class);
        when(identity.isEnabled()).thenReturn(true);
        when(identity.getClientId()).thenReturn("my-google-client-id");
        AuthController controller = new AuthController(mock(AuthenticationManager.class),
                mock(com.jiralite.backend.security.LoginAttemptService.class), identity);

        AuthConfigResponse response = controller.config();
        assertThat(response.googleEnabled()).isTrue();
        assertThat(response.googleClientId()).isEqualTo("my-google-client-id");
    }

    private static GoogleIdToken token(String sub, String email) {
        JsonWebSignature.Header header = new JsonWebSignature.Header().setAlgorithm("RS256");
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload()
                .setSubject(sub).setEmail(email).setEmailVerified(true);
        payload.set("name", "New User");
        payload.setIssuer("accounts.google.com");
        payload.setAudience("client");
        payload.setIssuedAtTimeSeconds(System.currentTimeMillis() / 1000);
        payload.setExpirationTimeSeconds(System.currentTimeMillis() / 1000 + 300);
        return new GoogleIdToken(header, payload, new byte[0], new byte[0]);
    }
}
