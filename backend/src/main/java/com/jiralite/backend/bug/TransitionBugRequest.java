package com.jiralite.backend.bug;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TransitionBugRequest(
        @NotNull BugStatus status,
        @Size(max = 5000) String reason,
        @NotNull Long version
) {}
