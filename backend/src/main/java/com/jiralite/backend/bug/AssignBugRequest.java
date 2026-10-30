package com.jiralite.backend.bug;

import jakarta.validation.constraints.NotNull;

public record AssignBugRequest(@NotNull Long userId, @NotNull Long version) {}
