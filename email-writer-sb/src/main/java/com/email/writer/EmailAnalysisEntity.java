package com.email.writer;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_analyses")
@Data
public class EmailAnalysisEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Original email content
    @Column(columnDefinition = "TEXT")
    private String emailContent;

    // AI-generated summary
    @Column(columnDefinition = "TEXT")
    private String summary;

    // Email category
    private String category;

    // HIGH, MEDIUM, or LOW
    private String priority;

    // Whether action is required
    private boolean actionRequired;

    // Main action user needs to take
    @Column(columnDefinition = "TEXT")
    private String action;

    // Human-readable deadline
    // Example: "tomorrow by 6 PM"
    private String deadline;

    // Exact deadline used for automation/reminders
    // Example: 2026-09-13 18:00:00
    private LocalDateTime deadlineAt;

    // PENDING or COMPLETED
    private String status;

    // AI-generated suggested reply
    @Column(columnDefinition = "TEXT")
    private String reply;

    // Time when analysis was created
    private LocalDateTime createdAt;
}