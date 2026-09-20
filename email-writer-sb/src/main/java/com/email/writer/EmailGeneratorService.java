package com.email.writer;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class EmailGeneratorService {

    private final WebClient webClient;
    private final String apiKey;

    // Repository is used to save email analysis in PostgreSQL
    private final EmailAnalysisRepository emailAnalysisRepository;

    // Service is used to send WhatsApp alerts through Twilio
    private final TwilioWhatsAppService twilioWhatsAppService;


    public EmailGeneratorService(
            @Value("${gemini.api.url}") String baseUrl,
            @Value("${gemini.api.key}") String geminiApiKey,
            EmailAnalysisRepository emailAnalysisRepository,
            TwilioWhatsAppService twilioWhatsAppService) {

        this.apiKey = geminiApiKey;
        this.emailAnalysisRepository = emailAnalysisRepository;
        this.twilioWhatsAppService = twilioWhatsAppService;

        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .build();
    }


    // =========================================================
    // 1. GENERATE EMAIL REPLY
    // =========================================================

    public String generateEmailReply(EmailRequest emailRequest) {

        // Build prompt
        String prompt = buildPrompt(emailRequest);

        // ObjectMapper converts Java objects to JSON safely,
        // correctly escaping quotes, backslashes, and newlines
        // in the prompt (same approach as generateEmailAnalysis).
        ObjectMapper mapper = new ObjectMapper();

        String requestBody;

        try {

            requestBody = mapper.writeValueAsString(
                    java.util.Map.of(
                            "contents",
                            java.util.List.of(
                                    java.util.Map.of(
                                            "parts",
                                            java.util.List.of(
                                                    java.util.Map.of(
                                                            "text",
                                                            prompt
                                                    )
                                            )
                                    )
                            )
                    )
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Error creating request body: "
                            + e.getMessage()
            );
        }

        // Send request to Gemini
        String response = webClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1beta/models/gemini-2.5-flash:generateContent")
                        .build())
                .header("x-goog-api-key", apiKey)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        // Extract the generated reply
        return extractResponseContent(response);
    }


    // =========================================================
    // 2. ANALYZE EMAIL
    // =========================================================

    public EmailAnalysis generateEmailAnalysis(
            EmailRequest emailRequest) {

        // Build analysis prompt
        String prompt = buildAnalysisPrompt(emailRequest);

        // ObjectMapper converts Java objects to JSON
        ObjectMapper mapper = new ObjectMapper();

        String requestBody;

        try {

            requestBody = mapper.writeValueAsString(
                    java.util.Map.of(
                            "contents",
                            java.util.List.of(
                                    java.util.Map.of(
                                            "parts",
                                            java.util.List.of(
                                                    java.util.Map.of(
                                                            "text",
                                                            prompt
                                                    )
                                            )
                                    )
                            )
                    )
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Error creating request body: "
                            + e.getMessage()
            );
        }


        // Send request to Gemini
        String response = webClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1beta/models/gemini-2.5-flash:generateContent")
                        .build())
                .header("x-goog-api-key", apiKey)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .onStatus(
                        HttpStatusCode::isError,
                        clientResponse ->
                                clientResponse
                                        .bodyToMono(String.class)
                                        .map(
                                                errorBody ->
                                                        new RuntimeException(
                                                                "Gemini API Error: "
                                                                        + errorBody
                                                        )
                                        )
                )
                .bodyToMono(String.class)
                .block();


        // Convert Gemini response into EmailAnalysis
        EmailAnalysis analysis =
                extractAnalysisResponse(response);


        // Save analysis in PostgreSQL
        saveAnalysis(
                emailRequest,
                analysis
        );

        return analysis;
    }


    // =========================================================
    // 3. SAVE ANALYSIS TO DATABASE
    // =========================================================

    private void saveAnalysis(
            EmailRequest emailRequest,
            EmailAnalysis analysis) {

        if (analysis == null) {

            throw new RuntimeException(
                    "Unable to save analysis because analysis is null."
            );
        }


        EmailAnalysisEntity entity =
                new EmailAnalysisEntity();


        // Save original email
        entity.setEmailContent(
                emailRequest.getEmailContent()
        );


        // Save AI summary
        entity.setSummary(
                analysis.getSummary()
        );


        // Save category
        entity.setCategory(
                analysis.getCategory()
        );


        // Save priority
        entity.setPriority(
                analysis.getPriority()
        );


        // Save action requirement
        entity.setActionRequired(
                analysis.isActionRequired()
        );


        // Save required action
        entity.setAction(
                analysis.getAction()
        );


        // Save human-readable deadline
        entity.setDeadline(
                analysis.getDeadline()
        );


        // =====================================================
        // SAVE MACHINE-READABLE DEADLINE
        // =====================================================

        String deadlineAt = analysis.getDeadlineAt();

        if (deadlineAt != null
                && !deadlineAt.trim().isEmpty()) {

            try {

                // Convert ISO string into LocalDateTime
                LocalDateTime deadlineDateTime =
                        LocalDateTime.parse(
                                deadlineAt.trim()
                        );

                entity.setDeadlineAt(
                        deadlineDateTime
                );

            } catch (Exception e) {

                // If AI returns an invalid date,
                // don't break the complete email analysis.
                entity.setDeadlineAt(null);

                System.out.println(
                        "Invalid deadlineAt received from AI: "
                                + deadlineAt
                );

            }

        } else {

            // No deadline mentioned
            entity.setDeadlineAt(null);
        }


        // Save AI suggested reply
        entity.setReply(
                analysis.getReply()
        );


        // =====================================================
        // ACTION STATUS
        // =====================================================

        // New actions start as PENDING
        if (analysis.isActionRequired()) {

            entity.setStatus("PENDING");

        } else {

            // No action is required
            entity.setStatus("COMPLETED");
        }


        // Save creation time
        entity.setCreatedAt(
                LocalDateTime.now(ZoneId.of("Asia/Kolkata"))
        );
        entity.setOneHourReminderSent(false);
        entity.setTenMinuteReminderSent(false);


        // =====================================================
        // SAVE ANALYSIS TO DATABASE
        // =====================================================

        emailAnalysisRepository.save(entity);


        // =====================================================
        // AUTOMATIC WHATSAPP ALERT
        // =====================================================

        /*
         * WhatsApp notification is sent only for important emails.
         *
         * Conditions:
         * 1. Action is required
         * AND
         * 2. Priority is HIGH
         *    OR
         * 3. A deadline exists
         */

        boolean hasDeadline =
                deadlineAt != null
                        && !deadlineAt.trim().isEmpty();

        boolean isHighPriority =
                "HIGH".equalsIgnoreCase(
                        analysis.getPriority()
                );

        boolean importantEmail =
                analysis.isActionRequired()
                        && (isHighPriority || hasDeadline);


        if (importantEmail) {

            try {

                // =================================================
                // CREATE DYNAMIC WHATSAPP MESSAGE
                // =================================================

                String priority =
                        analysis.getPriority() != null
                                ? analysis.getPriority()
                                : "UNKNOWN";

                String action =
                        analysis.getAction() != null
                                && !analysis.getAction().trim().isEmpty()
                                ? analysis.getAction()
                                : "Please review this email.";

                String deadline =
                        analysis.getDeadline() != null
                                && !analysis.getDeadline().trim().isEmpty()
                                ? analysis.getDeadline()
                                : "No deadline specified";


                String whatsappMessage =
                        "🔔 MailMind Alert\n\n"
                                + "Priority: "
                                + priority
                                + "\n\n"
                                + "Action: "
                                + action
                                + "\n\n"
                                + "Deadline: "
                                + deadline;


                // Send WhatsApp message
                twilioWhatsAppService.sendWhatsAppMessage(
                        whatsappMessage
                );


                System.out.println(
                        "MailMind WhatsApp alert sent successfully."
                );

            } catch (Exception e) {

                /*
                 * WhatsApp failure should NOT break
                 * email analysis or database saving.
                 */

                System.out.println(
                        "MailMind WhatsApp alert failed: "
                                + e.getMessage()
                );
            }
        }
    }


    // =========================================================
    // 4. EXTRACT NORMAL AI RESPONSE
    // =========================================================

    private String extractResponseContent(
            String response) {

        try {

            ObjectMapper mapper =
                    new ObjectMapper();

            JsonNode rootNode =
                    mapper.readTree(response);

            return rootNode
                    .path("candidates")
                    .get(0)
                    .path("content")
                    .path("parts")
                    .get(0)
                    .path("text")
                    .asString();

        } catch (Exception e) {

            return "Error processing request: "
                    + e.getMessage();
        }
    }


    // =========================================================
    // 5. EXTRACT EMAIL ANALYSIS
    // =========================================================

    private EmailAnalysis extractAnalysisResponse(
            String response) {

        try {

            ObjectMapper mapper =
                    new ObjectMapper();


            // Gemini's complete response
            JsonNode rootNode =
                    mapper.readTree(response);


            // Extract AI-generated text
            String aiResponse =
                    rootNode
                            .path("candidates")
                            .get(0)
                            .path("content")
                            .path("parts")
                            .get(0)
                            .path("text")
                            .asString();


            // Convert AI JSON into EmailAnalysis object
            return mapper.readValue(
                    aiResponse,
                    EmailAnalysis.class
            );

        } catch (Exception e) {

            System.out.println(
                    "Error while extracting analysis: "
                            + e.getMessage()
            );

            return null;
        }
    }


    // =========================================================
    // 6. PROMPT FOR REPLY GENERATION
    // =========================================================

    private String buildPrompt(
            EmailRequest emailRequest) {

        // StringBuilder is used to build the prompt
        StringBuilder prompt =
                new StringBuilder();


        prompt.append(
                "You are an AI email assistant. "
                        + "Generate one concise, professional, "
                        + "context-aware email reply. "
                        + "Return only the reply, without "
                        + "explanations or multiple options. "
                        + "Match the requested tone and do not "
                        + "invent any information."
        );


        // Add selected tone
        if (emailRequest.getTone() != null
                && !emailRequest.getTone().isEmpty()) {

            prompt.append("Use a ")
                    .append(emailRequest.getTone())
                    .append(" tone.");
        }


        // Add original email
        prompt.append(
                "Original Email : \n"
        ).append(
                emailRequest.getEmailContent()
        );


        return prompt.toString();
    }


    // =========================================================
    // 7. PROMPT FOR EMAIL ANALYSIS
    // =========================================================

    private String buildAnalysisPrompt(
            EmailRequest emailRequest) {

        // Build the AI analysis prompt
        StringBuilder prompt =
                new StringBuilder();


        // =====================================================
        // CURRENT DATE AND TIME IN INDIA
        // =====================================================

        ZonedDateTime indiaNow =
                ZonedDateTime.now(
                        ZoneId.of("Asia/Kolkata")
                );

        String currentDateTime =
                indiaNow.format(
                        DateTimeFormatter.ISO_LOCAL_DATE_TIME
                );


        prompt.append("""
                You are an AI email intelligence assistant.

                Analyze the following email and return ONLY valid JSON.

                The current date and time in India (IST) is:
                """)
                .append(currentDateTime)
                .append("""
                
                Use this current date and time when converting
                relative deadlines such as:
                - today
                - tomorrow
                - Monday
                - next Friday
                - next week
                
                Use exactly this JSON structure:

                {
                  "reply": "A concise reply to the email",
                  "summary": "A short summary of the email",
                  "category": "WORK, INTERVIEW, MEETING, FINANCE, PERSONAL, or OTHER",
                  "priority": "HIGH, MEDIUM, or LOW",
                  "actionRequired": true,
                  "action": "The main action the recipient needs to take",
                  "deadline": "The human-readable deadline if mentioned, otherwise empty string",
                  "deadlineAt": "The exact deadline in yyyy-MM-dd'T'HH:mm:ss format, otherwise empty string"
                }

                Deadline rules:

                1. If the email contains a deadline, convert it into
                   an exact date and time using the current IST date/time.

                2. Return deadlineAt ONLY in this format:
                   yyyy-MM-dd'T'HH:mm:ss

                3. Use India time (IST) for deadlineAt.

                4. If the email says "tomorrow at 6 PM",
                   convert it to the correct calendar date at 18:00:00.

                5. If the email says "today by 5 PM",
                   use today's date and 17:00:00.

                6. If a specific date and time is mentioned,
                   convert it to that exact date and time.

                7. If a deadline date is given but no time is specified,
                   use 23:59:59 as the deadline time.

                8. If there is no deadline, return:
                   "deadline": "",
                   "deadlineAt": ""

                9. Never invent a deadline that is not present
                   or reasonably implied by the email.

                General rules:

                - Return valid JSON only.
                - Do not add markdown.
                - Do not add explanations.
                - Do not invent information.
                - If no action is required, set actionRequired to false.
                - If there is no action, set action to an empty string.
                """);


        // =====================================================
        // REPLY TONE
        // =====================================================

        if (emailRequest.getTone() != null
                && !emailRequest.getTone().isEmpty()) {

            prompt.append(
                            "\nThe reply should use a "
                    )
                    .append(
                            emailRequest.getTone()
                    )
                    .append(
                            " tone."
                    );
        }


        // =====================================================
        // ORIGINAL EMAIL
        // =====================================================

        prompt.append(
                        "\n\nOriginal Email:\n"
                )
                .append(
                        emailRequest.getEmailContent()
                );


        return prompt.toString();
    }
}