package com.jiralite.backend.security;

import com.jiralite.backend.user.User;
import com.jiralite.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class LoginAttemptServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final LoginAttemptService service = new LoginAttemptService(users);

    @Test
    void fifthFailureLocksTheAccountForFifteenMinutesAndResetsCounter() {
        User user = mock(User.class);
        when(user.getFailedAttempts()).thenReturn(4);
        when(users.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));

        service.onFailure("user@example.com");

        verify(user).setFailedAttempts(0);
        ArgumentCaptor<Instant> lockedUntil = ArgumentCaptor.forClass(Instant.class);
        verify(user).setLockedUntil(lockedUntil.capture());
        assertThat(lockedUntil.getValue())
                .isBetween(Instant.now().plusSeconds(14 * 60), Instant.now().plusSeconds(16 * 60));
    }

    @Test
    void successfulLoginClearsFailuresAndLock() {
        User user = mock(User.class);
        when(users.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));

        service.onSuccess("user@example.com");

        verify(user).setFailedAttempts(0);
        verify(user).setLockedUntil(null);
    }
}
