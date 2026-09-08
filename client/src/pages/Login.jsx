import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@gcb.example');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      onLogin(data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div className="card" style={{ maxWidth: 380 }}>
      <h2 style={{ marginTop: 0 }}>Management login</h2>
      <p className="helper-text">
        Demo credentials: <code>admin@gcb.example</code> / <code>ChangeMe123!</code>
      </p>
      {error && <div className="banner error">{error}</div>}
      <form className="stacked" onSubmit={handleSubmit}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        <button className="btn-primary" type="submit">
          Log in
        </button>
      </form>
    </div>
  );
}
