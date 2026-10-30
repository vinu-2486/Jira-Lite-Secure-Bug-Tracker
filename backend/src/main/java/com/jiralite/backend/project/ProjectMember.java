package com.jiralite.backend.project;

import com.jiralite.backend.user.User;
import jakarta.persistence.*;

@Entity
@Table(name = "project_members")
public class ProjectMember {
    @EmbeddedId private ProjectMemberId id;
    @ManyToOne(fetch = FetchType.LAZY) @MapsId("projectId")
    private Project project;
    @ManyToOne(fetch = FetchType.LAZY) @MapsId("userId")
    private User user;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private ProjectRole role;

    protected ProjectMember() {}
    public ProjectMember(Project project, User user, ProjectRole role) {
        this.project = project; this.user = user; this.role = role;
        this.id = new ProjectMemberId(project.getId(), user.getId());
    }
    public ProjectRole getRole() { return role; }
    public User getUser() { return user; }
    public Project getProject() { return project; }
}
