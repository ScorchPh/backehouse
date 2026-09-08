import "./Footer.css";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>BAKE HOUSE</h3>
          <p>
            Freshly baked breads, cakes, pastries, and cookies
            made with love every day.
          </p>
        </div>

        <div className="footer-section">
          <h3>Quick Links</h3>

          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/menu">Menu</Link>
          <Link to="/contact">Contact</Link>
        </div>

        <div className="footer-section">
          <h3>Contact Us</h3>

          <p>📍 Lapu-Lapu City, Cebu</p>
          <p>📞 +63 912 345 6789</p>
          <p>✉️ info@bakehouse.com</p>
        </div>

        <div className="footer-section">
          <h3>Opening Hours</h3>

          <p>Mon - Fri : 8:00 AM - 8:00 PM</p>
          <p>Saturday : 8:00 AM - 9:00 PM</p>
          <p>Sunday : 9:00 AM - 6:00 PM</p>
        </div>
      </div>

      <div className="footer-bottom">
        © 2026 BAKE HOUSE | All Rights Reserved.
      </div>
    </footer>
  );
}

export default Footer;