package com.jiralite.backend.bug;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BugCommentRepository extends JpaRepository<BugComment, Long> {
    List<BugComment> findAllByBugIdOrderByCreatedAtAsc(Long bugId);
}
