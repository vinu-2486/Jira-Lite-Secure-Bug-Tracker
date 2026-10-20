package com.jiralite.backend.project;

import jakarta.persistence.Embeddable;
import java.io.Serializable;

@Embeddable
public record ProjectMemberId(Long projectId, Long userId) implements Serializable {}
