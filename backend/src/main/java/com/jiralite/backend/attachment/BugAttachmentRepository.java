package com.jiralite.backend.attachment;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BugAttachmentRepository extends JpaRepository<BugAttachment, Long> {
    Optional<BugAttachment> findByIdAndBugKey(Long id, String bugKey);
}
