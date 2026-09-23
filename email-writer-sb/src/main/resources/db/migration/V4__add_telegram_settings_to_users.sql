-- Per-user Telegram destination, so notifications go to the
-- user who owns the email, not one hardcoded chat id.

ALTER TABLE users
ADD COLUMN telegram_chat_id VARCHAR(255);

ALTER TABLE users
ADD COLUMN telegram_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE;
