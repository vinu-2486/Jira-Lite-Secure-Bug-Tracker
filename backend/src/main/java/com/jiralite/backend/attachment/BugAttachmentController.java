package com.jiralite.backend.attachment;

import com.jiralite.backend.bug.Bug;
import com.jiralite.backend.bug.BugRepository;
import com.jiralite.backend.security.AppUserDetails;
import com.jiralite.backend.project.ProjectMemberRepository;
import com.jiralite.backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/bugs/{key}/attachments")
public class BugAttachmentController {
    private static final long MAX_BYTES = 10 * 1024 * 1024;
    private final BugAttachmentRepository attachments;
    private final BugRepository bugs;
    private final ProjectMemberRepository members;
    private final UserRepository users;
    private final Path root;

    public BugAttachmentController(BugAttachmentRepository attachments, BugRepository bugs,
                                   ProjectMemberRepository members, UserRepository users,
                                   @Value("${jiralite.attachments.directory:./data/attachments}") String directory) {
        this.attachments = attachments;
        this.bugs = bugs;
        this.members = members;
        this.users = users;
        this.root = Paths.get(directory).toAbsolutePath().normalize();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AttachmentResponse upload(@PathVariable String key, @RequestPart("file") MultipartFile file,
                                     @AuthenticationPrincipal AppUserDetails actor) throws IOException {
        Bug bug = requireMember(key, actor.getId());
        if (file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "File must be between 1 byte and 10 MB");
        }
        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename());
        if (original.contains("..")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
        String storage = UUID.randomUUID().toString();
        Files.createDirectories(root);
        Files.copy(file.getInputStream(), root.resolve(storage));
        var user = users.findById(actor.getId()).orElseThrow();
        var saved = attachments.save(new BugAttachment(bug.getBugKey(), original,
                file.getContentType() == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : file.getContentType(),
                storage, file.getSize(), user));
        return AttachmentResponse.from(saved);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(@PathVariable String key, @PathVariable Long id,
                                             @AuthenticationPrincipal AppUserDetails actor) {
        BugAttachment attachment = attachments.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found"));
        if (!attachment.getBugKey().equalsIgnoreCase(key)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found");
        }
        requireMember(attachment.getBugKey(), actor.getId());
        Path file = root.resolve(attachment.getStorageName()).normalize();
        if (!file.startsWith(root)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found");
        Resource resource = new FileSystemResource(file);
        if (!resource.exists()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment file not found");
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(attachment.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(attachment.getOriginalName()).build().toString())
                .body(resource);
    }

    private Bug requireMember(String key, Long actorId) {
        Bug bug = bugs.findByBugKeyIgnoreCase(key)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bug not found"));
        if (!members.existsByProjectIdAndUserId(bug.getProject().getId(), actorId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bug not found");
        }
        return bug;
    }

    public record AttachmentResponse(Long id, String bugKey, String fileName, String contentType) {
        static AttachmentResponse from(BugAttachment a) {
            return new AttachmentResponse(a.getId(), a.getBugKey(), a.getOriginalName(), a.getContentType());
        }
    }
}
