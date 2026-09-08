import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api.js';

const QUESTIONS = [
  { key: 'network_reliability', label: 'How reliable was the network connection?' },
  { key: 'transaction_speed', label: 'How fast was your transaction?' },
  { key: 'cash_availability', label: 'Was cash readily available?' },
  { key: 'security', label: 'How secure did you feel at this ATM?' },
  { key: 'overall_satisfaction', label: 'Overall, how satisfied were you?' },
];

export default function FeedbackForm() {
  const [searchParams] = useSearchParams();
  const [machine, setMachine] = useState(searchParams.get('machine') || '');
  const [ratings, setRatings] = useState({});
  const [comment, setComment] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState(null); // null | 'submitting' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const allAnswered = machine.trim() && QUESTIONS.every((q) => ratings[q.key]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!allAnswered) return;
    setStatus('submitting');
    try {
      await api.post('/feedback', {
        machine: machine.trim().toUpperCase(),
        ...ratings,
        comment: comment || undefined,
        contact: contact || undefined,
      });
      setStatus('success');
      setRatings({});
      setComment('');
      setContact('');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h2 style={{ marginTop: 0 }}>Rate your ATM experience</h2>
      <p className="helper-text">
        Scanned right after your transaction — this takes under a minute and helps GCB fix
        recurring issues at this machine.
      </p>

      {status === 'success' && (
        <div className="banner success">Thank you! Your feedback has been recorded.</div>
      )}
      {status === 'error' && <div className="banner error">{errorMsg}</div>}

      <form className="stacked" onSubmit={handleSubmit}>
        <label>
          ATM code (printed on the receipt / screen)
          <input
            value={machine}
            onChange={(e) => setMachine(e.target.value)}
            placeholder="e.g. ATM-ACC-01"
            required
          />
        </label>

        {QUESTIONS.map((q) => (
          <label key={q.key}>
            {q.label}
            <div className="rating-scale">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={ratings[q.key] === n ? 'selected' : ''}
                  onClick={() => setRatings((r) => ({ ...r, [q.key]: n }))}
                  aria-label={`${q.label}: ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </label>
        ))}

        <label>
          Comment (optional)
          <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>

        <label>
          Phone number (optional, for follow-up)
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="024..." />
        </label>

        <button className="btn-primary" type="submit" disabled={!allAnswered || status === 'submitting'}>
          {status === 'submitting' ? 'Submitting…' : 'Submit feedback'}
        </button>
      </form>
    </div>
  );
}
