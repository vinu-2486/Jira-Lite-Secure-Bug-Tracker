package com.jiralite.backend.bug;

import com.jiralite.backend.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "bug_comments")
public class BugComment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "bug_id")
    private Bug bug;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "author_id")
    private User author;
    @Column(nullable = false, length = 5000) private String body;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    protected BugComment() {}
    public BugComment(Bug bug, User author, String body) {
        this.bug = bug; this.author = author; this.body = body;
    }
    @PrePersist void onCreate() { createdAt = Instant.now(); }
    public Long getId() { return id; }
    public User getAuthor() { return author; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }
}
