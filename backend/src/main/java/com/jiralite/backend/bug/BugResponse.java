package com.jiralite.backend.bug;

import java.time.Instant;

public record BugResponse(
        Long id,
        String key,
        Long projectId,
        String title,
        String description,
        BugPriority priority,
        BugSeverity severity,
        BugStatus status,
        Long reporterId,
        Long assigneeId,
        String resolution,
        Long version,
        Instant createdAt,
        Instant updatedAt
) {
    public static BugResponse from(Bug bug) {
        return new BugResponse(
                bug.getId(),
                bug.getBugKey(),
                bug.getProject().getId(),
                bug.getTitle(),
                bug.getDescription(),
                bug.getPriority(),
                bug.getSeverity(),
                bug.getStatus(),
                bug.getReporter().getId(),
                bug.getAssignee() == null ? null : bug.getAssignee().getId(),
                bug.getResolution(),
                bug.getVersion(),
                bug.getCreatedAt(),
                bug.getUpdatedAt()
        );
    }
}