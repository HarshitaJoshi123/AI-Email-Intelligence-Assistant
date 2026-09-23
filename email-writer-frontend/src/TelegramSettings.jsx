import { useEffect, useState } from 'react';
import axios from 'axios';

/*
 * Lets the logged-in user connect their own Telegram chat id and
 * turn reminders on/off for themselves, instead of every user's
 * deadline reminders going to one hardcoded chat.
 *
 * Rendered as a simple modal from Dashboard.jsx. Uses inline
 * styles so it doesn't depend on Dashboard's existing CSS classes.
 */
function TelegramSettings({ apiUrl, onClose }) {
  const [chatId, setChatId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const response = await axios.get(
          `${apiUrl}/telegram/settings`,
          { withCredentials: true }
        );

        if (cancelled) return;

        setChatId(response.data?.telegramChatId || '');
        setEnabled(!!response.data?.telegramNotificationsEnabled);
      } catch (error) {
        console.error('Unable to load Telegram settings:', error);
        if (!cancelled) {
          setMessageIsError(true);
          setMessage('Could not load your Telegram settings.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await axios.put(
        `${apiUrl}/telegram/settings`,
        {
          telegramChatId: chatId.trim(),
          telegramNotificationsEnabled: enabled,
        },
        { withCredentials: true }
      );

      setChatId(response.data?.telegramChatId || '');
      setEnabled(!!response.data?.telegramNotificationsEnabled);
      setMessageIsError(false);
      setMessage('Saved.');
    } catch (error) {
      console.error('Unable to save Telegram settings:', error);
      setMessageIsError(true);
      setMessage('Could not save your Telegram settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage('');

    try {
      const response = await axios.post(
        `${apiUrl}/telegram/test`,
        {},
        { withCredentials: true }
      );

      setMessageIsError(false);
      setMessage(response.data || 'Test notification sent.');
    } catch (error) {
      console.error('Telegram test failed:', error);
      setMessageIsError(true);
      setMessage(
        error?.response?.data || 'Could not send a test notification.'
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          width: 'min(420px, 90vw)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>
          Telegram Notifications
        </h2>

        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
          Deadline reminders will be sent to this chat, and only this
          chat — not shared with any other user.
        </p>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Your Telegram chat id
            </label>

            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="e.g. 123456789"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />

            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#94a3b8' }}>
              Don't know your chat id? Open Telegram, search for{' '}
              <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer">
                @userinfobot
              </a>
              , tap Start, and it'll reply with your id — paste that here.
              Also open Telegram, search for{' '}
              <a href="https://t.me/mailmind_reminder_bot" target="_blank" rel="noopener noreferrer">
                @mailmind_reminder_bot
              </a>
              , and tap Start — otherwise MailMind won't be able to message you.
            </p>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Enable deadline reminders on Telegram
            </label>

            {message && (
              <p
                style={{
                  fontSize: 13,
                  color: messageIsError ? '#dc2626' : '#16a34a',
                  marginBottom: 12,
                }}
              >
                {message}
              </p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={handleTest}
                disabled={testing || !chatId.trim()}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                {testing ? 'Sending…' : 'Send test'}
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#4f46e5',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>

              <button
                onClick={onClose}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TelegramSettings;
