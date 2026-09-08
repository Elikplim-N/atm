import { useEffect, useState } from 'react';
import api from '../api.js';

function UssdPanel() {
  const [sessionId] = useState(() => `sim-${Date.now()}`);
  const [phone] = useState('0244000000');
  const [steps, setSteps] = useState([]);
  const [input, setInput] = useState('');
  const [screen, setScreen] = useState('Dial *920# to start the GCB ATM Feedback USSD session.');
  const [ended, setEnded] = useState(false);
  const [started, setStarted] = useState(false);

  async function send(nextSteps) {
    const text = nextSteps.join('*');
    const { data } = await api.post(
      '/ussd',
      new URLSearchParams({ sessionId, phoneNumber: phone, text }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const isEnd = data.startsWith('END');
    setScreen(data.replace(/^(CON|END)\s/, ''));
    setEnded(isEnd);
  }

  async function start() {
    setStarted(true);
    await send([]);
  }

  async function submitInput(e) {
    e.preventDefault();
    if (!input.trim() || ended) return;
    const nextSteps = [...steps, input.trim()];
    setSteps(nextSteps);
    setInput('');
    await send(nextSteps);
  }

  return (
    <div className="card">
      <h3 className="section-title">USSD simulator</h3>
      <p className="helper-text">
        Mimics a telco USSD gateway callback (e.g. Africa's Talking): the API replies with
        <code> CON</code> to continue the session or <code>END</code> to close it.
      </p>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div className="phone-mock">{started ? screen : 'Press "Dial" to begin'}</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          {!started ? (
            <button className="btn-primary" onClick={start}>
              Dial *920#
            </button>
          ) : ended ? (
            <p className="helper-text">Session ended. Refresh the page to start a new one.</p>
          ) : (
            <form className="stacked" onSubmit={submitInput}>
              <label>
                Your reply
                <input
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your answer…"
                />
              </label>
              <button className="btn-primary" type="submit">
                Send
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function SmsPanel() {
  const [from, setFrom] = useState('0244000000');
  const [text, setText] = useState('ATM ATM-ACC-01 5 4 5 5 5');
  const [reply, setReply] = useState(null);
  const [isError, setIsError] = useState(false);

  async function send(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/sms', { from, text });
      setReply(data.reply);
      setIsError(false);
    } catch (err) {
      setReply(err.response?.data?.reply || 'Failed to send.');
      setIsError(true);
    }
  }

  return (
    <div className="card">
      <h3 className="section-title">SMS simulator</h3>
      <p className="helper-text">
        Format: <code>ATM &lt;code&gt; &lt;network&gt; &lt;speed&gt; &lt;cash&gt; &lt;security&gt; &lt;overall&gt;</code>,
        each rating 1–5.
      </p>
      <form className="stacked" onSubmit={send}>
        <label>
          From (phone number)
          <input value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Message
          <input value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <button className="btn-primary" type="submit">
          Send SMS
        </button>
      </form>
      {reply && <div className={`banner ${isError ? 'error' : 'success'}`}>{reply}</div>}
    </div>
  );
}

function QrPanel() {
  const [machines, setMachines] = useState([]);
  const [code, setCode] = useState('');
  const [qr, setQr] = useState(null);

  useEffect(() => {
    api.get('/machines').then(({ data }) => {
      setMachines(data);
      if (data.length) setCode(data[0].code);
    });
  }, []);

  useEffect(() => {
    if (!code) return;
    api.get(`/machines/${code}/qrcode`).then(({ data }) => setQr(data));
  }, [code]);

  return (
    <div className="card">
      <h3 className="section-title">Receipt / ATM sticker QR code</h3>
      <p className="helper-text">
        Each ATM gets a QR code linking directly to its feedback form — printed on the receipt or
        stuck on the machine.
      </p>
      <label>
        ATM
        <select value={code} onChange={(e) => setCode(e.target.value)}>
          {machines.map((m) => (
            <option key={m.code} value={m.code}>
              {m.code} — {m.branch_name}
            </option>
          ))}
        </select>
      </label>
      {qr && (
        <div style={{ marginTop: 14 }}>
          <img src={qr.qrDataUrl} alt={`QR code for ${qr.machine}`} width={160} height={160} />
          <p className="helper-text">
            Links to <a href={qr.url}>{qr.url}</a>
          </p>
        </div>
      )}
    </div>
  );
}

export default function Simulator() {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <UssdPanel />
      <SmsPanel />
      <QrPanel />
    </div>
  );
}
