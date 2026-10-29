package com.jiralite.backend.bug;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BugRepository extends JpaRepository<Bug, Long> {

    Optional<Bug> findByBugKeyIgnoreCase(String bugKey);

    boolean existsByBugKey(String bugKey);
}