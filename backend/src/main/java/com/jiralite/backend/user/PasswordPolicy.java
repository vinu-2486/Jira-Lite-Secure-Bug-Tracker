package com.jiralite.backend.user;

public final class PasswordPolicy {
    private PasswordPolicy() {}

    public static void validate(String pw) {
        if (pw == null || pw.length() < 12) throw new IllegalArgumentException("Password must be at least 12 characters");
        if (pw.length() > 72) throw new IllegalArgumentException("Password too long (max 72)");
        // TODO: reject common passwords with a small deny-list
    }
}