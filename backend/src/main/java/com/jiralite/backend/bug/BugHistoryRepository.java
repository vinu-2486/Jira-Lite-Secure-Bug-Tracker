package com.jiralite.backend.bug;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BugHistoryRepository extends JpaRepository<BugHistory, Long> {
    List<BugHistory> findAllByBugIdOrderByCreatedAtAsc(Long bugId);
}
