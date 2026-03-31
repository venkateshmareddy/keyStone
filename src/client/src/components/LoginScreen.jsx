import React, { useState } from 'react';
import { validateKey } from '../services/api.js';

export default function LoginScreen({ onLogin }) {
  const [key,   setKey]   = useState('');
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key.trim()) { setError('Please enter your API key'); return; }
    setBusy(true);
    setError('');
    try {
      await validateKey(key.trim());
      localStorage.setItem('ks_api_key', key.trim());
      onLogin();
    } catch {
      setError('Invalid API key — check your .env file');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">🗝️</div>
        <h1 className="login-title">KeyStone</h1>
        <p className="login-subtitle">Your private Knowledge Vault</p>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <p className="form-error">{error}</p>}
          <input
            className="text-input"
            type="password"
            placeholder="Enter your API key"
            value={key}
            onChange={e => setKey(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Unlock →'}
          </button>
        </form>
      </div>
    </div>
  );
}
