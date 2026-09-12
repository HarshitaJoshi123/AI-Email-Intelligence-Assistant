package com.email.writer;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EmailAnalysisRepository
        extends JpaRepository<EmailAnalysisEntity, Long> {

    @Query("""
            SELECT e FROM EmailAnalysisEntity e
            WHERE e.deadlineAt IS NOT NULL
              AND (e.status IS NULL OR UPPER(e.status) <> 'COMPLETED')
            """)
    List<EmailAnalysisEntity> findPendingWithDeadline();
}
