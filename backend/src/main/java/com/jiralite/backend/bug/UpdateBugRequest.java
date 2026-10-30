package com.jiralite.backend.bug;

import jakarta.validation.constraints.*;

public record UpdateBugRequest(
        @NotBlank @Size(min = 5, max = 120) String title,
        @NotBlank @Size(max = 5000) String description,
        @NotNull BugPriority priority,
        @NotNull BugSeverity severity,
        @NotNull Long version
) {}
