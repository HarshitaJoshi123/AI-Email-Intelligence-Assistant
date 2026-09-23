import './LandingPage.css';
import heroImage from './assets/hero.png';

function LandingPage({ onLogin }) {
  const features = [
    {
      icon: '⚡',
      title: 'Instant triage',
      text: 'AI reads every email the moment it lands and sorts it by real priority — not just who sent it.',
    },
    {
      icon: '✍️',
      title: 'Smart replies',
      text: 'One-click, context-aware reply drafts written in your tone, ready to send in seconds.',
    },
    {
      icon: '⏰',
      title: 'Never miss a deadline',
      text: 'Deadlines buried in email threads are surfaced automatically and tracked until done.',
    },
  ];

  return (
    <div className="landing">
      <div className="landing-glow landing-glow-a" />
      <div className="landing-glow landing-glow-b" />

      <header className="landing-nav">
        <div className="landing-brand">
          <div className="landing-brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M4 7L12 13L20 7" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="18.5" cy="6.5" r="3" fill="#A5B4FC" stroke="white" strokeWidth="0.9" />
            </svg>
          </div>
          Mail<span>Mind</span>
        </div>

        <button className="landing-nav-cta" onClick={onLogin}>
          Sign in
        </button>
      </header>

      <main className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-badge">✨ AI-powered inbox intelligence</div>

          <h1>
            Your inbox,
            <br />
            <span className="landing-highlight">finally organized.</span>
          </h1>

          <p>
            MailMind reads, prioritizes and drafts replies to your email so
            you only spend time on what actually matters. Sign in with
            Google and see your first insights in seconds.
          </p>

          <div className="landing-actions">
            <button className="landing-google-btn" onClick={onLogin}>
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.6 4.5-5.9 7.7-11.3 7.7-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.4-5.4C34.5 5.4 29.6 3.4 24 3.4 12.7 3.4 3.4 12.7 3.4 24S12.7 44.6 24 44.6 44.6 35.3 44.6 24c0-1.2-.1-2.4-.3-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l5.9 4.3C13.8 15.3 18.5 12.4 24 12.4c3.1 0 5.8 1.1 8 2.9l5.4-5.4C34.5 6.4 29.6 4.4 24 4.4c-7.4 0-13.8 4.2-17 10.3z" />
                <path fill="#4CAF50" d="M24 44.6c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4c-2 1.4-4.7 2.3-7.6 2.3-5.4 0-9.9-3.6-11.6-8.5l-6.5 5C9.9 39.8 16.4 44.6 24 44.6z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.2-2.2 4.1-4 5.5l6.6 5.4c3.9-3.6 6.3-8.9 6.3-15.5 0-1.2-.1-2.4-.6-3.5z" />
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="landing-subnote">
            Free to use · No credit card required
          </p>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-visual-card">
            <img src={heroImage} alt="" className="landing-hero-img" />
          </div>
        </div>
      </main>

      <section className="landing-features">
        {features.map((f) => (
          <div className="landing-feature-card" key={f.title}>
            <div className="landing-feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="landing-footer">
        MailMind · AI Email Intelligence
      </footer>
    </div>
  );
}

export default LandingPage;
