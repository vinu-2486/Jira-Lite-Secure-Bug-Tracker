package com.jiralite.backend.security;

import com.jiralite.backend.user.Role;
import com.jiralite.backend.user.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public class AppUserDetails implements UserDetails {

    private final Long id;
    private final String email;
    private final String displayName;
    private final String passwordHash;
    private final Role role;
    private final boolean enabled;
    private final boolean accountNonLocked;

    public AppUserDetails(User u) {
        this.id = u.getId();
        this.email = u.getEmail();
        this.displayName = u.getDisplayName();
        this.passwordHash = u.getPasswordHash();
        this.role = u.getRole();
        this.enabled = u.isEnabled();
        this.accountNonLocked = u.getLockedUntil() == null
                || u.getLockedUntil().isBefore(Instant.now());
    }

    public Long getId() { return id; }
    public String getDisplayName() { return displayName; }
    public Role getRole() { return role; }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
    @Override public String getPassword() { return passwordHash; }
    @Override public String getUsername() { return email; }
    @Override public boolean isEnabled() { return enabled; }
    @Override public boolean isAccountNonLocked() { return accountNonLocked; }
}