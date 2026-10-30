package com.jiralite.backend.project;

import com.jiralite.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, ProjectMemberId> {
    Optional<ProjectMember> findByProjectIdAndUserId(Long projectId, Long userId);
    boolean existsByProjectIdAndUserId(Long projectId, Long userId);
    List<ProjectMember> findAllByUserId(Long userId);
    List<ProjectMember> findAllByProjectIdOrderByUserIdAsc(Long projectId);
}
