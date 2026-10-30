package com.jiralite.backend.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jiralite.backend.bug.Bug;
import com.jiralite.backend.bug.BugHistory;
import com.jiralite.backend.bug.BugHistoryRepository;
import com.jiralite.backend.bug.BugRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class GitHubEventService {
    private static final Pattern BUG_KEY = Pattern.compile("\\b([A-Z][A-Z0-9]{1,19}-[0-9]+)\\b");
    private final ObjectMapper mapper;
    private final GitHubWebhookDeliveryRepository deliveries;
    private final GitHubRepositoryBindingRepository bindings;
    private final GitHubEventReferenceRepository references;
    private final BugRepository bugs;
    private final BugHistoryRepository history;

    public GitHubEventService(ObjectMapper mapper, GitHubWebhookDeliveryRepository deliveries,
                              GitHubRepositoryBindingRepository bindings, GitHubEventReferenceRepository references,
                              BugRepository bugs, BugHistoryRepository history) {
        this.mapper = mapper; this.deliveries = deliveries; this.bindings = bindings;
        this.references = references; this.bugs = bugs; this.history = history;
    }

    @Async
    @Transactional
    public void processAsync(Long deliveryId) {
        GitHubWebhookDelivery delivery = deliveries.findById(deliveryId).orElse(null);
        if (delivery == null || "PROCESSED".equals(delivery.getStatus())) return;
        delivery.markProcessing();
        try {
            JsonNode root = mapper.readTree(delivery.getPayload());
            JsonNode repository = root.path("repository");
            long repositoryId = repository.path("id").asLong(0);
            GitHubRepositoryBinding binding = bindings.findByRepositoryId(repositoryId).orElse(null);
            if (binding == null || !binding.getFullName().equals(repository.path("full_name").asText())
                    || root.path("installation").path("id").asLong(0) != binding.getInstallationId()) {
                delivery.markProcessed();
                return;
            }
            List<ExternalReference> events = extract(delivery.getEventType(), root);
            for (ExternalReference event : events) {
                Bug bug = bugs.findByBugKeyIgnoreCase(event.bugKey()).orElse(null);
                if (bug == null || !bug.getProject().getId().equals(binding.getProject().getId())
                        || references.existsByRepositoryIdAndExternalTypeAndExternalIdAndBugId(
                        repositoryId, event.type(), event.externalId(), bug.getId())) continue;
                references.save(new GitHubEventReference(delivery, event.bugKey(), event.type(),
                        event.externalId(), repositoryId, bug));
                history.save(new BugHistory(bug, event.type(), event.summary(), event.author()));
            }
            delivery.markProcessed();
        } catch (Exception ex) {
            delivery.markFailed(ex.getMessage());
            deliveries.save(delivery);
        }
    }

    private List<ExternalReference> extract(String eventType, JsonNode root) {
        List<ExternalReference> result = new ArrayList<>();
        if ("push".equals(eventType)) {
            for (JsonNode commit : root.path("commits")) {
                addMatches(result, "COMMIT", commit.path("id").asText(), commit.path("message").asText(),
                        commit.path("url").asText(), commit.path("author").path("name").asText());
            }
        } else if ("pull_request".equals(eventType)
                && List.of("opened", "edited", "reopened", "synchronize", "closed").contains(root.path("action").asText())) {
            JsonNode pr = root.path("pull_request");
            String summary = pr.path("title").asText() + " (" + pr.path("html_url").asText() + ")";
            String text = pr.path("title").asText() + "\n" + pr.path("body").asText();
            addMatches(result, "PULL_REQUEST", String.valueOf(pr.path("id").asLong()), text,
                    summary, pr.path("user").path("login").asText());
        }
        return result;
    }

    private void addMatches(List<ExternalReference> result, String type, String id, String text,
                            String summary, String author) {
        var matcher = BUG_KEY.matcher(text == null ? "" : text);
        while (matcher.find()) result.add(new ExternalReference(matcher.group(1), type, id, summary, author));
    }

    private record ExternalReference(String bugKey, String type, String externalId, String summary, String author) {}
}
