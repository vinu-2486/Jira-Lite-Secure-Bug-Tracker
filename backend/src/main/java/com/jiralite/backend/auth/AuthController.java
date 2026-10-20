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

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final LoginAttemptService attempts;
    private final SecurityContextRepository contextRepo = new HttpSessionSecurityContextRepository();
    private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

    public AuthController(AuthenticationManager authManager, LoginAttemptService attempts) {
        this.authManager = authManager;
        this.attempts = attempts;
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

            req.getSession(true);
            req.changeSessionId();                       // new session ID on login (fixation protection)

            SecurityContext ctx = holder.createEmptyContext();
            ctx.setAuthentication(auth);
            holder.setContext(ctx);
            contextRepo.saveContext(ctx, req, res);      // required in Spring Security 6+

            return MeResponse.from((AppUserDetails) auth.getPrincipal());

        } catch (BadCredentialsException e) {
            attempts.onFailure(email);
            throw invalid();
        } catch (AuthenticationException e) {            // locked, disabled, etc. -> same message
            throw invalid();
        }
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal AppUserDetails user) {
        return MeResponse.from(user);
    }

    private ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
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