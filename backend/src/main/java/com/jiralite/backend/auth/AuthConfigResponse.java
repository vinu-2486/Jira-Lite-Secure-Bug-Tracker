package com.jiralite.backend.auth;

public record AuthConfigResponse(boolean googleEnabled, String googleClientId) {
}
