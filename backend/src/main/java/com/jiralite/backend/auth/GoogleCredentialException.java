package com.jiralite.backend.auth;

public class GoogleCredentialException extends RuntimeException {
    public GoogleCredentialException() {
        super("Invalid Google credential");
    }
}
