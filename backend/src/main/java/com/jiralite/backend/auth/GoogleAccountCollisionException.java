package com.jiralite.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class GoogleAccountCollisionException extends ResponseStatusException {
    public static final String DEFAULT_MESSAGE =
            "An account with this email already exists. Sign in with your password to link your Google account or use account recovery.";

    public GoogleAccountCollisionException() {
        this(DEFAULT_MESSAGE);
    }

    public GoogleAccountCollisionException(String message) {
        super(HttpStatus.UNAUTHORIZED, message);
    }
}
