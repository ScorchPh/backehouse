/**
 * ============================================================================
 * BAKE HOUSE - Contact Us Page Component
 * ============================================================================
 */

import { useState } from "react";
import "./Contact.css";
import { contactService } from "../../services/contactService";

function Contact() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", isError: false });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ text: "", isError: false });

    if (!fullName || !email || !subject || !message) {
      setStatusMessage({ text: "Please complete all fields.", isError: true });
      return;
    }

    try {
      setLoading(true);
      const res = await contactService.sendMessage({
        name: fullName,
        email,
        subject,
        message,
      });

      if (res.success) {
        setStatusMessage({ text: res.message || "Message sent successfully!", isError: false });
        setFullName("");
        setEmail("");
        setSubject("");
        setMessage("");
      }
    } catch (err) {
      setStatusMessage({
        text: err.message || "Could not send message. Please try again later.",
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact">
      <div className="contact-header">
        <h1>Contact Us</h1>
        <p>
          We'd love to hear from you! Whether you have questions, feedback,
          or would like to place a special order, we're always here to help.
        </p>
      </div>

      <div className="contact-info">
        <div className="info-card">
          <h3>📍 Address</h3>
          <p>
            Poblacion, Cordova,<br />
            Cebu, Philippines
          </p>
        </div>

        <div className="info-card">
          <h3>📞 Phone</h3>
          <p>+63 912 345 6789</p>
        </div>

        <div className="info-card">
          <h3>📧 Email</h3>
          <p>info@bakehouse.com</p>
        </div>

        <div className="info-card">
          <h3>🕒 Business Hours</h3>
          <p>
            Monday - Sunday<br />
            8:00 AM - 8:00 PM
          </p>
        </div>
      </div>

      <div className="contact-form-section">
        <h2>Send Us a Message</h2>
        <p>
          Have a question or special request? Fill out the form below and
          we'll get back to you as soon as possible.
        </p>

        {statusMessage.text && (
          <div
            style={{
              padding: "14px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontWeight: "600",
              background: statusMessage.isError ? "#FEE2E2" : "#ECFDF5",
              color: statusMessage.isError ? "#DC2626" : "#059669",
              border: `1px solid ${statusMessage.isError ? "#F87171" : "#34D399"}`
            }}
          >
            {statusMessage.isError ? "⚠️ " : "✅ "}
            {statusMessage.text}
          </div>
        )}

        <form className="contact-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          <textarea
            placeholder="Your Message"
            rows="6"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          ></textarea>

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>

      <div className="map-section">
        <h2>Find Us</h2>
        <p>
          Visit BAKE HOUSE and enjoy freshly baked breads, pastries, and cakes
          made with love every day.
        </p>

        <div className="map-container">
          <iframe
            title="Bake House Location"
            src="https://www.google.com/maps?q=Cordova,Cebu&output=embed"
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>

      <div className="social-section">
        <h2>Follow BAKE HOUSE</h2>
        <p>
          Stay updated with our newest breads, cakes, pastries, and special
          promotions by following us on social media.
        </p>

        <div className="social-links">
          <a href="#">Facebook</a>
          <a href="#">Instagram</a>
          <a href="#">TikTok</a>
        </div>
      </div>
    </div>
  );
}

export default Contact;