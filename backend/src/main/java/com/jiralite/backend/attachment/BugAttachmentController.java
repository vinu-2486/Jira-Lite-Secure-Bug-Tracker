package com.jiralite.backend.attachment;

import com.jiralite.backend.security.AppUserDetails;
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
    private final UserRepository users;
    private final Path root;

    public BugAttachmentController(BugAttachmentRepository attachments, UserRepository users,
                                   @Value("${jiralite.attachments.directory:./data/attachments}") String directory) {
        this.attachments = attachments; this.users = users; this.root = Paths.get(directory).toAbsolutePath().normalize();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AttachmentResponse upload(@PathVariable String key, @RequestPart("file") MultipartFile file,
                                     @AuthenticationPrincipal AppUserDetails actor) throws IOException {
        if (file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "File must be between 1 byte and 10 MB");
        }
        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename());
        if (original.contains("..")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
        String storage = UUID.randomUUID().toString();
        Files.createDirectories(root);
        Files.copy(file.getInputStream(), root.resolve(storage));
        var user = users.findById(actor.getId()).orElseThrow();
        var saved = attachments.save(new BugAttachment(key, original,
                file.getContentType() == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : file.getContentType(),
                storage, file.getSize(), user));
        return AttachmentResponse.from(saved);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(@PathVariable String key, @PathVariable Long id) {
        BugAttachment attachment = attachments.findByIdAndBugKey(id, key)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found"));
        Path file = root.resolve(attachment.getStorageName()).normalize();
        if (!file.startsWith(root)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found");
        Resource resource = new FileSystemResource(file);
        if (!resource.exists()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment file not found");
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(attachment.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(attachment.getOriginalName()).build().toString())
                .body(resource);
    }

    public record AttachmentResponse(Long id, String bugKey, String fileName, String contentType) {
        static AttachmentResponse from(BugAttachment a) {
            return new AttachmentResponse(a.getId(), a.getBugKey(), a.getOriginalName(), a.getContentType());
        }
    }
}
