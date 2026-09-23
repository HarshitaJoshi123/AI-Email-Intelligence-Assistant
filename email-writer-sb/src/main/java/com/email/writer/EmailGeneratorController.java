package com.email.writer;

import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/email")
@AllArgsConstructor
public class EmailGeneratorController {

    private EmailGeneratorService emailGeneratorService;
    private EmailAnalysisRepository emailAnalysisRepository;
    private TelegramNotificationService telegramNotificationService;
    private UserService userService;


    // =========================================================
    // 1. EXISTING FUNCTIONALITY - GENERATE EMAIL REPLY
    // =========================================================

    @PostMapping("/generate")
    public ResponseEntity<String> generateEmail(
            @RequestBody EmailRequest emailRequest) {

        String response =
                emailGeneratorService.generateEmailReply(emailRequest);

        return ResponseEntity.ok(response);
    }


    // =========================================================
    // 2. ANALYZE EMAIL
    // =========================================================

    @PostMapping("/analyze")
    public ResponseEntity<EmailAnalysis> analyzeEmail(
            @RequestBody EmailRequest emailRequest) {

        EmailAnalysis response =
                emailGeneratorService.generateEmailAnalysis(emailRequest);

        return ResponseEntity.ok(response);
    }


    // =========================================================
    // 3. FETCH ONLY THE LOGGED-IN USER'S ANALYSES
    // =========================================================

    @GetMapping("/analyses")
    public ResponseEntity<List<EmailAnalysisEntity>> getAllAnalyses() {

        User currentUser = getCurrentUser();

        List<EmailAnalysisEntity> analyses =
                emailAnalysisRepository.findByUser(currentUser);

        return ResponseEntity.ok(analyses);
    }


    // =========================================================
    // 4. UPDATE ACTION STATUS
    // =========================================================

    @PutMapping("/analyses/{id}/status")
    public ResponseEntity<EmailAnalysisEntity> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {

        User currentUser = getCurrentUser();

        EmailAnalysisEntity analysis =
                emailAnalysisRepository.findById(id)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Email analysis not found"
                                )
                        );


        // Make sure the analysis belongs to the logged-in user
        if (analysis.getUser() == null
                || !analysis.getUser().getId()
                        .equals(currentUser.getId())) {

            return ResponseEntity.status(403).build();
        }


        analysis.setStatus(status.toUpperCase());

        EmailAnalysisEntity updatedAnalysis =
                emailAnalysisRepository.save(analysis);

        return ResponseEntity.ok(updatedAnalysis);
    }


    // =========================================================
    // 5. TEST TELEGRAM NOTIFICATION
    // =========================================================
    // Sends to the LOGGED-IN user's own chat id, not one shared
    // destination, so this can't be used to spam another user's
    // (or the developer's) Telegram.

    @PostMapping("/telegram/test")
    public ResponseEntity<String> testTelegram() {

        User currentUser = getCurrentUser();

        if (!telegramNotificationService.isConfiguredForUser(currentUser)) {
            return ResponseEntity.status(400).body(
                    "Connect and enable Telegram in your settings first."
            );
        }

        telegramNotificationService.sendMailMindAlert(
                currentUser.getTelegramChatId(),
                "HIGH",
                "Review this MailMind Telegram test alert",
                "Today"
        );

        return ResponseEntity.ok(
                "Telegram test notification sent successfully."
        );
    }


    // =========================================================
    // 5b. GET / UPDATE THE LOGGED-IN USER'S TELEGRAM SETTINGS
    // =========================================================

    @GetMapping("/telegram/settings")
    public ResponseEntity<TelegramSettingsResponse> getTelegramSettings() {

        User currentUser = getCurrentUser();

        return ResponseEntity.ok(
                new TelegramSettingsResponse(
                        currentUser.getTelegramChatId(),
                        currentUser.isTelegramNotificationsEnabled()
                )
        );
    }

    @PutMapping("/telegram/settings")
    public ResponseEntity<TelegramSettingsResponse> updateTelegramSettings(
            @RequestBody TelegramSettingsRequest request) {

        User currentUser = getCurrentUser();

        User updated = userService.updateTelegramSettings(
                currentUser,
                request.telegramChatId(),
                request.telegramNotificationsEnabled()
        );

        return ResponseEntity.ok(
                new TelegramSettingsResponse(
                        updated.getTelegramChatId(),
                        updated.isTelegramNotificationsEnabled()
                )
        );
    }

    public record TelegramSettingsRequest(
            String telegramChatId,
            boolean telegramNotificationsEnabled) {
    }

    public record TelegramSettingsResponse(
            String telegramChatId,
            boolean telegramNotificationsEnabled) {
    }


    // =========================================================
    // 6. GET CURRENT LOGGED-IN USER
    // =========================================================

    private User getCurrentUser() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();


        if (authentication == null
                || !(authentication instanceof OAuth2AuthenticationToken oauthToken)) {

            throw new RuntimeException(
                    "No authenticated Google user found."
            );
        }


        OAuth2User oauth2User =
                oauthToken.getPrincipal();


        return userService.getOrCreateUser(oauth2User);
    }
}