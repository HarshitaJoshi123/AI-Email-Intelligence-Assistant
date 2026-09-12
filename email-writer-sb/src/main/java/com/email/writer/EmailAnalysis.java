package com.email.writer;

import lombok.Data;

@Data
public class EmailAnalysis {

    // AI-generated suggested reply
    private String reply;

    // Short summary of the email
    private String summary;

    // Email category
    private String category;

    // HIGH, MEDIUM, or LOW
    private String priority;

    // Whether the user needs to take an action
    private boolean actionRequired;

    // Main action the user needs to take
    private String action;

    // Original/human-readable deadline
    // Example: "tomorrow by 6 PM"
    private String deadline;

    // Exact machine-readable deadline
    // Example: "2026-09-13T18:00:00"
    private String deadlineAt;
}