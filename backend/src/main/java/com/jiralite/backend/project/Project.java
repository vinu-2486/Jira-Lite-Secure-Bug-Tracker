package com.jiralite.backend.project;

import jakarta.persistence.*;

@Entity
@Table(name = "projects")
public class Project {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "project_key", nullable = false, unique = true, length = 20)
    private String projectKey;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(length = 500)
    private String description;

    protected Project() {}
    public Project(String projectKey, String name, String description) {
        this.projectKey = projectKey; this.name = name; this.description = description;
    }
    public Long getId() { return id; }
    public String getProjectKey() { return projectKey; }
    public String getName() { return name; }
    public String getDescription() { return description; }
}
