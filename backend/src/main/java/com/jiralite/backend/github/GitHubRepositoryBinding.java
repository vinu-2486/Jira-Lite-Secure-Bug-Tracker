package com.jiralite.backend.github;

import com.jiralite.backend.project.Project;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "github_repository_bindings")
public class GitHubRepositoryBinding {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false, unique = true)
    private Project project;
    @Column(name = "installation_id", nullable = false) private Long installationId;
    @Column(name = "repository_id", nullable = false, unique = true) private Long repositoryId;
    @Column(nullable = false, length = 100) private String owner;
    @Column(name = "repository_name", nullable = false, length = 100) private String repositoryName;
    @Column(name = "full_name", nullable = false, length = 201) private String fullName;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    protected GitHubRepositoryBinding() {}
    public GitHubRepositoryBinding(Project project, Long installationId, Long repositoryId,
                                   String owner, String repositoryName, String fullName) {
        this.project = project; this.installationId = installationId; this.repositoryId = repositoryId;
        this.owner = owner; this.repositoryName = repositoryName; this.fullName = fullName;
    }
    @PrePersist void onCreate() { createdAt = Instant.now(); }
    public Long getId() { return id; }
    public Project getProject() { return project; }
    public Long getInstallationId() { return installationId; }
    public Long getRepositoryId() { return repositoryId; }
    public String getOwner() { return owner; }
    public String getRepositoryName() { return repositoryName; }
    public String getFullName() { return fullName; }
}
