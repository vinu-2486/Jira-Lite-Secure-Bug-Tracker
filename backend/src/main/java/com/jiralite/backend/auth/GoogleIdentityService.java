package com.jiralite.backend.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.jiralite.backend.security.AppUserDetails;
import com.jiralite.backend.user.GlobalRole;
import com.jiralite.backend.user.User;
import com.jiralite.backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Objects;

@Service
public class GoogleIdentityService {
    private static final int MAX_DISPLAY_NAME_LENGTH = 100;
    private final GoogleIdTokenVerifier verifier;
    private final UserRepository users;
    private final GoogleUserProvisioningService provisioning;
    private final String clientId;

    public GoogleIdentityService(GoogleIdTokenVerifier verifier, UserRepository users,
                                 GoogleUserProvisioningService provisioning,
                                 @Value("${JIRALITE_GOOGLE_CLIENT_ID:}") String clientId) {
        this.verifier = verifier;
        this.users = users;
        this.provisioning = provisioning;
        this.clientId = clientId == null ? "" : clientId.trim();
    }

    public boolean isEnabled() {
        return !clientId.isBlank();
    }

    public AppUserDetails resolve(String credential) {
        if (clientId.isBlank()) {
            throw new GoogleCredentialException();
        }
        GoogleIdToken.Payload payload = verify(credential);
        String googleSub = nonBlank(payload.getSubject());
        String email = nonBlank(payload.getEmail());
        if (googleSub == null || email == null || email.indexOf('@') <= 0
                || !Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new GoogleCredentialException();
        }

        User user = users.findByGoogleSub(googleSub).orElse(null);
        if (user == null) {
            String normalizedEmail = email.trim().toLowerCase();
            if (users.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
                throw new GoogleCredentialException();
            }
            try {
                user = provisioning.createUser(googleSub, normalizedEmail, displayName(payload, normalizedEmail));
            } catch (DataIntegrityViolationException conflict) {
                user = users.findByGoogleSub(googleSub).orElseThrow(GoogleCredentialException::new);
            }
        }
        AppUserDetails details = new AppUserDetails(user);
        if (!details.isEnabled() || !details.isAccountNonLocked()) {
            throw new GoogleCredentialException();
        }
        return details;
    }

    private GoogleIdToken.Payload verify(String credential) {
        try {
            GoogleIdToken token = verifier.verify(credential);
            if (token == null) {
                throw new GoogleCredentialException();
            }
            return token.getPayload();
        } catch (IOException | java.security.GeneralSecurityException | IllegalArgumentException ex) {
            throw new GoogleCredentialException();
        }
    }

    private String displayName(GoogleIdToken.Payload payload, String email) {
        String candidate = Objects.toString(payload.get("name"), "").trim();
        if (candidate.isBlank()) {
            candidate = email.substring(0, email.indexOf('@'));
        }
        int end = candidate.offsetByCodePoints(0,
                Math.min(candidate.codePointCount(0, candidate.length()), MAX_DISPLAY_NAME_LENGTH));
        return candidate.substring(0, end);
    }

    private String nonBlank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
