import { useEffect, useMemo, useState } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [completedActions, setCompletedActions] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPriority, setHistoryPriority] = useState('ALL');

  const API_URL = 'http://localhost:8080/api/email';

  // =========================================================
  // FETCH ANALYSES
  // =========================================================

  const fetchAnalyses = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_URL}/analyses`);
      const data = response.data;

      setAnalyses(data);

      const completed = {};

      data.forEach((email) => {
        completed[email.id] = email.status === 'COMPLETED';
      });

      setCompletedActions(completed);
    } catch (err) {
      console.error(err);
      setError('Unable to load your email insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, []);

  // =========================================================
  // STATISTICS
  // =========================================================

  const totalEmails = analyses.length;

  const highPriority = analyses.filter(
    (email) => email.priority === 'HIGH'
  ).length;

  const mediumPriority = analyses.filter(
    (email) => email.priority === 'MEDIUM'
  ).length;

  const lowPriority = analyses.filter(
    (email) => email.priority === 'LOW'
  ).length;

  // Only pending actions are counted
  const actionRequired = analyses.filter(
    (email) =>
      email.actionRequired &&
      email.status !== 'COMPLETED'
  ).length;

  // =========================================================
  // DEADLINE HELPERS
  // =========================================================

  const getDeadlineDate = (email) => {
    if (!email.deadlineAt) {
      return null;
    }

    const date = new Date(email.deadlineAt);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  };

  const isSameDay = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isTomorrow = (deadlineDate) => {
    const tomorrow = new Date();

    tomorrow.setDate(tomorrow.getDate() + 1);

    return isSameDay(deadlineDate, tomorrow);
  };

  const getDeadlineStatus = (email) => {
    const deadlineDate = getDeadlineDate(email);

    if (!deadlineDate) {
      return {
        label: 'No exact deadline',
        type: 'upcoming'
      };
    }

    const now = new Date();

    if (deadlineDate < now) {
      return {
        label: 'Overdue',
        type: 'overdue'
      };
    }

    if (isSameDay(deadlineDate, now)) {
      return {
        label: 'Due Today',
        type: 'today'
      };
    }

    if (isTomorrow(deadlineDate)) {
      return {
        label: 'Tomorrow',
        type: 'tomorrow'
      };
    }

    return {
      label: 'Upcoming',
      type: 'upcoming'
    };
  };

  // Only pending emails with real machine-readable deadlines
  const deadlineEmails = useMemo(() => {
    return analyses
      .filter(
        (email) =>
          email.deadlineAt &&
          email.status !== 'COMPLETED'
      )
      .sort((a, b) => {
        return (
          new Date(a.deadlineAt) -
          new Date(b.deadlineAt)
        );
      });
  }, [analyses]);

  const upcomingDeadlines = deadlineEmails.length;

  // Keep main dashboard focused
  const recentAnalyses = useMemo(
    () => analyses.slice(0, 5),
    [analyses]
  );

  const visibleDeadlineEmails = useMemo(
    () => deadlineEmails.slice(0, 5),
    [deadlineEmails]
  );

  // =========================================================
  // HISTORY
  // =========================================================

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    return analyses.filter((email) => {
      const matchesPriority =
        historyPriority === 'ALL' ||
        email.priority === historyPriority;

      const searchableText = [
        email.category,
        email.summary,
        email.action,
        email.emailContent,
        email.deadline
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        matchesPriority &&
        (!query || searchableText.includes(query))
      );
    });
  }, [
    analyses,
    historySearch,
    historyPriority
  ]);

  // =========================================================
  // CATEGORY DATA
  // =========================================================

  const categoryData = useMemo(() => {
    const counts = {};

    analyses.forEach((email) => {
      const category = email.category || 'OTHER';

      counts[category] =
        (counts[category] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [analyses]);

  // =========================================================
  // PRIORITY CHART
  // =========================================================

  const getPercentage = (value) => {
    if (totalEmails === 0) {
      return 0;
    }

    return Math.round(
      (value / totalEmails) * 100
    );
  };

  const highPercentage =
    getPercentage(highPriority);

  const mediumPercentage =
    getPercentage(
      highPriority + mediumPriority
    );

  const priorityChartStyle = {
    background: `conic-gradient(
      #ef4444 0% ${highPercentage}%,
      #f59e0b ${highPercentage}% ${mediumPercentage}%,
      #22c55e ${mediumPercentage}% 100%
    )`
  };

  // =========================================================
  // ACTION STATUS
  // =========================================================

  const toggleAction = async (emailId) => {
    const currentStatus =
      completedActions[emailId] || false;

    const newCompletedStatus =
      !currentStatus;

    const newStatus =
      newCompletedStatus
        ? 'COMPLETED'
        : 'PENDING';

    // Update UI immediately
    setCompletedActions((previous) => ({
      ...previous,
      [emailId]: newCompletedStatus
    }));

    try {
      // Save status in PostgreSQL
      await axios.put(
        `${API_URL}/analyses/${emailId}/status`,
        null,
        {
          params: {
            status: newStatus
          }
        }
      );

      // Update local email
      setAnalyses((previous) =>
        previous.map((email) =>
          email.id === emailId
            ? {
                ...email,
                status: newStatus
              }
            : email
        )
      );

      // Update modal if open
      setSelectedEmail((previous) =>
        previous &&
        previous.id === emailId
          ? {
              ...previous,
              status: newStatus
            }
          : previous
      );
    } catch (err) {
      console.error(
        'Unable to update email status:',
        err
      );

      // Rollback checkbox
      setCompletedActions((previous) => ({
        ...previous,
        [emailId]: currentStatus
      }));

      alert(
        'Unable to update action status. Please try again.'
      );
    }
  };

  // =========================================================
  // STYLING HELPERS
  // =========================================================

  const getPriorityClass = (priority) => {
    if (priority === 'HIGH') {
      return 'high';
    }

    if (priority === 'MEDIUM') {
      return 'medium';
    }

    return 'low';
  };

  // =========================================================
  // DATE FORMATTING
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return '';
    }

    return new Date(date).toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    );
  };

  const formatDeadlineDateTime = (deadlineAt) => {
    if (!deadlineAt) {
      return '';
    }

    const date = new Date(deadlineAt);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }
    );
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <header className="topbar">
        <div className="topbar-inner">

          <div className="brand">
            <div className="brand-icon">
              M
            </div>

            <div>
              <div className="brand-name">
                MailMind
              </div>

              <div className="brand-tagline">
                AI Email Intelligence
              </div>
            </div>
          </div>

          <div className="topbar-right">

            <button
              className="refresh-button"
              onClick={fetchAnalyses}
              title="Refresh"
            >
              ↻
            </button>

            <div className="user-profile">

              <div className="avatar">
                H
              </div>

              <div className="user-info">
                <span>Harshita</span>

                <small>
                  Personal workspace
                </small>
              </div>

            </div>

          </div>

        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="main-content">

        {/* WELCOME */}

        <section className="welcome-section">

          <div>
            <p className="eyebrow">
              EMAIL OVERVIEW
            </p>

            <h1>
              Stay on top of what matters.
            </h1>

            <p className="welcome-text">
              Your important emails, actions and
              deadlines — organized by AI.
            </p>
          </div>

          <div className="live-status">
            <span className="status-dot"></span>
            AI Intelligence Active
          </div>

        </section>

        {/* ===================================================
            STAT CARDS
        =================================================== */}

        <section className="stats-grid">

          <div className="stat-card">

            <div className="stat-icon blue">
              ✉
            </div>

            <div className="stat-content">

              <span>
                Total Emails
              </span>

              <strong>
                {totalEmails}
              </strong>

              <small>
                Analyzed emails
              </small>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon red">
              !
            </div>

            <div className="stat-content">

              <span>
                High Priority
              </span>

              <strong>
                {highPriority}
              </strong>

              <small>
                Need attention
              </small>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon purple">
              ✓
            </div>

            <div className="stat-content">

              <span>
                Action Required
              </span>

              <strong>
                {actionRequired}
              </strong>

              <small>
                Pending actions
              </small>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon orange">
              ◷
            </div>

            <div className="stat-content">

              <span>
                Deadlines
              </span>

              <strong>
                {upcomingDeadlines}
              </strong>

              <small>
                Need tracking
              </small>

            </div>

          </div>

        </section>

        {/* ===================================================
            LOADING
        =================================================== */}

        {loading && (

          <div className="loading-state">

            <div className="loader"></div>

            <p>
              Loading your email intelligence...
            </p>

          </div>

        )}

        {/* ===================================================
            ERROR
        =================================================== */}

        {!loading && error && (

          <div className="error-state">

            <div className="error-icon">
              !
            </div>

            <p>
              {error}
            </p>

            <button
              onClick={fetchAnalyses}
            >
              Try Again
            </button>

          </div>

        )}

        {/* ===================================================
            DASHBOARD CONTENT
        =================================================== */}

        {!loading && !error && (

          <>

            {/* =================================================
                OVERVIEW
            ================================================= */}

            <section className="overview-grid">

              {/* CATEGORY */}

              <div className="panel">

                <div className="panel-header">

                  <div>

                    <h2>
                      Email Overview
                    </h2>

                    <p>
                      Distribution by category
                    </p>

                  </div>

                  <span className="panel-badge">
                    {totalEmails} emails
                  </span>

                </div>

                {categoryData.length === 0 ? (

                  <div className="empty-small">
                    No category data yet.
                  </div>

                ) : (

                  <div className="category-list">

                    {categoryData.map(
                      ([category, count]) => {

                        const percentage =
                          totalEmails === 0
                            ? 0
                            : Math.round(
                                (count /
                                  totalEmails) *
                                  100
                              );

                        return (

                          <div
                            className="category-row"
                            key={category}
                          >

                            <div className="category-name">

                              <span className="category-dot"></span>

                              {category}

                            </div>

                            <div className="category-bar-wrapper">

                              <div
                                className="category-bar"
                                style={{
                                  width:
                                    `${percentage}%`
                                }}
                              ></div>

                            </div>

                            <span className="category-count">
                              {count}
                            </span>

                          </div>

                        );
                      }
                    )}

                  </div>

                )}

              </div>

              {/* PRIORITY */}

              <div className="panel">

                <div className="panel-header">

                  <div>

                    <h2>
                      Priority Overview
                    </h2>

                    <p>
                      How your inbox is looking
                    </p>

                  </div>

                </div>

                <div className="priority-content">

                  <div
                    className="priority-chart"
                    style={priorityChartStyle}
                  >

                    <div className="priority-chart-inner">

                      <strong>
                        {totalEmails}
                      </strong>

                      <span>
                        emails
                      </span>

                    </div>

                  </div>

                  <div className="priority-legend">

                    <div className="legend-item">

                      <span className="legend-dot high"></span>

                      <span>
                        High
                      </span>

                      <strong>
                        {highPriority}
                      </strong>

                    </div>

                    <div className="legend-item">

                      <span className="legend-dot medium"></span>

                      <span>
                        Medium
                      </span>

                      <strong>
                        {mediumPriority}
                      </strong>

                    </div>

                    <div className="legend-item">

                      <span className="legend-dot low"></span>

                      <span>
                        Low
                      </span>

                      <strong>
                        {lowPriority}
                      </strong>

                    </div>

                  </div>

                </div>

              </div>

            </section>

            {/* =================================================
                RECENT INTELLIGENCE
            ================================================= */}

            <section className="emails-section">

              <div className="section-title-row">

                <div>

                  <p className="eyebrow">
                    YOUR EMAILS
                  </p>

                  <h2>
                    Recent Intelligence
                  </h2>

                </div>

                <div className="section-actions">

                  <span className="email-count">
                    {totalEmails} analyzed
                  </span>

                  {totalEmails > 5 && (

                    <button
                      className="view-all-button"
                      onClick={() =>
                        setHistoryOpen(true)
                      }
                    >
                      View all →
                    </button>

                  )}

                </div>

              </div>

              {analyses.length === 0 ? (

                <div className="empty-state">

                  <div className="empty-icon">
                    ✉
                  </div>

                  <h3>
                    No analyzed emails yet
                  </h3>

                  <p>
                    Use AI Analyze from the Gmail
                    extension to start building
                    your email intelligence.
                  </p>

                </div>

              ) : (

                <div className="email-list">

                  {recentAnalyses.map((email) => {

                    const completed =
                      completedActions[email.id] ||
                      false;

                    return (

                      <div
                        className={`email-row ${
                          completed
                            ? 'completed'
                            : ''
                        }`}
                        key={email.id}
                        onClick={() =>
                          setSelectedEmail(email)
                        }
                      >

                        <div className="email-avatar">
                          {email.category
                            ? email.category.charAt(0)
                            : 'E'}
                        </div>

                        <div className="email-main">

                          <div className="email-top-line">

                            <h3>
                              {email.category ||
                                'Email'}
                            </h3>

                            <span
                              className={`priority-badge ${
                                getPriorityClass(
                                  email.priority
                                )
                              }`}
                            >
                              {email.priority}
                            </span>

                          </div>

                          <p className="email-summary">
                            {email.summary}
                          </p>

                          <div className="email-meta">

                            <span>
                              {email.category}
                            </span>

                            {email.deadline && (

                              <>

                                <span className="meta-separator">
                                  •
                                </span>

                                <span className="deadline-text">
                                  ◷ {email.deadline}
                                </span>

                              </>

                            )}

                          </div>

                        </div>

                        <div
                          className="email-action"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >

                          {email.actionRequired ? (

                            <label
                              className={`action-check ${
                                completed
                                  ? 'done'
                                  : ''
                              }`}
                            >

                              <input
                                type="checkbox"
                                checked={completed}
                                onChange={() =>
                                  toggleAction(
                                    email.id
                                  )
                                }
                              />

                              <span className="custom-checkbox">
                                {completed
                                  ? '✓'
                                  : ''}
                              </span>

                              <span className="action-label">
                                {completed
                                  ? 'Completed'
                                  : 'Mark done'}
                              </span>

                            </label>

                          ) : (

                            <span className="no-action">
                              No action
                            </span>

                          )}

                        </div>

                        <div className="email-arrow">
                          →
                        </div>

                      </div>

                    );

                  })}

                </div>

              )}

            </section>

            {/* =================================================
                DEADLINE TRACKER
            ================================================= */}

            {deadlineEmails.length > 0 && (

              <section className="deadline-section">

                <div className="section-title-row">

                  <div>

                    <p className="eyebrow">
                      ACTION TRACKER
                    </p>

                    <h2>
                      Deadline Tracker
                    </h2>

                  </div>

                  {deadlineEmails.length > 5 && (

                    <button
                      className="view-all-button"
                      onClick={() =>
                        setHistoryOpen(true)
                      }
                    >
                      View all →
                    </button>

                  )}

                </div>

                <div className="deadline-list">

                  {visibleDeadlineEmails.map((email) => {

                    const deadlineStatus =
                      getDeadlineStatus(email);

                    const completed =
                      completedActions[email.id] ||
                      false;

                    return (

                      <div
                        className="deadline-card"
                        key={email.id}
                      >

                        <div className="deadline-icon">
                          ◷
                        </div>

                        <div className="deadline-info">

                          <strong>
                            {email.action ||
                              'Review this email'}
                          </strong>

                          <span>
                            {email.category} ·{' '}
                            {email.priority} priority
                          </span>

                        </div>

                        <div
                          className={`deadline-time deadline-${deadlineStatus.type}`}
                        >

                          <span className="deadline-status">
                            {deadlineStatus.label}
                          </span>

                          <strong className="deadline-original">
                            {email.deadline}
                          </strong>

                          <small className="deadline-exact">
                            {formatDeadlineDateTime(
                              email.deadlineAt
                            )}
                          </small>

                        </div>

                        {/* MARK DEADLINE TASK AS DONE */}

                        <div
                          className="deadline-action"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >

                          <label
                            className={`action-check ${
                              completed
                                ? 'done'
                                : ''
                            }`}
                            title={
                              completed
                                ? 'Mark as pending'
                                : 'Mark as done'
                            }
                          >

                            <input
                              type="checkbox"
                              checked={completed}
                              onChange={() =>
                                toggleAction(
                                  email.id
                                )
                              }
                            />

                            <span className="custom-checkbox">
                              {completed
                                ? '✓'
                                : ''}
                            </span>

                            <span className="action-label">
                              {completed
                                ? 'Completed'
                                : 'Mark done'}
                            </span>

                          </label>

                        </div>

                      </div>

                    );

                  })}

                </div>

              </section>

            )}

          </>

        )}

      </main>

      {/* =====================================================
          ALL ANALYZED EMAILS
      ===================================================== */}

      {historyOpen && (

        <div
          className="modal-overlay"
          onClick={() =>
            setHistoryOpen(false)
          }
        >

          <div
            className="history-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="history-header">

              <div>

                <span className="modal-label">
                  EMAIL HISTORY
                </span>

                <h2>
                  All Analyzed Emails
                </h2>

                <p>
                  Search your complete MailMind
                  intelligence history.
                </p>

              </div>

              <button
                className="close-button"
                onClick={() =>
                  setHistoryOpen(false)
                }
              >
                ×
              </button>

            </div>

            <div className="history-controls">

              <input
                className="history-search"
                type="search"
                placeholder="Search emails, actions, categories..."
                value={historySearch}
                onChange={(event) =>
                  setHistorySearch(
                    event.target.value
                  )
                }
              />

              <div className="history-filters">

                {[
                  'ALL',
                  'HIGH',
                  'MEDIUM',
                  'LOW'
                ].map((priority) => (

                  <button
                    key={priority}
                    className={`history-filter ${
                      historyPriority === priority
                        ? 'active'
                        : ''
                    }`}
                    onClick={() =>
                      setHistoryPriority(
                        priority
                      )
                    }
                  >
                    {priority === 'ALL'
                      ? 'All'
                      : priority}
                  </button>

                ))}

              </div>

            </div>

            <div className="history-list">

              {filteredHistory.length === 0 ? (

                <div className="history-empty">
                  No emails match your search.
                </div>

              ) : (

                filteredHistory.map((email) => {

                  const completed =
                    completedActions[email.id] ||
                    false;

                  return (

                    <div
                      className={`history-row ${
                        completed
                          ? 'completed'
                          : ''
                      }`}
                      key={email.id}
                      onClick={() => {
                        setHistoryOpen(false);
                        setSelectedEmail(email);
                      }}
                    >

                      <span className="history-avatar">
                        {(email.category || 'E')
                          .charAt(0)}
                      </span>

                      <div className="history-main">

                        <div className="history-title">

                          <span>
                            {email.category ||
                              'Email'}
                          </span>

                          <span
                            className={`priority-badge ${
                              getPriorityClass(
                                email.priority
                              )
                            }`}
                          >
                            {email.priority}
                          </span>

                        </div>

                        <span className="history-summary">
                          {email.summary ||
                            'No summary available'}
                        </span>

                        {email.deadline && (

                          <span className="history-deadline">
                            ◷ {email.deadline}
                          </span>

                        )}

                      </div>

                      <div
                        className="history-status"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >

                        {email.actionRequired ? (

                          <label
                            className={`action-check ${
                              completed
                                ? 'done'
                                : ''
                            }`}
                          >

                            <input
                              type="checkbox"
                              checked={completed}
                              onChange={() =>
                                toggleAction(
                                  email.id
                                )
                              }
                            />

                            <span className="custom-checkbox">
                              {completed
                                ? '✓'
                                : ''}
                            </span>

                            <span className="action-label">
                              {completed
                                ? 'Completed'
                                : 'Mark done'}
                            </span>

                          </label>

                        ) : (

                          <span className="no-action">
                            No action
                          </span>

                        )}

                      </div>

                      <span className="email-arrow">
                        →
                      </span>

                    </div>

                  );

                })

              )}

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          EMAIL DETAIL MODAL
      ===================================================== */}

      {selectedEmail && (

        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedEmail(null)
          }
        >

          <div
            className="email-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <span className="modal-label">
                  EMAIL INSIGHT
                </span>

                <h2>
                  {selectedEmail.category ||
                    'Email'}
                </h2>

              </div>

              <button
                className="close-button"
                onClick={() =>
                  setSelectedEmail(null)
                }
              >
                ×
              </button>

            </div>

            <div className="modal-tags">

              <span className="category-badge">
                {selectedEmail.category}
              </span>

              <span
                className={`priority-badge ${
                  getPriorityClass(
                    selectedEmail.priority
                  )
                }`}
              >
                {selectedEmail.priority} PRIORITY
              </span>

            </div>

            {/* SUMMARY */}

            <div className="detail-block">

              <span className="detail-label">
                SUMMARY
              </span>

              <p>
                {selectedEmail.summary}
              </p>

            </div>

            {/* ORIGINAL EMAIL */}

            <div className="detail-block">

              <span className="detail-label">
                ORIGINAL EMAIL
              </span>

              <div className="original-email">
                {selectedEmail.emailContent}
              </div>

            </div>

            {/* ACTION */}

            {selectedEmail.actionRequired && (

              <div className="detail-action">

                <div>

                  <span className="detail-label">
                    ACTION REQUIRED
                  </span>

                  <p>
                    {selectedEmail.action}
                  </p>

                </div>

                <label
                  className={`action-check modal-action-check ${
                    completedActions[
                      selectedEmail.id
                    ]
                      ? 'done'
                      : ''
                  }`}
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >

                  <input
                    type="checkbox"
                    checked={
                      completedActions[
                        selectedEmail.id
                      ] || false
                    }
                    onChange={() =>
                      toggleAction(
                        selectedEmail.id
                      )
                    }
                  />

                  <span className="custom-checkbox">
                    {completedActions[
                      selectedEmail.id
                    ]
                      ? '✓'
                      : ''}
                  </span>

                  <span className="action-label">
                    {completedActions[
                      selectedEmail.id
                    ]
                      ? 'Completed'
                      : 'Mark as done'}
                  </span>

                </label>

              </div>

            )}

            {/* DEADLINE */}

            {selectedEmail.deadline && (

              <div className="detail-deadline">

                <span>
                  ◷
                </span>

                <div>

                  <small>
                    DEADLINE
                  </small>

                  <strong>
                    {selectedEmail.deadline}
                  </strong>

                  {selectedEmail.deadlineAt && (

                    <small>
                      {formatDeadlineDateTime(
                        selectedEmail.deadlineAt
                      )}
                    </small>

                  )}

                </div>

              </div>

            )}

            {/* AI REPLY */}

            <div className="detail-block reply-preview">

              <span className="detail-label">
                AI SUGGESTED REPLY
              </span>

              <p>
                {selectedEmail.reply}
              </p>

            </div>

            {/* FOOTER */}

            <div className="modal-footer">

              <span>
                Analyzed{' '}
                {formatDate(
                  selectedEmail.createdAt
                )}
              </span>

              <button
                className="modal-done-button"
                onClick={() =>
                  setSelectedEmail(null)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;