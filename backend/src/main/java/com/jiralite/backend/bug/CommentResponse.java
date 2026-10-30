package com.jiralite.backend.bug;

import java.time.Instant;

public record CommentResponse(Long id, Long authorId, String body, Instant createdAt) {
    static CommentResponse from(BugComment comment) {
        return new CommentResponse(comment.getId(), comment.getAuthor().getId(),
                comment.getBody(), comment.getCreatedAt());
    }
}
