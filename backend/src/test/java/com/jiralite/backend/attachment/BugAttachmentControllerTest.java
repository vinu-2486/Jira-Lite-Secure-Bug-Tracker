package com.jiralite.backend.attachment;

import com.jiralite.backend.bug.Bug;
import com.jiralite.backend.bug.BugRepository;
import com.jiralite.backend.project.Project;
import com.jiralite.backend.project.ProjectMemberRepository;
import com.jiralite.backend.security.AppUserDetails;
import com.jiralite.backend.user.User;
import com.jiralite.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.mockito.ArgumentCaptor;
import static org.mockito.Mockito.*;

class BugAttachmentControllerTest {
    @Test
    void projectMemberCanUploadAndDownloadAttachment() throws Exception {
        Path root = Files.createTempDirectory("jiralite-attachment-test-");
        try {
            Fixture fixture = fixture(root, true);
            MockMultipartFile file = new MockMultipartFile("file", "report.txt", "text/plain", "private".getBytes());

            BugAttachmentController.AttachmentResponse saved = fixture.controller.upload("JILA-1", file, fixture.actor);

            assertThat(saved.bugKey()).isEqualTo("JILA-1");
            ArgumentCaptor<BugAttachment> captured = ArgumentCaptor.forClass(BugAttachment.class);
            verify(fixture.attachments).save(captured.capture());
            BugAttachment stored = captured.getValue();
            when(fixture.attachments.findById(1L)).thenReturn(Optional.of(stored));
            Files.writeString(root.resolve(stored.getStorageName()), "private");

            Resource downloaded = fixture.controller.download("JILA-1", 1L, fixture.actor).getBody();

            assertThat(downloaded).isNotNull();
            assertThat(downloaded.getContentAsString(StandardCharsets.UTF_8)).isEqualTo("private");
        } finally {
            deleteContents(root);
        }
    }

    @Test
    void nonMemberCannotUploadOrDownloadAttachment() throws Exception {
        Path root = Files.createTempDirectory("jiralite-attachment-test-");
        try {
            Fixture fixture = fixture(root, false);
            MockMultipartFile file = new MockMultipartFile("file", "report.txt", "text/plain", "private".getBytes());

            assertThatThrownBy(() -> fixture.controller.upload("JILA-1", file, fixture.actor))
                    .isInstanceOf(ResponseStatusException.class)
                    .extracting("statusCode.value").isEqualTo(404);

            BugAttachment attachment = mock(BugAttachment.class);
            when(attachment.getBugKey()).thenReturn("JILA-1");
            when(fixture.attachments.findById(1L)).thenReturn(Optional.of(attachment));

            assertThatThrownBy(() -> fixture.controller.download("JILA-1", 1L, fixture.actor))
                    .isInstanceOf(ResponseStatusException.class)
                    .extracting("statusCode.value").isEqualTo(404);
        } finally {
            deleteContents(root);
        }
    }

    @Test
    void uploadRejectsFilesOverTenMegabytes() throws Exception {
        Path root = Files.createTempDirectory("jiralite-attachment-test-");
        try {
            Fixture fixture = fixture(root, true);
            MockMultipartFile file = new MockMultipartFile(
                    "file", "large.bin", "application/octet-stream", new byte[10 * 1024 * 1024 + 1]);

            assertThatThrownBy(() -> fixture.controller.upload("JILA-1", file, fixture.actor))
                    .isInstanceOf(ResponseStatusException.class)
                    .extracting("statusCode.value").isEqualTo(413);
        } finally {
            deleteContents(root);
        }
    }

    private Fixture fixture(Path root, boolean member) {
        BugAttachmentRepository attachments = mock(BugAttachmentRepository.class);
        BugRepository bugs = mock(BugRepository.class);
        ProjectMemberRepository members = mock(ProjectMemberRepository.class);
        UserRepository users = mock(UserRepository.class);
        AppUserDetails actor = mock(AppUserDetails.class);
        Bug bug = mock(Bug.class);
        Project project = mock(Project.class);
        User user = mock(User.class);
        when(actor.getId()).thenReturn(11L);
        when(bugs.findByBugKeyIgnoreCase("JILA-1")).thenReturn(Optional.of(bug));
        when(bug.getBugKey()).thenReturn("JILA-1");
        when(bug.getProject()).thenReturn(project);
        when(project.getId()).thenReturn(7L);
        when(members.existsByProjectIdAndUserId(7L, 11L)).thenReturn(member);
        when(users.findById(11L)).thenReturn(Optional.of(user));
        when(attachments.save(any())).thenAnswer(invocation -> {
            return invocation.getArgument(0);
        });
        return new Fixture(new BugAttachmentController(attachments, bugs, members, users, root.toString()),
                attachments, actor);
    }

    private void deleteContents(Path root) throws Exception {
        if (Files.exists(root)) {
            try (var paths = Files.walk(root)) {
                paths.sorted(java.util.Comparator.reverseOrder()).forEach(path -> {
                    try {
                        Files.deleteIfExists(path);
                    } catch (java.io.IOException ex) {
                        throw new RuntimeException(ex);
                    }
                });
            }
        }
    }

    private record Fixture(BugAttachmentController controller,
                           BugAttachmentRepository attachments, AppUserDetails actor) {
    }
}
