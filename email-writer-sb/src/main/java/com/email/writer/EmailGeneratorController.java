package com.email.writer;

import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/email")
@AllArgsConstructor
@CrossOrigin(origins = "*")
public class EmailGeneratorController {

    private EmailGeneratorService emailGeneratorService;

    private EmailAnalysisRepository emailAnalysisRepository;

    private TwilioWhatsAppService twilioWhatsAppService;


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
    // 3. FETCH SAVED EMAIL ANALYSES
    // =========================================================

    @GetMapping("/analyses")
    public ResponseEntity<List<EmailAnalysisEntity>> getAllAnalyses() {

        List<EmailAnalysisEntity> analyses =
                emailAnalysisRepository.findAll();

        return ResponseEntity.ok(analyses);
    }


    // =========================================================
    // 4. UPDATE ACTION STATUS
    // =========================================================

    @PutMapping("/analyses/{id}/status")
    public ResponseEntity<EmailAnalysisEntity> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {

        EmailAnalysisEntity analysis =
                emailAnalysisRepository.findById(id)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Email analysis not found"
                                )
                        );

        analysis.setStatus(status.toUpperCase());

        EmailAnalysisEntity updatedAnalysis =
                emailAnalysisRepository.save(analysis);

        return ResponseEntity.ok(updatedAnalysis);
    }


    // =========================================================
    // 5. TEST WHATSAPP NOTIFICATION
    // =========================================================

    @PostMapping("/whatsapp/test")
    public ResponseEntity<String> testWhatsApp() {

        String testMessage =
                "🔔 MailMind Test Alert\n\n"
                        + "This is a test WhatsApp notification "
                        + "from MailMind.";

        String messageSid =
                twilioWhatsAppService.sendWhatsAppMessage(
                        testMessage
                );

        return ResponseEntity.ok(
                "WhatsApp test notification sent successfully. "
                        + "Message SID: "
                        + messageSid
        );
    }
}