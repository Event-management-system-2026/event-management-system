import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function LoginPage({ onLogin, onBack }) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    try {
      if (!formData.username || !formData.password) {
        setMessage("Please enter username and password");
        return;
      }

      const response = await axios.post(`${API_URL}/login`, formData);

      onLogin(response.data.user);
      setMessage("");
    } catch (error) {
      setMessage("Invalid username or password");
    }
  };

  return (
    <div className="App">
      <div className="login-box">
        <h1>Organizer Login</h1>

        <input
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
        />

        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
        />

        <button onClick={handleLogin}>Login</button>
        <button onClick={onBack}>Back to Events</button>
        {message && <p className="message">{message}</p>}

        <div className="demo-users">
          <h3>Demo Accounts</h3>
          <p>Organizer 1: organizer1 / 1234</p>
          <p>Organizer 2: organizer2 / 1234</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;