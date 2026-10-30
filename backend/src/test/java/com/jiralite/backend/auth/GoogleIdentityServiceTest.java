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

    private static GoogleIdToken token(String sub, String email) {
        JsonWebSignature.Header header = new JsonWebSignature.Header().setAlgorithm("RS256");
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload()
                .setSubject(sub).setEmail(email).setEmailVerified(true);
        payload.setIssuer("accounts.google.com");
        payload.setAudience("client");
        payload.setIssuedAtTimeSeconds(System.currentTimeMillis() / 1000);
        payload.setExpirationTimeSeconds(System.currentTimeMillis() / 1000 + 300);
        return new GoogleIdToken(header, payload, new byte[0], new byte[0]);
    }
}
