package com.jiralite.backend.auth;

import jakarta.validation.constraints.*;

public record LoginRequest(
    @NotBlank @Size(max = 254) String email,
    @NotBlank @Size(max = 72) String password   // bcrypt only uses first 72 bytes
) {}