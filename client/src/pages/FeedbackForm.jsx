import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api.js';

const QUESTIONS = [
  { key: 'network_reliability', label: 'How reliable was the network?' },
  { key: 'transaction_speed', label: 'How fast was your transaction?' },
  { key: 'cash_availability', label: 'Was cash readily available?' },
  { key: 'security', label: 'How secure did you feel here?' },
  { key: 'overall_satisfaction', label: 'Overall, how satisfied were you?' },
];

const ADVANCE_DELAY_MS = 320;

export default function FeedbackForm() {
  const [searchParams] = useSearchParams();
  const prefilled = searchParams.get('machine') || '';

  const [machine, setMachine] = useState(prefilled);
  const [machineConfirmed, setMachineConfirmed] = useState(!!prefilled);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [ratings, setRatings] = useState({});
  const [onExtras, setOnExtras] = useState(false);
  const [comment, setComment] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState(null); // null | 'submitting' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  function selectRating(key, value) {
    setRatings((r) => ({ ...r, [key]: value }));
    setTimeout(() => {
      if (questionIndex < QUESTIONS.length - 1) {
        setQuestionIndex((i) => i + 1);
      } else {
        setOnExtras(true);
      }
    }, ADVANCE_DELAY_MS);
  }

  function goBack() {
    if (onExtras) {
      setOnExtras(false);
      return;
    }
    if (questionIndex > 0) {
      setQuestionIndex((i) => i - 1);
    } else {
      setMachineConfirmed(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    try {
      await api.post('/feedback', {
        machine: machine.trim().toUpperCase(),
        ...ratings,
        comment: comment || undefined,
        contact: contact || undefined,
      });
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  function startOver() {
    setMachine(prefilled);
    setMachineConfirmed(!!prefilled);
    setQuestionIndex(0);
    setRatings({});
    setOnExtras(false);
    setComment('');
    setContact('');
    setStatus(null);
  }

  const stepsTotal = QUESTIONS.length + 1; // +1 for the extras/submit step
  const stepNow = onExtras ? stepsTotal : questionIndex + 1;
  const progressPct = Math.round((stepNow / stepsTotal) * 100);

  return (
    <div style={{ maxWidth: 460 }}>
      <div className="brand-hero">
        <p className="eyebrow">Customer feedback</p>
        <h1>Rate your ATM experience</h1>
        <p>30 seconds — one tap per question.</p>
      </div>

      <div className="card form-card">
        {status === 'success' ? (
          <div className="feedback-done">
            <div className="feedback-done-icon">✓</div>
            <h2>Thank you</h2>
            <p className="helper-text">
              Your feedback for <strong>{machine.toUpperCase()}</strong> has been sent to the
              branch team responsible for this machine.
            </p>
            <button className="btn-secondary" onClick={startOver}>
              Submit another response
            </button>
          </div>
        ) : (
          <>
            {status === 'error' && <div className="banner error">{errorMsg}</div>}

            {!machineConfirmed ? (
              <form
                className="stacked"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (machine.trim()) setMachineConfirmed(true);
                }}
              >
                <label>
                  ATM code (printed on your receipt or the machine screen)
                  <input
                    autoFocus
                    value={machine}
                    onChange={(e) => setMachine(e.target.value)}
                    placeholder="e.g. ATM-ACC-01"
                    required
                  />
                </label>
                <button className="btn-primary" type="submit" disabled={!machine.trim()}>
                  Start
                </button>
              </form>
            ) : (
              <>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="step-row">
                  <button type="button" className="link-back" onClick={goBack}>
                    ← Back
                  </button>
                  <span className="helper-text">
                    {onExtras ? 'Last step' : `Question ${questionIndex + 1} of ${QUESTIONS.length}`}
                  </span>
                </div>

                {!onExtras ? (
                  <div className="question-step">
                    <h2>{QUESTIONS[questionIndex].label}</h2>
                    <div className="rating-scale rating-scale-lg">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          type="button"
                          key={n}
                          className={ratings[QUESTIONS[questionIndex].key] === n ? 'selected' : ''}
                          onClick={() => selectRating(QUESTIONS[questionIndex].key, n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="rating-scale-labels">
                      <span>Poor</span>
                      <span>Excellent</span>
                    </div>
                  </div>
                ) : (
                  <form className="stacked" onSubmit={handleSubmit}>
                    <label>
                      Anything you'd like to add? (optional)
                      <textarea
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Tell us more…"
                      />
                    </label>
                    <label>
                      Phone number (optional, for follow-up)
                      <input
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="024…"
                      />
                    </label>
                    <button className="btn-primary" type="submit" disabled={status === 'submitting'}>
                      {status === 'submitting' ? 'Submitting…' : 'Submit feedback'}
                    </button>
                  </form>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
