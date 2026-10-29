package com.jiralite.backend.bug;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateBugRequest(

        @NotBlank(message = "Title is required")
        @Size(min = 5, max = 120, message = "Title must be between 5 and 120 characters")
        String title,

        @NotBlank(message = "Description is required")
        @Size(max = 5000, message = "Description must not exceed 5000 characters")
        String description,

        @NotNull(message = "Priority is required")
        BugPriority priority,

        @NotNull(message = "Severity is required")
        BugSeverity severity

) {}