package com.jiralite.backend.attachment;

import com.jiralite.backend.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "bug_attachments")
public class BugAttachment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "bug_key", nullable = false, length = 50)
    private String bugKey;
    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;
    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;
    @Column(name = "storage_name", nullable = false, unique = true, length = 100)
    private String storageName;
    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;
    @Column(nullable = false) private Instant createdAt = Instant.now();

    protected BugAttachment() {}
    public BugAttachment(String bugKey, String originalName, String contentType,
                         String storageName, long sizeBytes, User uploadedBy) {
        this.bugKey = bugKey; this.originalName = originalName; this.contentType = contentType;
        this.storageName = storageName; this.sizeBytes = sizeBytes; this.uploadedBy = uploadedBy;
    }
    public Long getId() { return id; }
    public String getBugKey() { return bugKey; }
    public String getOriginalName() { return originalName; }
    public String getContentType() { return contentType; }
    public String getStorageName() { return storageName; }
}
