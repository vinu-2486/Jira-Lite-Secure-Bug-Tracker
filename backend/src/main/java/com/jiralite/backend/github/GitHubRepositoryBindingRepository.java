package com.jiralite.backend.github;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GitHubRepositoryBindingRepository extends JpaRepository<GitHubRepositoryBinding, Long> {
    Optional<GitHubRepositoryBinding> findByRepositoryId(Long repositoryId);
    Optional<GitHubRepositoryBinding> findByProjectId(Long projectId);
}
