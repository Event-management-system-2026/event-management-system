import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    eventId: "",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios
      .get("http://localhost:5000/events")
      .then((response) => {
        setEvents(response.data);
      })
      .catch((error) => {
        console.error("Error fetching events:", error);
      });
  }, []);

  const handleRegister = async (eventId) => {
    if (!formData.name || !formData.email) {
      setMessage("Please enter your name and email first.");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/register", {
        name: formData.name,
        email: formData.email,
        eventId: eventId,
      });

      setMessage(response.data.message);
      setFormData({
        name: "",
        email: "",
        eventId: "",
      });
    } catch (error) {
      console.error("Registration error:", error);
      setMessage("Registration failed.");
    }
  };

  return (
    <div className="App">
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

      {message && <p className="message">{message}</p>}

      <div className="events-container">
        {events.map((event) => (
          <div key={event.id} className="event-card">
            <h3>{event.title}</h3>
            <p>Date: {event.date}</p>
            <p>Location: {event.location}</p>
            <p>Capacity: {event.capacity}</p>
            <button onClick={() => handleRegister(event.id)}>
              Register
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;