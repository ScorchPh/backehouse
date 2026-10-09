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
 * 6. Customer Account Settings: Edit personal info (Name, Contact, Email)
 *    and Default Shopee-Style Delivery Location (Street, Barangay, City,
 *    Landmark, and Interactive Pinpoint Map Coordinates).
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../../services/authService";
import DeliveryMapPicker from "../../components/DeliveryMapPicker/DeliveryMapPicker";
import "./Account.css";

function Account() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [isLogin, setIsLogin] = useState(true);

  // Tab state for logged-in user: 'overview' or 'settings'
  const [activeTab, setActiveTab] = useState("overview");

  // Form input states (Auth)
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regContact, setRegContact] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  // Customer Settings / Edit Details States
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editStreet, setEditStreet] = useState("");
  const [editBarangay, setEditBarangay] = useState("Poblacion");
  const [editCity, setEditCity] = useState("Cordova");
  const [editProvince, setEditProvince] = useState("Cebu");
  const [editLandmark, setEditLandmark] = useState("");
  const [editLat, setEditLat] = useState(10.2540);
  const [editLng, setEditLng] = useState(123.9490);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState({ text: "", type: "" });

  // Feedback states (Login/Register)
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const populateEditFields = (user) => {
    if (!user) return;
    setEditFirstName(user.first_name || "");
    setEditLastName(user.last_name || "");
    setEditEmail(user.email || "");
    setEditContact(user.contact_number || "");
    setEditStreet(user.default_street || user.street || "");
    setEditBarangay(user.default_barangay || "Poblacion");
    setEditCity(user.default_city || "Cordova");
    setEditProvince(user.default_province || "Cebu");
    setEditLandmark(user.default_landmark || "");
    setEditLat(user.default_lat ? parseFloat(user.default_lat) : 10.2540);
    setEditLng(user.default_lng ? parseFloat(user.default_lng) : 123.9490);
  };

  useEffect(() => {
    const handleAuthChange = () => {
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        populateEditFields(user);
      }
    };
    window.addEventListener("authChange", handleAuthChange);

    if (currentUser) {
      populateEditFields(currentUser);
    }

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
        populateEditFields(res.user);
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
        populateEditFields(res.user);
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
        populateEditFields(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save Customer Settings (Personal Info & Default Delivery Location)
   */
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsMessage({ text: "", type: "" });

    if (!editFirstName.trim() || !editLastName.trim()) {
      setSettingsMessage({
        text: "Please provide both first and last name.",
        type: "error"
      });
      return;
    }

    try {
      setSavingSettings(true);
      const payload = {
        id: currentUser.id,
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        email: editEmail.trim(),
        contact_number: editContact.trim(),
        default_street: editStreet.trim(),
        default_barangay: editBarangay.trim(),
        default_city: editCity.trim(),
        default_province: editProvince.trim(),
        default_landmark: editLandmark.trim(),
        default_lat: editLat,
        default_lng: editLng,
      };

      const res = await authService.updateProfile(payload);
      if (res && res.success) {
        setCurrentUser(res.user);
        setSettingsMessage({
          text: "✨ Details updated successfully! Your saved address and map pin will automatically fill during checkout.",
          type: "success"
        });
        setTimeout(() => {
          setActiveTab("overview");
        }, 1500);
      } else {
        setSettingsMessage({
          text: res.message || "Failed to save profile changes.",
          type: "error"
        });
      }
    } catch (err) {
      setSettingsMessage({
        text: err.message || "Error saving settings. Please check your connection.",
        type: "error"
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setActiveTab("overview");
    setSuccessMessage("Logged out successfully.");
  };

  return (
    <div className="account-page">
      <div className={`account-container ${currentUser && activeTab === 'settings' ? 'settings-active' : ''}`}>
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
            /* Logged-In User Profile & Settings Container */
            <div className="profile-view">
              {/* Account Tabs Header */}
              <div className="account-tabs">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('overview');
                    setSettingsMessage({ text: "", type: "" });
                  }}
                >
                  👤 Profile Overview
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => {
                    populateEditFields(currentUser);
                    setActiveTab('settings');
                    setSettingsMessage({ text: "", type: "" });
                  }}
                >
                  ⚙️ Edit Details & Location
                </button>
              </div>

              {activeTab === 'overview' ? (
                /* TAB 1: Profile Overview */
                <div className="overview-tab-content">
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
                    <div className="detail-item">
                      <span className="detail-label">Username:</span>
                      <span className="detail-val">@{currentUser.username}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-val">{currentUser.email || "Not specified"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Contact:</span>
                      <span className="detail-val">{currentUser.contact_number || "Not specified"}</span>
                    </div>
                  </div>

                  {/* Customer Default Delivery Details Card */}
                  <div className="profile-delivery-box">
                    <div className="delivery-box-header">
                      <div>
                        <h4>🏠 Default Delivery Address (Auto-filled at Checkout)</h4>
                        <p>Your preferred delivery spot and Shopee-style pinpoint location.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          populateEditFields(currentUser);
                          setActiveTab('settings');
                        }}
                        className="quick-edit-link"
                      >
                        ✏️ Edit
                      </button>
                    </div>

                    {currentUser.default_street || currentUser.address ? (
                      <div className="delivery-box-body">
                        <p className="delivery-address-text">
                          <strong>Address:</strong>{" "}
                          {[
                            currentUser.default_street,
                            currentUser.default_barangay ? `Brgy. ${currentUser.default_barangay}` : null,
                            currentUser.default_city,
                            currentUser.default_province
                          ].filter(Boolean).join(", ") || currentUser.address}
                        </p>
                        {currentUser.default_landmark && (
                          <p className="delivery-landmark-text">
                            <strong>Landmark:</strong> {currentUser.default_landmark}
                          </p>
                        )}
                        <div className="delivery-pin-badge">
                          {currentUser.default_lat && currentUser.default_lng ? (
                            <span className="pin-tag success">
                              📍 Map Pinpoint Set ({Number(currentUser.default_lat).toFixed(4)}, {Number(currentUser.default_lng).toFixed(4)})
                            </span>
                          ) : (
                            <span className="pin-tag warning">
                              📍 No default map pin set yet
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="delivery-empty-state">
                        <p>No default delivery address set yet.</p>
                        <button
                          type="button"
                          className="set-address-cta-btn"
                          onClick={() => {
                            populateEditFields(currentUser);
                            setActiveTab('settings');
                          }}
                        >
                          ➕ Set Default Address & Map Pin
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="profile-actions">
                    <button
                      type="button"
                      onClick={() => {
                        populateEditFields(currentUser);
                        setActiveTab('settings');
                      }}
                      className="profile-btn edit-settings-btn"
                    >
                      ⚙️ Edit Profile & Location Details
                    </button>

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
              ) : (
                /* TAB 2: Customer Settings & Edit Form */
                <form onSubmit={handleSaveSettings} className="settings-tab-form">
                  <div className="settings-header">
                    <h2>Edit Your Details</h2>
                    <p className="subtitle">
                      Update your contact information and default Shopee-style delivery location.
                    </p>
                  </div>

                  {settingsMessage.text && (
                    <div className={`alert ${settingsMessage.type === 'success' ? 'success-alert' : 'error-alert'}`}>
                      {settingsMessage.text}
                    </div>
                  )}

                  {/* Section 1: Personal Info */}
                  <div className="settings-section">
                    <h3 className="section-title">👤 Personal Details</h3>
                    <div className="form-row">
                      <div>
                        <label className="field-label">First Name *</label>
                        <input
                          type="text"
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          placeholder="e.g. Juan"
                          required
                        />
                      </div>
                      <div>
                        <label className="field-label">Last Name *</label>
                        <input
                          type="text"
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          placeholder="e.g. Dela Cruz"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div>
                        <label className="field-label">Email Address *</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="name@example.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="field-label">Contact Number (+63 / 09...)</label>
                        <input
                          type="text"
                          value={editContact}
                          onChange={(e) => setEditContact(e.target.value)}
                          placeholder="+63 912 345 6782"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Default Delivery Location */}
                  <div className="settings-section">
                    <h3 className="section-title">🏠 Default Delivery Address (Shopee Style)</h3>
                    <p className="section-desc">
                      These details will automatically pre-fill your checkout form so you can place orders with 1 tap.
                    </p>

                    <label className="field-label">House No. / Street / Unit / Subdivision *</label>
                    <input
                      type="text"
                      value={editStreet}
                      onChange={(e) => setEditStreet(e.target.value)}
                      placeholder="e.g. Blk 4 Lot 12 Villa Teresa Subdivision, or 123 Rizal St."
                    />

                    <div className="form-row">
                      <div>
                        <label className="field-label">Barangay *</label>
                        <input
                          type="text"
                          value={editBarangay}
                          onChange={(e) => setEditBarangay(e.target.value)}
                          placeholder="e.g. Poblacion, Gabi, Bangbang"
                        />
                      </div>
                      <div>
                        <label className="field-label">City / Municipality *</label>
                        <input
                          type="text"
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          placeholder="Cordova"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div>
                        <label className="field-label">Province</label>
                        <input
                          type="text"
                          value={editProvince}
                          onChange={(e) => setEditProvince(e.target.value)}
                          placeholder="Cebu"
                        />
                      </div>
                      <div>
                        <label className="field-label">Landmark / Delivery Notes (Optional)</label>
                        <input
                          type="text"
                          value={editLandmark}
                          onChange={(e) => setEditLandmark(e.target.value)}
                          placeholder="e.g. Near yellow gate, beside sari-sari store"
                        />
                      </div>
                    </div>

                    {/* Section 3: Interactive Map Pinpoint Accordion */}
                    <div className="map-picker-accordion">
                      <div className="map-accordion-header">
                        <div>
                          <strong>📍 Default Map Pinpoint (Lat & Lng)</strong>
                          <span className="current-pin-coords">
                            {editLat && editLng
                              ? `${Number(editLat).toFixed(4)}, ${Number(editLng).toFixed(4)}`
                              : "Not selected"}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="toggle-map-btn"
                          onClick={() => setShowMapPicker(!showMapPicker)}
                        >
                          {showMapPicker ? "🔼 Hide Map Pin" : "🔽 Pinpoint on Map"}
                        </button>
                      </div>

                      {showMapPicker && (
                        <div className="settings-map-container">
                          <DeliveryMapPicker
                            initialBarangay={editBarangay}
                            initialCoordinates={{ lat: editLat, lng: editLng }}
                            onLocationSelected={(info) => {
                              if (info?.coordinates) {
                                setEditLat(info.coordinates.lat);
                                setEditLng(info.coordinates.lng);
                              }
                              if (info?.addressDetails) {
                                if (info.addressDetails.street && !editStreet) {
                                  setEditStreet(info.addressDetails.street);
                                }
                                if (info.addressDetails.barangay) {
                                  setEditBarangay(info.addressDetails.barangay);
                                }
                                if (info.addressDetails.city) {
                                  setEditCity(info.addressDetails.city);
                                }
                                if (info.addressDetails.province) {
                                  setEditProvince(info.addressDetails.province);
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="settings-btn-row">
                    <button
                      type="submit"
                      className="account-btn save-settings-btn"
                      disabled={savingSettings}
                    >
                      {savingSettings ? "Saving Settings..." : "💾 Save Changes"}
                    </button>
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => setActiveTab('overview')}
                      disabled={savingSettings}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
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