package com.email.writer;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

/*
 * Telegram destination is now per-user: the bot token is shared
 * (one bot), but the chat id a message is sent to comes from
 * whichever User the notification belongs to, via
 * user.getTelegramChatId(). This replaced a single hardcoded
 * telegram.chat.id that sent every user's reminders to one chat.
 */
@Service
public class TelegramNotificationService {

    private final WebClient webClient;
    private final String botToken;

    public TelegramNotificationService(
            @Value("${telegram.bot.token:}") String botToken) {

        this.botToken = botToken == null ? "" : botToken.trim();
        this.webClient = WebClient.builder()
                .baseUrl("https://api.telegram.org")
                .build();
    }

    // Bot-level readiness only (is a bot token configured at all).
    // Whether a given user should receive a message is a separate,
    // per-user check -> see isConfiguredForUser(User).
    public boolean isBotConfigured() {
        return !botToken.isEmpty();
    }

    public boolean isConfiguredForUser(User user) {
        return isBotConfigured()
                && user != null
                && user.isTelegramNotificationsEnabled()
                && user.getTelegramChatId() != null
                && !user.getTelegramChatId().isBlank();
    }

    public void sendMailMindAlert(
            String chatId,
            String priority,
            String action,
            String deadline) {

        String safePriority =
                (priority == null || priority.isBlank())
                        ? "UNKNOWN"
                        : priority.trim();

        String safeAction =
                (action == null || action.isBlank())
                        ? "Please review this email."
                        : action.trim();

        String safeDeadline =
                (deadline == null || deadline.isBlank())
                        ? "No deadline specified"
                        : deadline.trim();

        sendMessage(
                chatId,
                "MailMind Alert\n\n"
                        + "Priority: " + safePriority + "\n\n"
                        + "Action: " + safeAction + "\n\n"
                        + "Deadline: " + safeDeadline
        );
    }

    public void sendDeadlineReminder(
            String chatId,
            EmailAnalysisEntity email,
            String headline,
            String formattedDeadline) {

        StringBuilder message = new StringBuilder();
        message.append(headline).append("\n\n");

        if (email.getAction() != null && !email.getAction().isBlank()) {
            message.append("Action: ")
                    .append(email.getAction().trim())
                    .append("\n\n");
        }

        if (email.getCategory() != null && !email.getCategory().isBlank()) {
            message.append("Category: ")
                    .append(email.getCategory().trim())
                    .append("\n\n");
        }

        if (email.getPriority() != null && !email.getPriority().isBlank()) {
            message.append("Priority: ")
                    .append(email.getPriority().trim())
                    .append("\n\n");
        }

        message.append("Deadline: ").append(formattedDeadline);

        sendMessage(chatId, message.toString());
    }

    public String sendMessage(String chatId, String text) {

        if (!isBotConfigured()) {
            throw new IllegalStateException(
                    "Telegram is not configured. Set telegram.bot.token."
            );
        }

        if (chatId == null || chatId.isBlank()) {
            throw new IllegalStateException(
                    "No Telegram chat id provided for this user."
            );
        }

        Map<String, Object> body = Map.of(
                "chat_id", chatId.trim(),
                "text", text
        );

        String response = webClient.post()
                .uri("/bot" + botToken + "/sendMessage")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        try {
            JsonNode root = new ObjectMapper().readTree(response);
            if (!root.path("ok").asBoolean(false)) {
                throw new IllegalStateException(
                        "Telegram API error: " + response
                );
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Unable to parse Telegram response: " + e.getMessage()
            );
        }

        return response;
    }
}
