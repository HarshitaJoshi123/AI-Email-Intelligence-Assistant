package com.email.writer;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EmailAnalysisRepository
        extends JpaRepository<EmailAnalysisEntity, Long> {

    // =========================================================
    // FETCH ONLY ONE USER'S EMAIL ANALYSES
    // =========================================================

    List<EmailAnalysisEntity> findByUser(User user);


    // =========================================================
    // FETCH PENDING ANALYSES WITH DEADLINES
    // Used by DeadlineReminderScheduler
    // =========================================================

    @Query("""
            SELECT e FROM EmailAnalysisEntity e
            JOIN FETCH e.user u
            WHERE e.deadlineAt IS NOT NULL
              AND (e.status IS NULL OR UPPER(e.status) <> 'COMPLETED')
              AND u.telegramNotificationsEnabled = true
            """)
    List<EmailAnalysisEntity> findPendingWithDeadline();
}