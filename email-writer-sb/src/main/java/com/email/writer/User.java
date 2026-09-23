package com.email.writer;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    private String name;

    private LocalDateTime createdAt;

    // Personal Telegram chat id this user's reminders should be
    // sent to. Null/blank means the user hasn't connected Telegram.
    private String telegramChatId;

    // Explicit opt-in flag, separate from telegramChatId being set,
    // so a user can pause notifications without losing the saved id.
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean telegramNotificationsEnabled = false;
}