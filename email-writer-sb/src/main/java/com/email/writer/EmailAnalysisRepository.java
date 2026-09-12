package com.email.writer;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailAnalysisRepository
        extends JpaRepository<EmailAnalysisEntity, Long> {
}