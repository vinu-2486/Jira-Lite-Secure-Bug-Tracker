package com.jiralite.backend.auth;

import com.jiralite.backend.security.AppUserDetails;
import com.jiralite.backend.security.LoginAttemptService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.*;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authManager;
    private final LoginAttemptService attempts;
    private final SecurityContextRepository contextRepo = new HttpSessionSecurityContextRepository();
    private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();
    private final GoogleIdentityService googleIdentity;

    public AuthController(AuthenticationManager authManager, LoginAttemptService attempts,
                          GoogleIdentityService googleIdentity) {
        this.authManager = authManager;
        this.attempts = attempts;
        this.googleIdentity = googleIdentity;
    }

    @PostMapping("/login")
    public MeResponse login(@Valid @RequestBody LoginRequest body,
                            HttpServletRequest req, HttpServletResponse res) {
        requireCsrfHeader(req);
        String email = body.email().trim().toLowerCase();
        try {
            Authentication auth = authManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, body.password()));

            attempts.onSuccess(email);
            log.info("security_event actor={} action=LOGIN outcome=SUCCESS", safe(email));

            return establishSession(auth, req, res);

        } catch (BadCredentialsException e) {
            attempts.onFailure(email);
            log.info("security_event actor={} action=LOGIN outcome=FAILURE", safe(email));
            throw invalidLogin();
        } catch (AuthenticationException e) {            // locked, disabled, etc. -> same message
            log.info("security_event actor={} action=LOGIN outcome=FAILURE", safe(email));
            throw invalidLogin();
        }
    }

    @PostMapping("/google")
    public MeResponse google(@Valid @RequestBody GoogleLoginRequest body,
                             HttpServletRequest req, HttpServletResponse res) {
        if (!googleIdentity.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        requireCsrfHeader(req);
        try {
            AppUserDetails user = googleIdentity.resolve(body.credential());
            log.info("security_event actor={} action=GOOGLE_LOGIN outcome=SUCCESS", user.getId());
            return establishSession(new UsernamePasswordAuthenticationToken(user, user.getPassword(),
                    user.getAuthorities()), req, res);
        } catch (GoogleCredentialException ex) {
            log.info("security_event actor=anonymous action=GOOGLE_LOGIN outcome=FAILURE");
            throw invalidGoogle();
        }
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal AppUserDetails user) {
        return MeResponse.from(user);
    }

    private ResponseStatusException invalidLogin() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    private ResponseStatusException invalidGoogle() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google credential");
    }

    private String safe(String value) {
        String cleaned = value.replaceAll("[\\p{Cntrl}]", "");
        return cleaned.substring(0, Math.min(cleaned.length(), 100));
    }

    private MeResponse establishSession(Authentication auth, HttpServletRequest req, HttpServletResponse res) {
        req.getSession(true);
        req.changeSessionId();
        SecurityContext ctx = holder.createEmptyContext();
        ctx.setAuthentication(auth);
        holder.setContext(ctx);
        contextRepo.saveContext(ctx, req, res);
        return MeResponse.from((AppUserDetails) auth.getPrincipal());
    }

    private void requireCsrfHeader(HttpServletRequest request) {
        String header = request.getHeader("X-XSRF-TOKEN");
        String cookie = java.util.Arrays.stream(
                        request.getCookies() == null ? new jakarta.servlet.http.Cookie[0] : request.getCookies())
                .filter(c -> "XSRF-TOKEN".equals(c.getName()))
                .map(jakarta.servlet.http.Cookie::getValue)
                .findFirst()
                .orElse(null);
        if (header == null || cookie == null || !java.security.MessageDigest.isEqual(
                header.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                cookie.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "CSRF token is missing or invalid");
        }
    }
}