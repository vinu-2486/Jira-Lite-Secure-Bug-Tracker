package com.jiralite.backend.user;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "google_sub", unique = true, length = 255)
    private String googleSub;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GlobalRole role;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts = 0;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    protected User() {}  // JPA

    public User(String email, String displayName, String passwordHash, GlobalRole role) {
        this.email = email;
        this.displayName = displayName;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public String getPasswordHash() { return passwordHash; }
    public String getGoogleSub() { return googleSub; }
    public GlobalRole getRole() { return role; }
    public boolean isEnabled() { return enabled; }
    public int getFailedAttempts() { return failedAttempts; }
    public Instant getLockedUntil() { return lockedUntil; }

    public void setFailedAttempts(int v) { this.failedAttempts = v; }
    public void setLockedUntil(Instant v) { this.lockedUntil = v; }
    public void setRole(GlobalRole role) { this.role = role; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public void setGoogleSub(String googleSub) { this.googleSub = googleSub; }
}