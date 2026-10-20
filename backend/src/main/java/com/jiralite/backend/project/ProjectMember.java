package com.jiralite.backend.project;

import com.jiralite.backend.user.Role;
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
    private Role role;

    protected ProjectMember() {}
    public ProjectMember(Project project, User user, Role role) {
        this.project = project; this.user = user; this.role = role;
        this.id = new ProjectMemberId(project.getId(), user.getId());
    }
    public Role getRole() { return role; }
}
