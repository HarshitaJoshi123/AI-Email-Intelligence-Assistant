ALTER TABLE email_analyses
ADD COLUMN user_id BIGINT;

ALTER TABLE email_analyses
ADD CONSTRAINT fk_email_analysis_user
FOREIGN KEY (user_id)
REFERENCES users(id);