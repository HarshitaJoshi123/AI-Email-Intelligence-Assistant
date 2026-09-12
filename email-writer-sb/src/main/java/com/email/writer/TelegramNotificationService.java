package com.email.writer;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

@Service
public class TelegramNotificationService {

    private final WebClient webClient;
    private final String botToken;
    private final String chatId;

    public TelegramNotificationService(
            @Value("${telegram.bot.token:}") String botToken,
            @Value("${telegram.chat.id:}") String chatId) {

        this.botToken = botToken == null ? "" : botToken.trim();
        this.chatId = chatId == null ? "" : chatId.trim();
        this.webClient = WebClient.builder()
                .baseUrl("https://api.telegram.org")
                .build();
    }

    public boolean isConfigured() {
        return !botToken.isEmpty() && !chatId.isEmpty();
    }

    public void sendMailMindAlert(
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
                "MailMind Alert\n\n"
                        + "Priority: " + safePriority + "\n\n"
                        + "Action: " + safeAction + "\n\n"
                        + "Deadline: " + safeDeadline
        );
    }

    public void sendDeadlineReminder(
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

        sendMessage(message.toString());
    }

    public String sendMessage(String text) {

        if (!isConfigured()) {
            throw new IllegalStateException(
                    "Telegram is not configured. Set telegram.bot.token and telegram.chat.id."
            );
        }

        Map<String, Object> body = Map.of(
                "chat_id", chatId,
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
