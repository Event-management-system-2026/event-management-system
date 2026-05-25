import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import OrganizerDashboard from "./OrganizerDashboard";
import LoginPage from "./LoginPage";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function App() {
  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    eventId: "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [showOrganizerLogin, setShowOrganizerLogin] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/events`)
      .then((response) => {
        setEvents(response.data);
      })
      .catch((error) => {
        console.error("Error fetching events:", error);
      });
  }, []);

if (currentUser?.role === "organizer") {
  return <OrganizerDashboard currentUser={currentUser} />;
}

if (showOrganizerLogin) {
  return (
    <LoginPage
      onLogin={setCurrentUser}
      onBack={() => setShowOrganizerLogin(false)}
    />
  );
}



  const handleRegister = async (eventId) => {
    if (!formData.name || !formData.email) {
      setMessage("Please enter your name and email first");
      setMessageType("error");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/register`, {
        name: formData.name,
        email: formData.email,
        eventId: eventId,
      });

      setMessage(response.data.message || "Registration successful");
      setMessageType("success");
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event._id === eventId
            ? { ...event, remainingSeats: response.data.remainingSeats }
            : event
  )
);
      setFormData({
        name: "",
        email: "",
        eventId: "",
      });
    } catch (error) {
  console.error("Registration error:", error.response?.data || error.message);
  setMessage(error.response?.data?.message || "Registration failed.");
  setMessageType("error");
}
  };

  return (
    <div className="App">
      <button
  className="organizer-login-btn"
  onClick={() => setShowOrganizerLogin(true)}
>
  Organizer Login
</button>
      <h1>EventFlow</h1>
      <h2>Available Events</h2>

      <div className="form-box">
        <input
          type="text"
          placeholder="Enter your name"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
        />
        <input
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
        />
      </div>

      {message && (
  <p className={`message ${messageType}`}>
    {message}
  </p>
)}

      <div className="events-container">
        {events.map((event) => (
          <div key={event._id} className="event-card">
            <h3>{event.title}</h3>
            <p>Date: {event.date}</p>
            <p>Location: {event.location}</p>
            <p>Capacity: {event.capacity}</p>
            <p>Remaining seats: {event.remainingSeats}</p>
            <button onClick={() => handleRegister(event._id)}>
              Register
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;