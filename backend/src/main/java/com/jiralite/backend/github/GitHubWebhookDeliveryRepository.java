package com.jiralite.backend.github;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GitHubWebhookDeliveryRepository extends JpaRepository<GitHubWebhookDelivery, Long> {
    Optional<GitHubWebhookDelivery> findByDeliveryId(String deliveryId);
}
