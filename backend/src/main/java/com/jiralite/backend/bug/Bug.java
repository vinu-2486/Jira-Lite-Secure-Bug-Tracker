package com.jiralite.backend.bug;

import com.jiralite.backend.project.Project;
import com.jiralite.backend.user.User;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "bugs")
public class Bug {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bug_key", nullable = false, unique = true, length = 50)
    private String bugKey;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 5000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BugPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BugSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BugStatus status = BugStatus.OPEN;

    @Column(length = 500)
    private String resolution;

    @Version
    @Column(nullable = false)
    private Long version = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Bug() {
        // Required by JPA
    }

    public Bug(
            Project project,
            User reporter,
            String title,
            String description,
            BugPriority priority,
            BugSeverity severity
    ) {
        this.project = project;
        this.reporter = reporter;
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.severity = severity;
        this.status = BugStatus.OPEN;
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getBugKey() {
        return bugKey;
    }

    public void setBugKey(String bugKey) {
        this.bugKey = bugKey;
    }

    public Project getProject() {
        return project;
    }

    public User getReporter() {
        return reporter;
    }

    public User getAssignee() {
        return assignee;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public BugPriority getPriority() {
        return priority;
    }

    public BugSeverity getSeverity() {
        return severity;
    }

    public BugStatus getStatus() {
        return status;
    }

    public String getResolution() {
        return resolution;
    }

    public Long getVersion() {
        return version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setPriority(BugPriority priority) { this.priority = priority; }
    public void setSeverity(BugSeverity severity) { this.severity = severity; }
    public void setAssignee(User assignee) { this.assignee = assignee; }
    public void setStatus(BugStatus status) { this.status = status; }
    public void setResolution(String resolution) { this.resolution = resolution; }
}