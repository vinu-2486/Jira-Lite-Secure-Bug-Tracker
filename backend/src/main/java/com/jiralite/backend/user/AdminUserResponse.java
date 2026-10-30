package com.jiralite.backend.user;

public record AdminUserResponse(Long id, String email, String displayName, String role, boolean enabled) {
    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(user.getId(), user.getEmail(), user.getDisplayName(),
                user.getRole().name(), user.isEnabled());
    }
}
