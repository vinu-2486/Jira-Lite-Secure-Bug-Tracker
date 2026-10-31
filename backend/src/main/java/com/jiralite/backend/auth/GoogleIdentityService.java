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
                                 @Value("${GOOGLE_CLIENT_ID:${JIRALITE_GOOGLE_CLIENT_ID:}}") String clientId) {
        this.verifier = verifier;
        this.users = users;
        this.provisioning = provisioning;
        this.clientId = clientId == null ? "" : clientId.trim();
    }

    public boolean isEnabled() {
        return !clientId.isBlank();
    }

    public String getClientId() {
        return clientId;
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

        String normalizedEmail = email.trim().toLowerCase();
        User user = users.findByGoogleSub(googleSub).orElse(null);
        if (user != null) {
            if (!user.getEmail().equalsIgnoreCase(normalizedEmail)
                    && users.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
                throw new GoogleAccountCollisionException();
            }
        } else {
            if (users.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
                throw new GoogleAccountCollisionException();
            }
            try {
                user = provisioning.createUser(googleSub, normalizedEmail, displayName(payload, normalizedEmail));
            } catch (DataIntegrityViolationException conflict) {
                user = users.findByGoogleSub(googleSub).orElse(null);
                if (user == null) {
                    if (users.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
                        throw new GoogleAccountCollisionException();
                    }
                    throw new GoogleCredentialException();
                }
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
