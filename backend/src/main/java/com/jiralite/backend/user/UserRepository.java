package com.jiralite.backend.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByGoogleSub(String googleSub);
    boolean existsByRole(GlobalRole role);
    long countByRoleAndEnabledTrue(GlobalRole role);
}