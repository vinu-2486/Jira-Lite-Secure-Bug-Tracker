package com.jiralite.backend.bug;

import java.time.Instant;

public record HistoryResponse(
        Long id, Long actorId, String eventType, String oldValue, String newValue,
        String reason, String externalAuthor, Instant createdAt
) {
    static HistoryResponse from(BugHistory event) {
        return new HistoryResponse(event.getId(), event.getActor() == null ? null : event.getActor().getId(),
                event.getEventType(), event.getOldValue(), event.getNewValue(), event.getReason(),
                event.getExternalAuthor(), event.getCreatedAt());
    }
}
