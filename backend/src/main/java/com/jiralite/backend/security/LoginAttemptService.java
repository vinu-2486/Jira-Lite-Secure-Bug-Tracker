package com.jiralite.backend.security;

import com.jiralite.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Service
public class LoginAttemptService {

    private static final int MAX_FAILURES = 5;
    private static final Duration LOCK_TIME = Duration.ofMinutes(15);

    private final UserRepository users;

    public LoginAttemptService(UserRepository users) { this.users = users; }

    @Transactional
    public void onFailure(String email) {
        users.findByEmailIgnoreCase(email).ifPresent(u -> {
            int n = u.getFailedAttempts() + 1;
            if (n >= MAX_FAILURES) {
                u.setLockedUntil(Instant.now().plus(LOCK_TIME));
                n = 0;
            }
            u.setFailedAttempts(n);
        });
    }

    @Transactional
    public void onSuccess(String email) {
        users.findByEmailIgnoreCase(email).ifPresent(u -> {
            u.setFailedAttempts(0);
            u.setLockedUntil(null);
        });
    }
}