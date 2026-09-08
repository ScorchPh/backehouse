/**
 * ============================================================================
 * BAKE HOUSE - User Account, Authentication & Profile Page
 * ============================================================================
 * Capstone Project Explanation:
 * Handles:
 * 1. Login with username or email + password (for Admin, Staff, and Customer).
 * 2. Customer Registration with input validation.
 * 3. Google Sign-In Single Sign-On (SSO).
 * 4. Quick 1-Click Capstone Demo Account Fillers (Admin, Staff, Customer).
 * 5. Authenticated Profile View with role badges and order navigation.
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../../services/authService";
import "./Account.css";

function Account() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [isLogin, setIsLogin] = useState(true);

  // Form input states
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regContact, setRegContact] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(authService.getCurrentUser());
    };
    window.addEventListener("authChange", handleAuthChange);
    return () => window.removeEventListener("authChange", handleAuthChange);
  }, []);

  /**
   * Helper to fill demo credentials quickly for Capstone defense
   */
  const fillDemoAccount = (role) => {
    setIsLogin(true);
    setErrorMessage("");
    setSuccessMessage("");
    if (role === "admin") {
      setLoginIdentifier("admin");
      setLoginPassword("1234");
    } else if (role === "staff") {
      setLoginIdentifier("staff");
      setLoginPassword("1234");
    } else {
      setLoginIdentifier("customer");
      setLoginPassword("1234");
    }
  };

  /**
   * Handle Standard Form Login
   */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!loginIdentifier || !loginPassword) {
      setErrorMessage("Please enter both username/email and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await authService.login(loginIdentifier, loginPassword);
      if (res.success) {
        setSuccessMessage(res.message);
        setCurrentUser(res.user);
        if (res.user.role === 'admin' || res.user.role === 'staff') {
          setTimeout(() => navigate('/admin'), 700);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || "Invalid login credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Google Sign-In
   */
  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    try {
      setLoading(true);
      // Simulate Google Profile payload
      const googleProfile = {
        email: "google.user@gmail.com",
        name: "Google Customer",
        first_name: "Google",
        last_name: "Customer",
        google_id: "google_1029384756",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200",
      };

      const res = await authService.googleLogin(googleProfile);
      if (res.success) {
        setSuccessMessage(res.message);
        setCurrentUser(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Customer Registration
   */
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!regFirstName || !regLastName || !regEmail || !regPassword) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await authService.register({
        first_name: regFirstName,
        last_name: regLastName,
        email: regEmail,
        contact_number: regContact,
        password: regPassword,
        confirm_password: regConfirmPassword,
      });

      if (res.success) {
        setSuccessMessage(res.message);
        setCurrentUser(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setSuccessMessage("Logged out successfully.");
  };

  return (
    <div className="account-page">
      <div className="account-container">
        {/* Left Side Branding */}
        <div className="account-left">
          <h1>BAKE HOUSE</h1>
          <p>
            Freshly baked happiness delivered to your doorstep. Handcrafted daily with love.
          </p>
          <img
            src="https://images.unsplash.com/photo-1519864600265-abb23847ef2c?w=700"
            alt="Bakery"
          />
        </div>

        {/* Right Side Form or Profile */}
        <div className="account-right">
          {currentUser ? (
            /* Logged-In User Profile Card */
            <div className="profile-view">
              <div className="profile-header">
                <img
                  src={currentUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"}
                  alt="Profile Avatar"
                  className="profile-avatar"
                />
                <div>
                  <h2>{currentUser.first_name} {currentUser.last_name}</h2>
                  <span className={`role-badge ${currentUser.role}`}>
                    {currentUser.role === 'admin' && '👑 Administrator'}
                    {currentUser.role === 'staff' && '👨‍🍳 Bakery Staff'}
                    {currentUser.role === 'customer' && '🛍️ Valued Customer'}
                  </span>
                </div>
              </div>

              <div className="profile-details">
                <p><strong>Username:</strong> @{currentUser.username}</p>
                <p><strong>Email:</strong> {currentUser.email}</p>
                {currentUser.contact_number && (
                  <p><strong>Contact:</strong> {currentUser.contact_number}</p>
                )}
              </div>

              <div className="profile-actions">
                {currentUser.role === 'customer' && (
                  <Link to="/my-orders" className="profile-btn primary-btn">
                    📦 View My Orders
                  </Link>
                )}

                {(currentUser.role === 'admin' || currentUser.role === 'staff') && (
                  <Link to="/admin" className="profile-btn primary-btn">
                    ⚙️ Open {currentUser.role === 'admin' ? 'Admin Panel' : 'Staff Queue'}
                  </Link>
                )}

                <Link to="/menu" className="profile-btn secondary-btn">
                  🥐 Browse Bakery Menu
                </Link>

                <button onClick={handleLogout} className="profile-btn logout-btn">
                  🚪 Logout
                </button>
              </div>
            </div>
          ) : isLogin ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit}>
              <h2>Welcome Back</h2>
              <p className="subtitle">Sign in to continue your bakery journey.</p>

              {/* Demo Account Quick Pickers for Capstone Review */}
              <div className="demo-accounts-bar">
                <span className="demo-label">⚡ Capstone Test Accounts (Password: 1234):</span>
                <div className="demo-buttons">
                  <button type="button" onClick={() => fillDemoAccount("admin")} className="demo-btn admin-demo">
                    👑 Admin
                  </button>
                  <button type="button" onClick={() => fillDemoAccount("staff")} className="demo-btn staff-demo">
                    👨‍🍳 Staff
                  </button>
                  <button type="button" onClick={() => fillDemoAccount("customer")} className="demo-btn customer-demo">
                    🛍️ Customer
                  </button>
                </div>
              </div>

              {errorMessage && <div className="alert error-alert">{errorMessage}</div>}
              {successMessage && <div className="alert success-alert">{successMessage}</div>}

              <input
                type="text"
                placeholder="Username or Email Address"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />

              <div className="remember-row">
                <label>
                  <input type="checkbox" defaultChecked />
                  Remember Me
                </label>
                <button type="button" className="forgot-btn" onClick={() => alert("For this capstone, default password is: 1234")}>
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="account-btn" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>

              {/* Google Sign-In Button */}
              <div className="divider">
                <span>OR</span>
              </div>

              <button
                type="button"
                className="google-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="google-icon" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </button>

              <p className="switch-text">Don't have an account?</p>

              <button
                type="button"
                className="switch-btn"
                onClick={() => {
                  setIsLogin(false);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
              >
                Create an Account
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit}>
              <h2>Create Account</h2>
              <p className="subtitle">Join BAKE HOUSE today.</p>

              {errorMessage && <div className="alert error-alert">{errorMessage}</div>}
              {successMessage && <div className="alert success-alert">{successMessage}</div>}

              <div className="form-row">
                <input
                  type="text"
                  placeholder="First Name"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  required
                />
              </div>

              <input
                type="email"
                placeholder="Email Address"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />

              <input
                type="text"
                placeholder="Contact Number (+63 ...)"
                value={regContact}
                onChange={(e) => setRegContact(e.target.value)}
              />

              <input
                type="password"
                placeholder="Password (at least 4 chars)"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Confirm Password"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                required
              />

              <button type="submit" className="account-btn" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </button>

              {/* Google Sign-In option in register */}
              <div className="divider">
                <span>OR</span>
              </div>

              <button
                type="button"
                className="google-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="google-icon" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Sign up with Google
              </button>

              <p className="switch-text">Already have an account?</p>

              <button
                type="button"
                className="switch-btn"
                onClick={() => {
                  setIsLogin(true);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
              >
                Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Account;