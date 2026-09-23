package com.email.writer;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Component
public class DeadlineReminderScheduler {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DEADLINE_FORMAT =
            DateTimeFormatter.ofPattern(
                    "d MMMM yyyy, h:mm a",
                    Locale.ENGLISH
            );

    private final EmailAnalysisRepository emailAnalysisRepository;
    private final TelegramNotificationService telegramNotificationService;

    public DeadlineReminderScheduler(
            EmailAnalysisRepository emailAnalysisRepository,
            TelegramNotificationService telegramNotificationService) {
        this.emailAnalysisRepository = emailAnalysisRepository;
        this.telegramNotificationService = telegramNotificationService;
    }

    /*
     * @Transactional keeps one Hibernate session open for the whole
     * sweep, so lazily-loaded associations (email.getUser() on the
     * "latest" re-fetch below) can still be read without a
     * LazyInitializationException.
     */
    @Scheduled(cron = "0 * * * * *", zone = "Asia/Kolkata")
    @Transactional
    public void sendDueDeadlineReminders() {

        // Bot-level gate only. Per-user opt-in/chat id is checked
        // per email below, and findPendingWithDeadline() already
        // filters to users with notifications enabled.
        if (!telegramNotificationService.isBotConfigured()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now(IST);

        List<EmailAnalysisEntity> pendingEmails =
                emailAnalysisRepository.findPendingWithDeadline();

        for (EmailAnalysisEntity email : pendingEmails) {
            processEmail(email, now);
        }
    }

    private void processEmail(
            EmailAnalysisEntity email,
            LocalDateTime now) {

        User user = email.getUser();

        // No owning user, or that user hasn't connected/enabled
        // Telegram -> nothing to send this email to.
        if (!telegramNotificationService.isConfiguredForUser(user)) {
            return;
        }

        LocalDateTime deadlineAt = email.getDeadlineAt();

        if (deadlineAt == null || !deadlineAt.isAfter(now)) {
            return;
        }

        if ("COMPLETED".equalsIgnoreCase(email.getStatus())) {
            return;
        }

        LocalDateTime createdAt = email.getCreatedAt();
        LocalDateTime oneHourMark = deadlineAt.minusHours(1);
        LocalDateTime tenMinuteMark = deadlineAt.minusMinutes(10);

        if (!email.isOneHourReminderSent()
                && !now.isBefore(oneHourMark)
                && now.isBefore(tenMinuteMark)
                && wasAlreadyAnalyzedBy(createdAt, oneHourMark)) {

            sendAndMark(
                    email,
                    user.getTelegramChatId(),
                    true,
                    "🔔 MailMind Reminder\n\nYour deadline is in 1 hour.",
                    deadlineAt
            );
        }

        EmailAnalysisEntity latest =
                emailAnalysisRepository.findById(email.getId())
                        .orElse(email);

        if ("COMPLETED".equalsIgnoreCase(latest.getStatus())) {
            return;
        }

        if (!latest.isTenMinuteReminderSent()
                && !now.isBefore(tenMinuteMark)
                && now.isBefore(deadlineAt)
                && wasAlreadyAnalyzedBy(createdAt, tenMinuteMark)) {

            sendAndMark(
                    latest,
                    user.getTelegramChatId(),
                    false,
                    "🚨 MailMind Reminder\n\nYour deadline is in 10 minutes!",
                    deadlineAt
            );
        }
    }

    private boolean wasAlreadyAnalyzedBy(
            LocalDateTime createdAt,
            LocalDateTime reminderMark) {

        if (createdAt == null) {
            return true;
        }

        return !createdAt.isAfter(reminderMark);
    }

    private void sendAndMark(
            EmailAnalysisEntity email,
            String chatId,
            boolean oneHourReminder,
            String headline,
            LocalDateTime deadlineAt) {

        try {
            telegramNotificationService.sendDeadlineReminder(
                    chatId,
                    email,
                    headline,
                    deadlineAt.format(DEADLINE_FORMAT)
            );

            if (oneHourReminder) {
                email.setOneHourReminderSent(true);
            } else {
                email.setTenMinuteReminderSent(true);
            }

            emailAnalysisRepository.save(email);

            System.out.println(
                    "MailMind deadline reminder sent for email id "
                            + email.getId()
                            + (oneHourReminder ? " (1 hour)" : " (10 minutes)")
            );
        } catch (Exception e) {
            System.out.println(
                    "MailMind deadline reminder failed for email id "
                            + email.getId()
                            + ": "
                            + e.getMessage()
            );
        }
    }
}
