package com.jiralite.backend.github;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class GitHubWebhookControllerTest {
    private final GitHubWebhookController controller = new GitHubWebhookController(
            mock(GitHubWebhookDeliveryRepository.class), mock(GitHubEventService.class), "test-secret");

    @Test
    void forgedSignatureIsRejectedBeforePersistence() {
        MockHttpServletRequest request = request("{\"repository\":{\"id\":1}}");
        assertThatThrownBy(() -> controller.webhook("push", "delivery-1", "sha256=00", request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode.value").isEqualTo(401);
    }

    @Test
    void validRawPayloadSignatureIsAcceptedForSupportedEvent() throws Exception {
        byte[] body = "{\"repository\":{\"id\":1},\"commits\":[]}".getBytes(StandardCharsets.UTF_8);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setContent(body);
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("test-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = "sha256=" + HexFormat.of().formatHex(mac.doFinal(body));
        GitHubWebhookDelivery delivery = new GitHubWebhookDelivery("delivery-2", "push", body);
        GitHubWebhookDeliveryRepository repository = mock(GitHubWebhookDeliveryRepository.class);
        when(repository.saveAndFlush(any())).thenReturn(delivery);
        GitHubWebhookController localController = new GitHubWebhookController(repository, mock(GitHubEventService.class), "test-secret");
        localController.webhook("push", "delivery-2", signature, request);
    }

    @Test
    void duplicateDeliveryIsAcknowledgedWithoutCreatingAnotherRecord() throws Exception {
        byte[] body = "{\"repository\":{\"id\":1},\"commits\":[]}".getBytes(StandardCharsets.UTF_8);
        GitHubWebhookDelivery delivery = new GitHubWebhookDelivery("delivery-3", "push", body);
        GitHubWebhookDeliveryRepository repository = mock(GitHubWebhookDeliveryRepository.class);
        GitHubEventService service = mock(GitHubEventService.class);
        when(repository.findByDeliveryId("delivery-3")).thenReturn(Optional.of(delivery));
        GitHubWebhookController localController = new GitHubWebhookController(repository, service, "test-secret");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setContent(body);
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("test-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        localController.webhook("push", "delivery-3", "sha256=" + HexFormat.of().formatHex(mac.doFinal(body)), request);
        verify(repository, never()).saveAndFlush(any());
    }

    private MockHttpServletRequest request(String body) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setContent(body.getBytes(StandardCharsets.UTF_8));
        return request;
    }
}
