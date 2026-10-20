package com.jiralite.backend.auth;

import com.jiralite.backend.security.AppUserDetails;
import com.jiralite.backend.user.User;

public record MeResponse(Long id, String email, String displayName, String role) {
    public static MeResponse from(AppUserDetails u) {
        return new MeResponse(u.getId(), u.getUsername(), u.getDisplayName(), u.getRole().name());
    }

    public static MeResponse from(User u) {
        return new MeResponse(u.getId(), u.getEmail(), u.getDisplayName(), u.getRole().name());
    }
}