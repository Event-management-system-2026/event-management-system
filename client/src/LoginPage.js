import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function LoginPage({ onLogin, onBack }) {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!formData.username || !formData.password) {
      setMessage("Enter both a username and a password.");
      return;
    }

    setBusy(true);
    try {
      const response = await axios.post(`${API_URL}/login`, formData);
      onLogin(response.data.user);
      setMessage("");
    } catch (error) {
      setMessage("That username and password don't match an organizer account.");
    } finally {
      setBusy(false);
    }
  };

  // Enter submits, which people expect from a login form.
  const onKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <span className="eyebrow">EventFlow</span>
        <h1>Organizer login</h1>

        <div className="login-fields" onKeyDown={onKeyDown}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>
        </div>

        {message && (
          <p className="inline-msg inline-msg-error" role="alert">
            {message}
          </p>
        )}

        <div className="login-actions">
          <button className="btn btn-signal" onClick={handleLogin} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <button className="btn btn-line" onClick={onBack}>
            Back to events
          </button>
        </div>

        <div className="demo-users">
          <strong>Demo accounts</strong>
          <div>
            organizer1 / <span>1234</span>
          </div>
          <div>
            organizer2 / <span>1234</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;