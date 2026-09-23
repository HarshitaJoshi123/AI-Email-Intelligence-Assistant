package com.email.writer;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class EmailGeneratorService {

        private final WebClient webClient;
        private final String apiKey;

        // Repository is used to save email analysis in PostgreSQL
        private final EmailAnalysisRepository emailAnalysisRepository;

        // User service is used to find/create the logged-in user
        private final UserService userService;

        // =========================================================
        // GEMINI MODELS FOR FALLBACK
        // =========================================================

        /*
         * Normal production mode.
         *
         * Models are tried in order.
         *
         * The first model that successfully responds is
         * immediately returned.
         *
         * This avoids calling every model for every request.
         */
        private static final boolean BENCHMARK_ALL_MODELS = false;

        private static final List<String> GEMINI_MODELS = List.of(
                        "gemini-3.5-flash-lite",
                        "gemini-3.5-flash",
                        "gemini-3.6-flash",
                        "gemini-3.7-flash",
                        "gemini-3.8-flash");

        public EmailGeneratorService(
                        @Value("${gemini.api.url}") String baseUrl,
                        @Value("${gemini.api.key}") String geminiApiKey,
                        EmailAnalysisRepository emailAnalysisRepository,
                        UserService userService) {

                this.apiKey = geminiApiKey;

                this.emailAnalysisRepository = emailAnalysisRepository;

                this.userService = userService;

                this.webClient = WebClient.builder()
                                .baseUrl(baseUrl)
                                .build();
        }

        // =========================================================
        // 1. GENERATE EMAIL REPLY
        // =========================================================

        public String generateEmailReply(
                        EmailRequest emailRequest) {

                String prompt = buildPrompt(emailRequest);

                String requestBody = createRequestBody(prompt);

                /*
                 * Gemini benchmark / fallback.
                 */
                String response = callGeminiWithFallback(
                                requestBody);

                return extractResponseContent(
                                response);
        }

        // =========================================================
        // 2. ANALYZE EMAIL
        // =========================================================

        public EmailAnalysis generateEmailAnalysis(
                        EmailRequest emailRequest) {

                // -----------------------------------------------------
                // Build analysis prompt
                // -----------------------------------------------------

                String prompt = buildAnalysisPrompt(
                                emailRequest);

                // -----------------------------------------------------
                // Convert request into JSON
                // -----------------------------------------------------

                String requestBody = createRequestBody(prompt);

                // -----------------------------------------------------
                // Gemini benchmark / fallback
                // -----------------------------------------------------

                long geminiStartTime = System.currentTimeMillis();

                String response = callGeminiWithFallback(
                                requestBody);

                long geminiEndTime = System.currentTimeMillis();

                System.out.println(
                                "========================================");

                System.out.println(
                                "Gemini analysis total time: "
                                                + (geminiEndTime - geminiStartTime)
                                                + " ms");

                System.out.println(
                                "Gemini analysis total time: "
                                                + ((geminiEndTime - geminiStartTime)
                                                                / 1000.0)
                                                + " seconds");

                System.out.println(
                                "========================================");

                // -----------------------------------------------------
                // Convert Gemini response into EmailAnalysis
                // -----------------------------------------------------

                long parsingStartTime = System.currentTimeMillis();

                EmailAnalysis analysis = extractAnalysisResponse(
                                response);

                long parsingEndTime = System.currentTimeMillis();

                System.out.println(
                                "Analysis parsing time: "
                                                + (parsingEndTime - parsingStartTime)
                                                + " ms");

                if (analysis == null) {

                        throw new RuntimeException(
                                        "Gemini returned an invalid email analysis.");
                }

                // -----------------------------------------------------
                // Save analysis in PostgreSQL
                // -----------------------------------------------------

                long dbStartTime = System.currentTimeMillis();

                saveAnalysis(
                                emailRequest,
                                analysis);

                long dbEndTime = System.currentTimeMillis();

                System.out.println(
                                "========================================");

                System.out.println(
                                "Database save time: "
                                                + (dbEndTime - dbStartTime)
                                                + " ms");

                System.out.println(
                                "Database save time: "
                                                + ((dbEndTime - dbStartTime)
                                                                / 1000.0)
                                                + " seconds");

                System.out.println(
                                "========================================");

                return analysis;
        }

        // =========================================================
        // 3. CREATE GEMINI REQUEST BODY
        // =========================================================

        private String createRequestBody(
                        String prompt) {

                ObjectMapper mapper = new ObjectMapper();

                try {

                        return mapper.writeValueAsString(
                                        Map.of(
                                                        "contents",
                                                        List.of(
                                                                        Map.of(
                                                                                        "parts",
                                                                                        List.of(
                                                                                                        Map.of(
                                                                                                                        "text",
                                                                                                                        prompt))))));

                } catch (Exception e) {

                        throw new RuntimeException(
                                        "Error creating Gemini request body: "
                                                        + e.getMessage(),
                                        e);
                }
        }

        // =========================================================
        // 4. GEMINI BENCHMARK + FALLBACK
        // =========================================================

        private String callGeminiWithFallback(
                        String requestBody) {

                // =====================================================
                // TEMPORARY BENCHMARK MODE
                // =====================================================

                if (BENCHMARK_ALL_MODELS) {

                        return benchmarkAllGeminiModels(
                                        requestBody);
                }

                // =====================================================
                // NORMAL FAST FALLBACK MODE
                // =====================================================

                Exception lastException = null;

                System.out.println();
                System.out.println(
                                "========================================");

                System.out.println(
                                "Starting Gemini fallback sequence");

                System.out.println(
                                "========================================");

                for (String model : GEMINI_MODELS) {

                        System.out.println(
                                        "Trying Gemini model: "
                                                        + model);

                        try {

                                long startTime = System.currentTimeMillis();

                                String response = callGemini(
                                                model,
                                                requestBody);

                                long endTime = System.currentTimeMillis();

                                long responseTime = endTime - startTime;

                                if (response != null
                                                && !response.trim().isEmpty()) {

                                        System.out.println(
                                                        "SUCCESS: Gemini model "
                                                                        + model);

                                        System.out.println(
                                                        "Response time: "
                                                                        + responseTime
                                                                        + " ms");

                                        System.out.println(
                                                        "Response time: "
                                                                        + (responseTime
                                                                                        / 1000.0)
                                                                        + " seconds");

                                        System.out.println(
                                                        "========================================");

                                        return response;
                                }

                                System.out.println(
                                                "Model "
                                                                + model
                                                                + " returned an empty response.");

                        } catch (Exception e) {

                                lastException = e;

                                System.out.println(
                                                "Gemini API error.");

                                System.out.println(
                                                "Model: "
                                                                + model);

                                System.out.println(
                                                "Error: "
                                                                + e.getMessage());

                                System.out.println(
                                                "Moving immediately to next model...");

                                System.out.println(
                                                "----------------------------------------");
                        }
                }

                System.out.println(
                                "========================================");

                System.out.println(
                                "ALL GEMINI MODELS FAILED");

                System.out.println(
                                "========================================");

                throw new RuntimeException(
                                "All Gemini fallback models failed.",
                                lastException);
        }

        // =========================================================
        // 5. BENCHMARK ALL GEMINI MODELS
        // =========================================================

        private String benchmarkAllGeminiModels(
                        String requestBody) {

                System.out.println();
                System.out.println(
                                "========================================");

                System.out.println(
                                "STARTING GEMINI MODEL BENCHMARK");

                System.out.println(
                                "Testing every model exactly once");

                System.out.println(
                                "========================================");

                String fastestResponse = null;

                String fastestModel = null;

                long fastestTime = Long.MAX_VALUE;

                Exception lastException = null;

                for (String model : GEMINI_MODELS) {

                        System.out.println();
                        System.out.println(
                                        "----------------------------------------");

                        System.out.println(
                                        "Testing model: "
                                                        + model);

                        System.out.println(
                                        "----------------------------------------");

                        long startTime = System.currentTimeMillis();

                        try {

                                String response = callGemini(
                                                model,
                                                requestBody);

                                long endTime = System.currentTimeMillis();

                                long responseTime = endTime - startTime;

                                if (response != null
                                                && !response.trim().isEmpty()) {

                                        System.out.println(
                                                        "SUCCESS: "
                                                                        + model);

                                        System.out.println(
                                                        "Response time: "
                                                                        + responseTime
                                                                        + " ms");

                                        System.out.println(
                                                        "Response time: "
                                                                        + (responseTime
                                                                                        / 1000.0)
                                                                        + " seconds");

                                        /*
                                         * Store fastest successful response.
                                         */

                                        if (responseTime < fastestTime) {

                                                fastestTime = responseTime;

                                                fastestModel = model;

                                                fastestResponse = response;
                                        }

                                } else {

                                        System.out.println(
                                                        "FAILED: "
                                                                        + model
                                                                        + " returned empty response.");
                                }

                        } catch (Exception e) {

                                long endTime = System.currentTimeMillis();

                                long responseTime = endTime - startTime;

                                lastException = e;

                                System.out.println(
                                                "FAILED: "
                                                                + model);

                                System.out.println(
                                                "Time before failure: "
                                                                + responseTime
                                                                + " ms");

                                System.out.println(
                                                "Time before failure: "
                                                                + (responseTime
                                                                                / 1000.0)
                                                                + " seconds");

                                System.out.println(
                                                "Error: "
                                                                + e.getMessage());
                        }
                }

                // =====================================================
                // FINAL BENCHMARK RESULT
                // =====================================================

                System.out.println();
                System.out.println(
                                "========================================");

                System.out.println(
                                "GEMINI MODEL BENCHMARK RESULTS");

                System.out.println(
                                "========================================");

                if (fastestResponse != null) {

                        System.out.println(
                                        "FASTEST MODEL: "
                                                        + fastestModel);

                        System.out.println(
                                        "FASTEST RESPONSE TIME: "
                                                        + fastestTime
                                                        + " ms");

                        System.out.println(
                                        "FASTEST RESPONSE TIME: "
                                                        + (fastestTime
                                                                        / 1000.0)
                                                        + " seconds");

                } else {

                        System.out.println(
                                        "NO GEMINI MODEL RESPONDED SUCCESSFULLY.");
                }

                System.out.println(
                                "========================================");

                if (fastestResponse != null) {

                        return fastestResponse;
                }

                throw new RuntimeException(
                                "All Gemini benchmark models failed.",
                                lastException);
        }

        // =========================================================
        // 6. CALL ONE GEMINI MODEL
        // =========================================================

        private String callGemini(
                        String model,
                        String requestBody) {

                return webClient.post()

                                .uri(
                                                uriBuilder -> uriBuilder
                                                                .path(
                                                                                "/v1beta/models/"
                                                                                                + model
                                                                                                + ":generateContent")
                                                                .build())

                                .header(
                                                "x-goog-api-key",
                                                apiKey)

                                .header(
                                                "Content-Type",
                                                "application/json")

                                .bodyValue(
                                                requestBody)

                                .retrieve()

                                .onStatus(
                                                HttpStatusCode::isError,

                                                clientResponse -> clientResponse
                                                                .bodyToMono(
                                                                                String.class)
                                                                .map(
                                                                                errorBody -> new RuntimeException(
                                                                                                "Gemini API "
                                                                                                                + clientResponse
                                                                                                                                .statusCode()
                                                                                                                + " - "
                                                                                                                + errorBody)))

                                .bodyToMono(
                                                String.class)

                                .block();
        }

        // =========================================================
        // 7. SAVE ANALYSIS TO DATABASE
        // =========================================================

        private void saveAnalysis(
                        EmailRequest emailRequest,
                        EmailAnalysis analysis) {

                if (analysis == null) {

                        throw new RuntimeException(
                                        "Unable to save analysis because analysis is null.");
                }

                // =====================================================
                // GET CURRENTLY LOGGED-IN GOOGLE USER
                // =====================================================

                Authentication authentication = SecurityContextHolder
                                .getContext()
                                .getAuthentication();

                if (authentication == null
                                || !(authentication instanceof OAuth2AuthenticationToken)) {

                        throw new RuntimeException(
                                        "No authenticated Google user found.");
                }

                OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;

                OAuth2User oauth2User = oauthToken.getPrincipal();

                User currentUser = userService.getOrCreateUser(
                                oauth2User);

                // =====================================================
                // CREATE ANALYSIS ENTITY
                // =====================================================

                EmailAnalysisEntity entity = new EmailAnalysisEntity();

                // Associate analysis with logged-in user
                entity.setUser(
                                currentUser);

                // =====================================================
                // ORIGINAL EMAIL
                // =====================================================

                entity.setEmailContent(
                                emailRequest.getEmailContent());

                // =====================================================
                // AI SUMMARY
                // =====================================================

                entity.setSummary(
                                analysis.getSummary());

                // =====================================================
                // CATEGORY
                // =====================================================

                entity.setCategory(
                                analysis.getCategory());

                // =====================================================
                // PRIORITY
                // =====================================================

                entity.setPriority(
                                analysis.getPriority());

                // =====================================================
                // ACTION REQUIRED
                // =====================================================

                entity.setActionRequired(
                                analysis.isActionRequired());

                // =====================================================
                // ACTION
                // =====================================================

                entity.setAction(
                                analysis.getAction());

                // =====================================================
                // HUMAN-READABLE DEADLINE
                // =====================================================

                entity.setDeadline(
                                analysis.getDeadline());

                // =====================================================
                // MACHINE-READABLE DEADLINE
                // =====================================================

                String deadlineAt = analysis.getDeadlineAt();

                if (deadlineAt != null
                                && !deadlineAt.trim().isEmpty()) {

                        try {

                                LocalDateTime deadlineDateTime = LocalDateTime.parse(
                                                deadlineAt.trim());

                                entity.setDeadlineAt(
                                                deadlineDateTime);

                        } catch (Exception e) {

                                entity.setDeadlineAt(
                                                null);

                                System.out.println(
                                                "Invalid deadlineAt received from AI: "
                                                                + deadlineAt);
                        }

                } else {

                        entity.setDeadlineAt(
                                        null);
                }

                // =====================================================
                // AI SUGGESTED REPLY
                // =====================================================

                entity.setReply(
                                analysis.getReply());

                // =====================================================
                // ACTION STATUS
                // =====================================================

                if (analysis.isActionRequired()) {

                        entity.setStatus(
                                        "PENDING");

                } else {

                        entity.setStatus(
                                        "COMPLETED");
                }

                // =====================================================
                // CREATION TIME
                // =====================================================

                entity.setCreatedAt(
                                LocalDateTime.now(
                                                ZoneId.of(
                                                                "Asia/Kolkata")));

                // =====================================================
                // REMINDER FLAGS
                // =====================================================

                entity.setOneHourReminderSent(
                                false);

                entity.setTenMinuteReminderSent(
                                false);

                // =====================================================
                // SAVE TO POSTGRESQL
                // =====================================================

                emailAnalysisRepository.save(
                                entity);

                System.out.println(
                                "Email analysis successfully saved to PostgreSQL.");
        }

        // =========================================================
        // 8. EXTRACT NORMAL AI RESPONSE
        // =========================================================

        private String extractResponseContent(
                        String response) {

                try {

                        ObjectMapper mapper = new ObjectMapper();

                        JsonNode rootNode = mapper.readTree(
                                        response);

                        JsonNode candidates = rootNode.path(
                                        "candidates");

                        if (candidates.isMissingNode()
                                        || candidates.size() == 0) {

                                throw new RuntimeException(
                                                "Gemini response contains no candidates.");
                        }

                        return candidates
                                        .get(0)
                                        .path("content")
                                        .path("parts")
                                        .get(0)
                                        .path("text")
                                        .asString();

                } catch (Exception e) {

                        throw new RuntimeException(
                                        "Error processing Gemini reply: "
                                                        + e.getMessage(),
                                        e);
                }
        }

        // =========================================================
        // 9. EXTRACT EMAIL ANALYSIS
        // =========================================================

        private EmailAnalysis extractAnalysisResponse(
                        String response) {

                try {

                        ObjectMapper mapper = new ObjectMapper();

                        JsonNode rootNode = mapper.readTree(
                                        response);

                        JsonNode candidates = rootNode.path(
                                        "candidates");

                        if (candidates.isMissingNode()
                                        || candidates.size() == 0) {

                                throw new RuntimeException(
                                                "Gemini response contains no candidates.");
                        }

                        // -------------------------------------------------
                        // Extract AI-generated text
                        // -------------------------------------------------

                        String aiResponse = candidates
                                        .get(0)
                                        .path("content")
                                        .path("parts")
                                        .get(0)
                                        .path("text")
                                        .asString();

                        if (aiResponse == null
                                        || aiResponse.trim().isEmpty()) {

                                throw new RuntimeException(
                                                "Gemini returned empty analysis text.");
                        }

                        // -------------------------------------------------
                        // Remove accidental markdown fences
                        // -------------------------------------------------

                        aiResponse = aiResponse.trim();

                        if (aiResponse.startsWith(
                                        "```json")) {

                                aiResponse = aiResponse.substring(
                                                7);

                                aiResponse = aiResponse.trim();
                        }

                        if (aiResponse.startsWith(
                                        "```")) {

                                aiResponse = aiResponse.substring(
                                                3);

                                aiResponse = aiResponse.trim();
                        }

                        if (aiResponse.endsWith(
                                        "```")) {

                                aiResponse = aiResponse.substring(
                                                0,
                                                aiResponse.length()
                                                                - 3);

                                aiResponse = aiResponse.trim();
                        }

                        // -------------------------------------------------
                        // Convert JSON to EmailAnalysis
                        // -------------------------------------------------

                        return mapper.readValue(
                                        aiResponse,
                                        EmailAnalysis.class);

                } catch (Exception e) {

                        System.out.println(
                                        "Error while extracting analysis: "
                                                        + e.getMessage());

                        return null;
                }
        }

        // =========================================================
        // 10. PROMPT FOR REPLY GENERATION
        // =========================================================

        private String buildPrompt(
                        EmailRequest emailRequest) {

                StringBuilder prompt = new StringBuilder();

                prompt.append(
                                "You are an AI email assistant. "
                                                + "Generate one concise, professional, "
                                                + "context-aware email reply. "
                                                + "Return only the reply, without "
                                                + "explanations or multiple options. "
                                                + "Match the requested tone and do not "
                                                + "invent any information.");

                // -----------------------------------------------------
                // Tone
                // -----------------------------------------------------

                if (emailRequest.getTone() != null
                                && !emailRequest
                                                .getTone()
                                                .isEmpty()) {

                        prompt.append(
                                        "Use a ")
                                        .append(
                                                        emailRequest.getTone())
                                        .append(
                                                        " tone.");
                }

                // -----------------------------------------------------
                // Original email
                // -----------------------------------------------------

                prompt.append(
                                "Original Email : \n")
                                .append(
                                                emailRequest
                                                                .getEmailContent());

                return prompt.toString();
        }

        // =========================================================
        // 11. PROMPT FOR EMAIL ANALYSIS
        // =========================================================

        private String buildAnalysisPrompt(
                        EmailRequest emailRequest) {

                StringBuilder prompt = new StringBuilder();

                // =====================================================
                // CURRENT DATE AND TIME IN INDIA
                // =====================================================

                ZonedDateTime indiaNow = ZonedDateTime.now(
                                ZoneId.of(
                                                "Asia/Kolkata"));

                String currentDateTime = indiaNow.format(
                                DateTimeFormatter.ISO_LOCAL_DATE_TIME);

                prompt.append(
                                """
                                                You are an AI email intelligence assistant.

                                                Analyze the following email and return ONLY valid JSON.

                                                The current date and time in India (IST) is:
                                                """)
                                .append(
                                                currentDateTime)
                                .append(
                                                """

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
                                && !emailRequest
                                                .getTone()
                                                .isEmpty()) {

                        prompt.append(
                                        "\nThe reply should use a ")
                                        .append(
                                                        emailRequest.getTone())
                                        .append(
                                                        " tone.");
                }

                // =====================================================
                // ORIGINAL EMAIL
                // =====================================================

                prompt.append(
                                "\n\nOriginal Email:\n")
                                .append(
                                                emailRequest
                                                                .getEmailContent());

                return prompt.toString();
        }
}