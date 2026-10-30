package com.jiralite.backend.github;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@RestController
@RequestMapping("/api/integrations/github")
public class GitHubWebhookController {
    private final GitHubWebhookDeliveryRepository deliveries;
    private final GitHubEventService events;
    private final String secret;

    public GitHubWebhookController(GitHubWebhookDeliveryRepository deliveries, GitHubEventService events,
                                   @Value("${JILA_GITHUB_WEBHOOK_SECRET:}") String secret) {
        this.deliveries = deliveries; this.events = events; this.secret = secret;
    }

    @PostMapping(value = "/webhook", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void webhook(@RequestHeader("X-GitHub-Event") String event,
                        @RequestHeader("X-GitHub-Delivery") String deliveryId,
                        @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
                        HttpServletRequest request) throws Exception {
        if (secret.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "GitHub tracking is not configured");
        byte[] body = request.getInputStream().readAllBytes();
        verify(body, signature);
        if (!event.equals("push") && !event.equals("pull_request")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported GitHub event");
        }
        var existing = deliveries.findByDeliveryId(deliveryId);
        if (existing.isPresent()) {
            events.processAsync(existing.get().getId());
            return;
        }
        try {
            GitHubWebhookDelivery saved = deliveries.saveAndFlush(new GitHubWebhookDelivery(deliveryId, event, body));
            events.processAsync(saved.getId());
        } catch (DataIntegrityViolationException duplicate) {
            deliveries.findByDeliveryId(deliveryId).ifPresent(d -> events.processAsync(d.getId()));
        }
    }

    private void verify(byte[] body, String provided) throws Exception {
        if (provided == null || !provided.startsWith("sha256=")) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid webhook signature");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] expected = mac.doFinal(body);
        byte[] actual;
        try { actual = HexFormat.of().parseHex(provided.substring(7)); }
        catch (IllegalArgumentException ex) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid webhook signature"); }
        if (!MessageDigest.isEqual(expected, actual)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid webhook signature");
    }
}
