package com.jiralite.backend.bug;

import java.util.Set;

public record BugDetailResponse(BugResponse bug, Set<String> allowedActions) {}
