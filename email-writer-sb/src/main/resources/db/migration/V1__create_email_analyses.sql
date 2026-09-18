CREATE TABLE email_analyses (
    id BIGSERIAL PRIMARY KEY,
    email_content TEXT,
    summary TEXT,
    category VARCHAR(255),
    priority VARCHAR(255),
    action_required BOOLEAN NOT NULL,
    action TEXT,
    deadline VARCHAR(255),
    deadline_at TIMESTAMP,
    status VARCHAR(255),
    reply TEXT,
    created_at TIMESTAMP,
    one_hour_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    ten_minute_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE
);
