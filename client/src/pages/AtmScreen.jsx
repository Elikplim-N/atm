import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api.js';
import logo from '../assets/gcb-logo.png';

const QUICK_TAGS = [
  'Cash dispensed promptly',
  'Fast transaction speed',
  'Card returned smoothly',
  'Clean & well-lit booth',
  'Felt safe and secure',
  'Receipt printed clearly',
  'Network was slow',
  'Low cash warning',
];

const RATING_LEVELS = [
  { val: 5, label: 'Excellent', stars: '★★★★★', desc: 'Fast, smooth and reliable' },
  { val: 4, label: 'Good', stars: '★★★★☆', desc: 'Satisfactory service' },
  { val: 3, label: 'Average', stars: '★★★☆☆', desc: 'Acceptable experience' },
  { val: 2, label: 'Poor', stars: '★★☆☆☆', desc: 'Noticeable delays or issues' },
  { val: 1, label: 'Very Poor', stars: '★☆☆☆☆', desc: 'Failed transaction or error' },
];

export default function AtmScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const machineParam = searchParams.get('machine') || 'ATM-ACC-01';

  const [machineCode, setMachineCode] = useState(machineParam.toUpperCase());
  const [machines, setMachines] = useState([]);
  const [currentMachine, setCurrentMachine] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [feedbackUrl, setFeedbackUrl] = useState('');
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  const [currentDate, setCurrentDate] = useState(
    new Date().toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  );

  // Screen flow: 'rating' (post-tx feedback prompt) | 'thankyou' | 'idle' (welcome screen)
  const [screenState, setScreenState] = useState('rating');

  // Feedback form state
  const [overallRating, setOverallRating] = useState(5);
  const [subRatings, setSubRatings] = useState({
    network_reliability: 5,
    transaction_speed: 5,
    cash_availability: 5,
    security: 5,
  });
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [txReceiptNumber] = useState(() => `TXN-${Math.floor(100000 + Math.random() * 900000)}`);

  const timerRef = useRef(null);

  // Keep clock running
  useEffect(() => {
    const interval = setInterval(() => {
      setClock(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch machines list for switcher
  useEffect(() => {
    api
      .get('/machines')
      .then(({ data }) => {
        setMachines(data || []);
        const found = (data || []).find((m) => m.code === machineCode);
        if (found) setCurrentMachine(found);
      })
      .catch(() => {
        setCurrentMachine({
          code: machineCode,
          branch_name: 'Accra Main Branch',
          region: 'Greater Accra',
        });
      });
  }, [machineCode]);

  // Fetch QR Code for this machine
  useEffect(() => {
    api
      .get(`/machines/${machineCode}/qrcode`)
      .then(({ data }) => {
        setQrDataUrl(data.qrDataUrl);
        setFeedbackUrl(data.url);
      })
      .catch(() => {
        const fallbackUrl = `${window.location.origin}/feedback?machine=${machineCode}`;
        setFeedbackUrl(fallbackUrl);
      });
  }, [machineCode]);

  // Countdown when on Thank You screen
  useEffect(() => {
    if (screenState === 'thankyou') {
      setCountdown(10);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setScreenState('idle');
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screenState]);

  function handleMachineChange(newCode) {
    setMachineCode(newCode);
    setSearchParams({ machine: newCode });
    setScreenState('rating');
  }

  function handleTagToggle(tag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function submitAtmRating(ratingVal) {
    const finalRating = ratingVal || overallRating;
    setSubmitting(true);
    try {
      await api.post('/feedback', {
        machine: machineCode,
        channel: 'web',
        overall_satisfaction: finalRating,
        network_reliability: subRatings.network_reliability,
        transaction_speed: subRatings.transaction_speed,
        cash_availability: subRatings.cash_availability,
        security: subRatings.security,
        comment:
          selectedTags.length > 0
            ? `ATM Kiosk: ${selectedTags.join(', ')}`
            : 'ATM Kiosk On-Screen Feedback',
      });
      setScreenState('thankyou');
    } catch (err) {
      console.error('Failed to submit ATM feedback:', err);
      setScreenState('thankyou');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="clean-atm-view">
      {/* Discreet Terminal Toolbar for Testing & Machine Selection */}
      <div className="clean-atm-topbar">
        <div className="clean-topbar-left">
          <span className="clean-terminal-badge">Terminal Kiosk</span>
          <label htmlFor="atm-select" className="sr-only">Select ATM Machine</label>
          <select
            id="atm-select"
            value={machineCode}
            onChange={(e) => handleMachineChange(e.target.value)}
            className="clean-atm-select"
          >
            {machines.map((m) => (
              <option key={m.id || m.code} value={m.code}>
                {m.code} — {m.branch_name || m.name || 'Branch'}
              </option>
            ))}
          </select>
        </div>
        <div className="clean-topbar-right">
          <button
            type="button"
            className="clean-action-link"
            onClick={() => setScreenState('rating')}
          >
            Simulate Transaction Prompt
          </button>
          <button
            type="button"
            className="clean-action-link"
            onClick={() => navigate(`/feedback?machine=${machineCode}`)}
          >
            Open Mobile View
          </button>
        </div>
      </div>

      {/* Main Clean Professional ATM Screen */}
      <div className="clean-atm-container">
        {/* Professional Bank Header */}
        <header className="clean-atm-header">
          <div className="clean-header-brand">
            <img src={logo} alt="GCB Bank" className="clean-bank-logo" />
            <div className="clean-bank-details">
              <span className="clean-bank-name">GCB BANK PLC</span>
              <span className="clean-terminal-sub">
                ATM Service Quality Monitoring • {machineCode}
              </span>
            </div>
          </div>
          <div className="clean-header-meta">
            <div className="clean-branch-pill">
              <span className="status-dot-green"></span>
              {currentMachine?.branch_name || 'Accra Main Branch'}
            </div>
            <div className="clean-clock-box">
              <span className="clean-date">{currentDate}</span>
              <span className="clean-time">{clock}</span>
            </div>
          </div>
        </header>

        {/* SCREEN STATE 1: Post-Transaction Service Quality Rating */}
        {screenState === 'rating' && (
          <main className="clean-atm-main">
            {/* Transaction Success Alert */}
            <div className="clean-tx-banner">
              <div className="clean-tx-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="clean-tx-text">
                <strong>Transaction Complete ({txReceiptNumber})</strong>
                <span>Please collect your card and cash from the slots.</span>
              </div>
            </div>

            {/* Split Content: On-Screen Touch (Left) & Mobile QR Code (Right) */}
            <div className="clean-content-grid">
              {/* Left: On-Screen Touch Feedback */}
              <section className="clean-feedback-section">
                <div className="clean-section-header">
                  <h2>How was your ATM experience today?</h2>
                  <p>
                    Please rate your service to help GCB Bank maintain high ATM availability and reliability.
                  </p>
                </div>

                {/* Clean Rating Cards */}
                <div className="clean-rating-list">
                  {RATING_LEVELS.map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      className={`clean-rating-btn ${overallRating === item.val ? 'active' : ''}`}
                      onClick={() => {
                        setOverallRating(item.val);
                        setSubRatings({
                          network_reliability: item.val,
                          transaction_speed: item.val,
                          cash_availability: item.val,
                          security: item.val,
                        });
                      }}
                    >
                      <div className="rating-btn-left">
                        <span className="rating-btn-stars">{item.stars}</span>
                        <span className="rating-btn-label">{item.label}</span>
                      </div>
                      <span className="rating-btn-desc">{item.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Quick Feedback Tags */}
                <div className="clean-tags-wrapper">
                  <span className="clean-tags-title">Quick reasons (optional):</span>
                  <div className="clean-tags-container">
                    {QUICK_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`clean-tag-button ${selectedTags.includes(tag) ? 'selected' : ''}`}
                        onClick={() => handleTagToggle(tag)}
                      >
                        {selectedTags.includes(tag) ? '✓ ' : ''}{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Action Row */}
                <div className="clean-actions">
                  <button
                    type="button"
                    className="clean-btn-primary"
                    disabled={submitting}
                    onClick={() => submitAtmRating(overallRating)}
                  >
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                  <button
                    type="button"
                    className="clean-btn-secondary"
                    onClick={() => setScreenState('idle')}
                  >
                    Skip & Return
                  </button>
                </div>
              </section>

              {/* Right: Clean Mobile QR Section */}
              <aside className="clean-mobile-section">
                <div className="clean-qr-card">
                  <span className="clean-qr-tag">Prefer Your Phone?</span>
                  <h3>Scan to Rate on Mobile</h3>
                  <p>
                    Use your phone camera to complete this survey or report an issue privately.
                  </p>

                  <div className="clean-qr-frame">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt={`QR Code for ${machineCode}`} className="clean-qr-image" />
                    ) : (
                      <div className="clean-qr-loading">Generating QR...</div>
                    )}
                  </div>

                  <div className="clean-qr-footer">
                    <span className="qr-machine-id">Terminal: {machineCode}</span>
                    <span className="qr-url-text">{feedbackUrl || window.location.origin}</span>
                  </div>
                </div>

                <div className="clean-ussd-info">
                  <div className="clean-ussd-icon">📱</div>
                  <div>
                    <strong>USSD Service Available</strong>
                    <p>Dial <code>*920#</code> from any mobile phone and select <em>ATM Feedback</em>.</p>
                  </div>
                </div>
              </aside>
            </div>
          </main>
        )}

        {/* SCREEN STATE 2: Clean Professional Thank You Confirmation */}
        {screenState === 'thankyou' && (
          <main className="clean-atm-main clean-center-state">
            <div className="clean-thankyou-box">
              <div className="clean-success-icon">
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h1>Thank You for Banking with GCB Bank</h1>
              <p className="clean-thankyou-lead">
                Your feedback for terminal <strong>{machineCode}</strong> has been logged to branch operations.
                We appreciate your time in helping us maintain dependable banking services.
              </p>

              <div className="clean-audit-chip">
                <span>Rating: {'★'.repeat(overallRating)} ({overallRating}/5)</span>
                <span>•</span>
                <span>Logged at: {clock}</span>
                <span>•</span>
                <span>{currentMachine?.branch_name || 'Accra Main Branch'}</span>
              </div>

              <div className="clean-countdown-area">
                <span className="clean-countdown-text">
                  Returning to Welcome Screen in <strong>{countdown} seconds</strong>
                </span>
                <div className="clean-countdown-track">
                  <div
                    className="clean-countdown-fill"
                    style={{ width: `${(countdown / 10) * 100}%` }}
                  ></div>
                </div>
              </div>

              <button
                type="button"
                className="clean-btn-primary"
                onClick={() => setScreenState('idle')}
              >
                Return to Welcome Screen
              </button>
            </div>
          </main>
        )}

        {/* SCREEN STATE 3: Clean Welcome / Idle Screen */}
        {screenState === 'idle' && (
          <main className="clean-atm-main clean-center-state">
            <div className="clean-welcome-card">
              <img src={logo} alt="GCB Bank" className="clean-welcome-logo" />
              <h1>Welcome to GCB Bank</h1>
              <p className="clean-welcome-tag">Your Bank for Life • 24/7 ATM Services</p>

              <div className="clean-guidance-list">
                <div className="clean-guidance-item">
                  <span className="clean-guidance-bullet">1</span>
                  <span>Insert your GCB, Visa, Mastercard, or Gh-Link card</span>
                </div>
                <div className="clean-guidance-item">
                  <span className="clean-guidance-bullet">2</span>
                  <span>Enter your secret 4-digit PIN while shielding the keypad</span>
                </div>
                <div className="clean-guidance-item">
                  <span className="clean-guidance-bullet">3</span>
                  <span>Select Cash Withdrawal, Balance Inquiry, or Mobile Money</span>
                </div>
              </div>

              <div className="clean-welcome-actions">
                <button
                  type="button"
                  className="clean-btn-primary"
                  onClick={() => setScreenState('rating')}
                >
                  Simulate Cash Dispense & Complete Transaction →
                </button>
              </div>
            </div>
          </main>
        )}

        {/* Professional Clean Footer */}
        <footer className="clean-atm-footer">
          <div className="clean-footer-support">
            <span>24/7 Contact Centre: <strong>0800 422 422</strong> (Toll-Free) | WhatsApp: <strong>020 242 2422</strong></span>
          </div>
          <div className="clean-footer-legal">
            <span>GCB Bank PLC • Regulated by Bank of Ghana</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
