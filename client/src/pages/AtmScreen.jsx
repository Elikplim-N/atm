import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api.js';
import logo from '../assets/gcb-logo.png';

const QUICK_TAGS = [
  'Cash dispensed quickly',
  'Fast transaction speed',
  'Card returned smoothly',
  'Clean ATM booth',
  'Felt secure & safe',
  'Receipt printed clearly',
  'Network was slow',
  'Low cash warning',
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
    new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  );

  // Mobile orientation detection
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [dismissOrientationWarning, setDismissOrientationWarning] = useState(false);

  // Screen flow: 'idle' (welcome/attract) -> 'rating' (post-tx feedback prompt) -> 'thankyou' (confirmation)
  const [screenState, setScreenState] = useState('rating');
  const [enclosureMode, setEnclosureMode] = useState(true); // show ATM hardware bezel

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

  // Detect mobile portrait orientation
  useEffect(() => {
    function checkOrientation() {
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      const isNarrow = window.innerWidth <= 860;
      setIsPortraitMobile(isPortrait && isNarrow);
    }
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
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
        // Fallback demo machine
        setCurrentMachine({ code: machineCode, branch_name: 'Accra Main Branch', region: 'Greater Accra' });
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
        comment: selectedTags.length > 0 ? `ATM Screen Kiosk: ${selectedTags.join(', ')}` : 'ATM Screen Kiosk One-Touch Rating',
      });
      setScreenState('thankyou');
    } catch (err) {
      console.error('Failed to submit ATM feedback:', err);
      // Still show thank you on screen so customer is never stuck at terminal
      setScreenState('thankyou');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="atm-kiosk-page">
      {/* Mobile Portrait Orientation Prompt */}
      {isPortraitMobile && !dismissOrientationWarning && (
        <div className="atm-orientation-overlay">
          <div className="atm-orientation-card">
            <div className="phone-rotate-anim">
              <svg viewBox="0 0 80 80" className="rotate-device-icon" fill="none">
                <rect x="24" y="10" width="32" height="60" rx="6" stroke="#d4a017" strokeWidth="3.5" />
                <circle cx="40" cy="62" r="2.5" fill="#d4a017" />
                <line x1="34" y1="16" x2="46" y2="16" stroke="#d4a017" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M62 26 C72 38, 72 48, 62 60" stroke="#63b3ed" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 3" />
                <polygon points="60,62 68,58 65,67" fill="#63b3ed" />
              </svg>
            </div>
            <span className="orientation-chip">ATM HARDWARE SCREEN</span>
            <h3>Please Turn Your Screen Horizontal</h3>
            <p>
              Bank ATM screens operate on horizontal (landscape) monitors.
              Rotate your phone horizontally to experience the real ATM touch terminal.
            </p>
            <div className="orientation-btn-group">
              <button
                type="button"
                className="btn-rotate-mobile"
                onClick={() => navigate(`/feedback?machine=${machineCode}`)}
              >
                📱 Open Mobile Form Instead
              </button>
              <button
                type="button"
                className="btn-rotate-dismiss"
                onClick={() => setDismissOrientationWarning(true)}
              >
                View in Portrait Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Simulator Controls Toolbar */}
      <div className="atm-kiosk-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-label">ATM Terminal Simulator</span>
          <select
            value={machineCode}
            onChange={(e) => handleMachineChange(e.target.value)}
            className="atm-select"
          >
            {machines.map((m) => (
              <option key={m.id || m.code} value={m.code}>
                {m.code} — {m.branch_name || m.name || 'Branch'}
              </option>
            ))}
          </select>
        </div>
        <div className="toolbar-right">
          <button
            className={`toolbar-btn ${enclosureMode ? 'active' : ''}`}
            onClick={() => setEnclosureMode(!enclosureMode)}
          >
            {enclosureMode ? '🖥️ Fullscreen Kiosk Mode' : '🏧 ATM Machine Bezel'}
          </button>
          <button
            className="toolbar-btn reset"
            onClick={() => setScreenState('rating')}
          >
            🔄 Trigger Post-Transaction Prompt
          </button>
        </div>
      </div>

      {/* Main ATM Machine / Kiosk Housing */}
      <div className={`atm-enclosure ${enclosureMode ? 'has-bezel' : 'borderless'}`}>
        {/* Physical ATM Top Fascia (Bezel mode) */}
        {enclosureMode && (
          <div className="atm-fascia">
            <div className="atm-fascia-brand">
              <img src={logo} alt="GCB Bank" className="fascia-logo" />
              <div>
                <div className="fascia-bank-name">GCB BANK PLC</div>
                <div className="fascia-sub">24 HOUR AUTOMATED TELLER MACHINE</div>
              </div>
            </div>
            <div className="atm-security-camera">
              <div className="camera-lens"></div>
              <span>SECURITY SURVEILLANCE ACTIVE</span>
            </div>
          </div>
        )}

        {/* ATM Screen Display Unit */}
        <div className="atm-screen-container">
          {/* ATM Screen Status Header */}
          <div className="atm-screen-header">
            <div className="atm-brand-badge">
              <img src={logo} alt="GCB" className="screen-logo" />
              <span>GCB BANK</span>
            </div>
            <div className="atm-screen-info">
              <span className="atm-machine-badge">{machineCode}</span>
              <span className="atm-branch-name">
                {currentMachine?.branch_name || 'Accra Main'}
              </span>
            </div>
            <div className="atm-screen-datetime">
              <span>{currentDate}</span>
              <span className="atm-clock">{clock}</span>
            </div>
          </div>

          {/* SCREEN CONTENT: 1. Post-Transaction Rating Screen */}
          {screenState === 'rating' && (
            <div className="atm-screen-body">
              {/* Transaction Eject Alert Banner */}
              <div className="atm-tx-banner">
                <div className="tx-icon">✓</div>
                <div className="tx-details">
                  <div className="tx-title">TRANSACTION COMPLETED ({txReceiptNumber})</div>
                  <div className="tx-sub">Please retrieve your Cash and Card from the dispenser below</div>
                </div>
              </div>

              <div className="atm-content-split">
                {/* Left Side: On-Screen Touch Feedback */}
                <div className="atm-touch-panel">
                  <div className="panel-heading">
                    <span className="step-tag">QUICK FEEDBACK</span>
                    <h2>How was your ATM experience today?</h2>
                    <p>Touch a rating to help GCB Bank maintain peak service quality.</p>
                  </div>

                  {/* 5 Big Touch Rating Cards */}
                  <div className="atm-rating-grid">
                    {[
                      { val: 5, label: 'Excellent', emoji: '🌟', sub: 'Fast & flawless' },
                      { val: 4, label: 'Good', emoji: '👍', sub: 'Satisfactory' },
                      { val: 3, label: 'Average', emoji: '😐', sub: 'Acceptable' },
                      { val: 2, label: 'Poor', emoji: '👎', sub: 'Slow or issues' },
                      { val: 1, label: 'Very Poor', emoji: '⚠️', sub: 'Failed or error' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        className={`atm-rating-card ${overallRating === item.val ? 'selected' : ''}`}
                        onClick={() => {
                          setOverallRating(item.val);
                          // If tapping 5 stars directly, auto-select sub-metrics
                          setSubRatings({
                            network_reliability: item.val,
                            transaction_speed: item.val,
                            cash_availability: item.val,
                            security: item.val,
                          });
                        }}
                      >
                        <span className="rating-emoji">{item.emoji}</span>
                        <span className="rating-label">{item.label}</span>
                        <span className="rating-stars">{'★'.repeat(item.val)}</span>
                        <span className="rating-sub">{item.sub}</span>
                      </button>
                    ))}
                  </div>

                  {/* Quick Tags / Reasons */}
                  <div className="atm-tags-section">
                    <span className="tags-label">Quickly tap any that apply:</span>
                    <div className="tags-chips">
                      {QUICK_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`atm-tag-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
                          onClick={() => handleTagToggle(tag)}
                        >
                          {selectedTags.includes(tag) ? '✓ ' : '+ '}
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="atm-actions-row">
                    <button
                      type="button"
                      className="atm-btn-submit"
                      disabled={submitting}
                      onClick={() => submitAtmRating(overallRating)}
                    >
                      {submitting ? 'RECORDING RATING...' : 'TOUCH TO SUBMIT RATING →'}
                    </button>
                    <button
                      type="button"
                      className="atm-btn-skip"
                      onClick={() => setScreenState('idle')}
                    >
                      Skip & Finish
                    </button>
                  </div>
                </div>

                {/* Right Side: Mobile QR Option */}
                <div className="atm-mobile-panel">
                  <div className="mobile-panel-header">
                    <span className="mobile-badge">MOBILE OPTION</span>
                    <h3>Prefer your phone?</h3>
                    <p>Scan with your phone camera to give detailed feedback or report an issue privately.</p>
                  </div>

                  <div className="atm-qr-card">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="ATM Mobile Feedback QR" className="atm-screen-qr" />
                    ) : (
                      <div className="qr-placeholder">Generating QR...</div>
                    )}
                    <div className="qr-caption">
                      <strong>Point Camera Here</strong>
                      <span>Direct link to {machineCode}</span>
                    </div>
                  </div>

                  <div className="atm-ussd-card">
                    <div className="ussd-dial-badge">OFFLINE / USSD</div>
                    <div className="ussd-text">
                      No smartphone? Dial <strong>*920#</strong> on any phone and select <strong>ATM Feedback</strong>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN CONTENT: 2. Thank You Screen with Countdown */}
          {screenState === 'thankyou' && (
            <div className="atm-screen-body atm-thankyou-screen">
              <div className="thankyou-content">
                <div className="thankyou-badge">✓ FEEDBACK RECEIVED</div>
                <h1>Thank you for banking with GCB Bank!</h1>
                <p className="thankyou-desc">
                  Your rating for <strong>{machineCode}</strong> has been logged to the branch operations dashboard.
                  Your input keeps our ATMs stocked with cash, secure, and reliable across Ghana.
                </p>

                <div className="thankyou-kpi-pill">
                  <span>Logged at: {clock}</span>
                  <span>•</span>
                  <span>Rating: {'★'.repeat(overallRating)} ({overallRating}/5)</span>
                  <span>•</span>
                  <span>Branch: {currentMachine?.branch_name || 'Accra Main'}</span>
                </div>

                <div className="thankyou-countdown-box">
                  <div className="countdown-label">
                    Screen automatically resetting in <strong>{countdown}s</strong>
                  </div>
                  <div className="countdown-progress-bar">
                    <div
                      className="countdown-progress-fill"
                      style={{ width: `${(countdown / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <button
                  type="button"
                  className="atm-btn-touch-return"
                  onClick={() => setScreenState('idle')}
                >
                  Touch Screen to Return to Welcome
                </button>
              </div>
            </div>
          )}

          {/* SCREEN CONTENT: 3. Welcome / Idle Attract Screen */}
          {screenState === 'idle' && (
            <div className="atm-screen-body atm-welcome-screen">
              <div className="welcome-hero">
                <img src={logo} alt="GCB Bank" className="welcome-logo" />
                <h1>WELCOME TO GCB BANK</h1>
                <p className="welcome-tagline">Your Bank for Life • Available 24/7</p>

                <div className="welcome-instructions-card">
                  <div className="instruction-item">
                    <span className="inst-icon">💳</span>
                    <span>Please Insert Your GCB or Gh-Link ATM Card</span>
                  </div>
                  <div className="instruction-item">
                    <span className="inst-icon">🔒</span>
                    <span>Shield Keypad While Entering Your 4-Digit PIN</span>
                  </div>
                  <div className="instruction-item">
                    <span className="inst-icon">📱</span>
                    <span>Cardless / Mobile Money Withdrawal Available</span>
                  </div>
                </div>

                <div className="welcome-demo-trigger">
                  <button
                    className="atm-btn-submit"
                    onClick={() => setScreenState('rating')}
                  >
                    Simulate Customer Completing Cash Withdrawal →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ATM Screen Footer / Ticker */}
          <div className="atm-screen-footer">
            <div className="footer-status-pills">
              <span className="status-pill ok">● Cash Dispenser: READY</span>
              <span className="status-pill ok">● Card Reader: ONLINE</span>
              <span className="status-pill ok">● Network Link: SECURE</span>
            </div>
            <div className="footer-help">
              GCB 24/7 Toll-Free: <strong>0800 422 422</strong> | WhatsApp: <strong>020 242 2422</strong>
            </div>
          </div>
        </div>

        {/* Physical ATM Bottom Hardware Panel (Bezel mode) */}
        {enclosureMode && (
          <div className="atm-hardware-panel">
            <div className="slot-group">
              <div className="hw-slot card-slot">
                <div className="slot-light green"></div>
                <div className="slot-opening"></div>
                <span>CARD INSERTION</span>
              </div>
              <div className="hw-slot receipt-slot">
                <div className="slot-opening wide"></div>
                <span>RECEIPT</span>
              </div>
            </div>

            <div className="hw-cash-dispenser">
              <div className="dispenser-shutter">
                <div className="cash-light green"></div>
                <div className="shutter-door">CASH DISPENSER</div>
              </div>
              <span>TAKE CASH HERE</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
