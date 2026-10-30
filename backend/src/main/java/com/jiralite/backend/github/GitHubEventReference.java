package com.jiralite.backend.github;

import com.jiralite.backend.bug.Bug;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "github_event_references")
public class GitHubEventReference {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "delivery_id") private GitHubWebhookDelivery delivery;
    @Column(name = "reference_key", nullable = false, length = 100) private String referenceKey;
    @Column(name = "external_type", nullable = false, length = 20) private String externalType;
    @Column(name = "external_id", nullable = false, length = 200) private String externalId;
    @Column(name = "repository_id", nullable = false) private Long repositoryId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "bug_id") private Bug bug;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    protected GitHubEventReference() {}
    public GitHubEventReference(GitHubWebhookDelivery delivery, String referenceKey, String externalType,
                                String externalId, Long repositoryId, Bug bug) {
        this.delivery = delivery; this.referenceKey = referenceKey; this.externalType = externalType;
        this.externalId = externalId; this.repositoryId = repositoryId; this.bug = bug;
    }
    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
