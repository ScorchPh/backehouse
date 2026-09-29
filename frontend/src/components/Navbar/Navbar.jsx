/**
 * ============================================================================
 * BAKE HOUSE - Main Navigation Bar
 * ============================================================================
 * Capstone Project Explanation:
 * Provides the global store navigation with real-time active route indicators
 * using React Router's <NavLink>.
 * Displays customer cart counter, role badge (Admin/Staff), and profile dropdown.
 * ============================================================================
 */

import { useState, useEffect } from "react";
import "./Navbar.css";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { authService } from "../../services/authService";

function Navbar() {
  const { cartItems } = useCart();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(authService.getCurrentUser());
    };

    window.addEventListener("authChange", handleAuthChange);
    return () => window.removeEventListener("authChange", handleAuthChange);
  }, []);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    authService.logout();
    closeMenu();
    navigate("/account");
  };

  // Total quantity of all items in the cart
  const totalItems = cartItems.reduce(
    (total, item) => total + (item.quantity || 1),
    0
  );

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/" onClick={closeMenu}>BAKE HOUSE</Link>
      </div>

      {/* Mobile Menu Hamburger Button */}
      <button
        type="button"
        className={`nav-toggle ${isMobileMenuOpen ? "open" : ""}`}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle navigation menu"
        aria-expanded={isMobileMenuOpen}
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* Backdrop overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div className="nav-backdrop" onClick={closeMenu} />
      )}

      <ul className={`nav-links ${isMobileMenuOpen ? "open" : ""}`}>
        <li>
          <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Home
          </NavLink>
        </li>

        <li>
          <NavLink to="/about" onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            About
          </NavLink>
        </li>

        <li>
          <NavLink to="/menu" onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Menu
          </NavLink>
        </li>

        <li>
          <NavLink to="/personalize" onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Personalize
          </NavLink>
        </li>

        <li>
          <NavLink to="/contact" onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Contact
          </NavLink>
        </li>

        <li>
          <NavLink to="/cart" onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Cart ({totalItems})
          </NavLink>
        </li>

        {currentUser && currentUser.role === 'customer' && (
          <li>
            <NavLink to="/my-orders" onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              My Orders
            </NavLink>
          </li>
        )}

        {currentUser && (currentUser.role === 'admin' || currentUser.role === 'staff') && (
          <li>
            <Link to="/admin" onClick={closeMenu} className="nav-role-badge">
              {currentUser.role === 'admin' ? '👑 Admin Panel' : '👨‍🍳 Staff Panel'}
            </Link>
          </li>
        )}

        <li>
          {currentUser ? (
            <div className="user-nav-box">
              <NavLink to="/account" onClick={closeMenu} className={({ isActive }) => (isActive ? "user-greeting active" : "user-greeting")}>
                👤 {currentUser.first_name || currentUser.username}
                <span className={`role-pill ${currentUser.role}`}>{currentUser.role}</span>
              </NavLink>
              <button onClick={handleLogout} className="nav-logout-btn" title="Logout">
                🚪
              </button>
            </div>
          ) : (
            <NavLink to="/account" onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              Account
            </NavLink>
          )}
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;