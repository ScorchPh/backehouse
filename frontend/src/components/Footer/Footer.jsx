import "./Footer.css";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer-bakesmart">
      <div className="footer-main-container">
        <div className="footer-brand-col">
          <h3 className="footer-brand-title">BAKE HOUSE</h3>
          <p className="footer-brand-tagline">
            Freshly baked breads, cakes, pastries, and cookies made with love and
            traditional slow fermentation every single day.
          </p>
        </div>

        <div className="footer-links-col">
          <h4>Explore</h4>
          <Link to="/">Home</Link>
          <Link to="/menu">Artisanal Menu</Link>
          <Link to="/personalize">Custom Cakes</Link>
          <Link to="/about">Our Story</Link>
        </div>

        <div className="footer-links-col">
          <h4>Support &amp; Location</h4>
          <Link to="/contact">Contact Us</Link>
          <p className="footer-detail-text">📍 Poblacion, Cordova, Cebu</p>
          <p className="footer-detail-text">📞 0917-123-4567</p>
        </div>

        <div className="footer-links-col">
          <h4>Bakery Hours</h4>
          <p className="footer-detail-text">Mon - Fri: 8:00 AM - 8:00 PM</p>
          <p className="footer-detail-text">Sat - Sun: 8:00 AM - 9:00 PM</p>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <div className="footer-bar-inner">
          <div className="footer-bar-left">
            <span className="footer-bar-logo">BAKE HOUSE</span>
            <span className="footer-bar-copy">
              © 2026 BAKE HOUSE ARTISANAL SYSTEMS. CRAFTED FOR PRECISION AND DELIGHT.
            </span>
          </div>

          <div className="footer-bar-links">
            <Link to="/menu">SOURCING</Link>
            <Link to="/menu">ALLERGENS</Link>
            <Link to="/contact">DELIVERY ZONES</Link>
            <Link to="/contact">CONTACT</Link>
            <span className="footer-bar-icons">
              <span title="Artisanal Standards">🌐</span>
              <a href="mailto:info@bakehouse.com" title="Email us">✉️</a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;