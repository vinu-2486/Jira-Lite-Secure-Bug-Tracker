package com.jiralite.backend.github;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "github_webhook_deliveries")
public class GitHubWebhookDelivery {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "delivery_id", nullable = false, unique = true, length = 100) private String deliveryId;
    @Column(name = "event_type", nullable = false, length = 50) private String eventType;
    @Lob @Column(nullable = false, columnDefinition = "MEDIUMBLOB") private byte[] payload;
    @Column(nullable = false, length = 20) private String status;
    @Column(nullable = false) private int attempts;
    @Column(name = "last_error", length = 1000) private String lastError;
    @Column(name = "received_at", nullable = false, updatable = false) private Instant receivedAt;
    @Column(name = "processed_at") private Instant processedAt;

    protected GitHubWebhookDelivery() {}
    public GitHubWebhookDelivery(String deliveryId, String eventType, byte[] payload) {
        this.deliveryId = deliveryId; this.eventType = eventType; this.payload = payload; this.status = "RECEIVED";
    }
    @PrePersist void onCreate() { receivedAt = Instant.now(); }
    public Long getId() { return id; }
    public String getDeliveryId() { return deliveryId; }
    public String getEventType() { return eventType; }
    public byte[] getPayload() { return payload; }
    public String getStatus() { return status; }
    public int getAttempts() { return attempts; }
    public String getLastError() { return lastError; }
    public void markProcessing() { status = "PROCESSING"; attempts++; }
    public void markProcessed() { status = "PROCESSED"; processedAt = Instant.now(); lastError = null; }
    public void markFailed(String error) { status = "FAILED"; lastError = error == null ? "Processing failed" : error.substring(0, Math.min(1000, error.length())); }
}
