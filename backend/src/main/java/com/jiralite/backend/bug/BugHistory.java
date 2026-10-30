package com.jiralite.backend.bug;

import com.jiralite.backend.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "bug_history")
public class BugHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "bug_id")
    private Bug bug;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "actor_id")
    private User actor;
    @Column(name = "event_type", nullable = false, length = 30) private String eventType;
    @Column(name = "old_value", length = 5000) private String oldValue;
    @Column(name = "new_value", length = 5000) private String newValue;
    @Column(length = 5000) private String reason;
    @Column(name = "external_author", length = 254) private String externalAuthor;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    protected BugHistory() {}
    public BugHistory(Bug bug, User actor, String eventType, String oldValue, String newValue, String reason) {
        this.bug = bug; this.actor = actor; this.eventType = eventType;
        this.oldValue = oldValue; this.newValue = newValue; this.reason = reason;
    }
    public BugHistory(Bug bug, String eventType, String newValue, String externalAuthor) {
        this.bug = bug; this.eventType = eventType; this.newValue = newValue; this.externalAuthor = externalAuthor;
    }
    @PrePersist void onCreate() { createdAt = Instant.now(); }
    public Long getId() { return id; }
    public User getActor() { return actor; }
    public String getEventType() { return eventType; }
    public String getOldValue() { return oldValue; }
    public String getNewValue() { return newValue; }
    public String getReason() { return reason; }
    public Instant getCreatedAt() { return createdAt; }
    public String getExternalAuthor() { return externalAuthor; }
}
