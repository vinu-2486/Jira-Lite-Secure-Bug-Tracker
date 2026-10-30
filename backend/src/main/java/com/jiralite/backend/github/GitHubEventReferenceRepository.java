package com.jiralite.backend.github;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GitHubEventReferenceRepository extends JpaRepository<GitHubEventReference, Long> {
    boolean existsByRepositoryIdAndExternalTypeAndExternalIdAndBugId(
            Long repositoryId, String externalType, String externalId, Long bugId);
}
