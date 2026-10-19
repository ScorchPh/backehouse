import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import { authService } from "../../services/authService";
import DeliveryMapPicker, { POPULAR_AREAS } from "../../components/DeliveryMapPicker/DeliveryMapPicker";
import catPastries from "../../assets/images/cat_pastries.jpg";
import catSourdough from "../../assets/images/cat_sourdough.jpg";
import heroBg from "../../assets/images/bakesmart_hero.jpg";
import "./Account.css";

const BREAD_PASTRY_SLIDES = [
  {
    image: catPastries,
    tag: "🥐 Artisanal Pastry",
    title: "Golden Butter Croissants",
    desc: "Flaky, buttery French pastries baked crisp and golden every morning."
  },
  {
    image: catSourdough,
    tag: "🥖 Hearth Bread",
    title: "Stone Hearth Sourdough",
    desc: "Naturally leavened with wild starter, stone-baked with a crusty finish."
  },
  {
    image: "/uploads/productimg/cinnamon_roll.jpg",
    fallback: catPastries,
    tag: "🥯 Sweet Pastry",
    title: "Glazed Cinnamon Swirls",
    desc: "Warm spiced cinnamon rolls drizzled with velvety vanilla cream cheese."
  },
  {
    image: "/uploads/productimg/spanish_bread.jpg",
    fallback: heroBg,
    tag: "🍞 Filipino Favorites",
    title: "Fresh Spanish Bread",
    desc: "Soft traditional morning rolls filled with sweet buttery golden breadcrumbs."
  },
  {
    image: heroBg,
    tag: "🌾 Artisan Bakery",
    title: "Stone-Baked Daily Loaves",
    desc: "Handcrafted with pure wholesome flour, baked fresh daily in Cordova."
  }
];

function Account() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const redirectUrl = searchParams.get("redirect") || location.state?.redirect || null;
  const redirectNotice = location.state?.message || (redirectUrl ? "Please sign in or create an account to proceed." : null);

  const handlePostAuthRedirect = (user) => {
    if (redirectUrl) {
      setTimeout(() => navigate(redirectUrl), 600);
    } else if (user?.role === "admin" || user?.role === "staff") {
      setTimeout(() => navigate("/admin"), 700);
    }
  };

  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [isLogin, setIsLogin] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BREAD_PASTRY_SLIDES.length);
    }, 4500);
    return () => clearInterval(slideTimer);
  }, []);
  const [activeTab, setActiveTab] = useState("overview");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regContact, setRegContact] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
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
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [geocodingAddress, setGeocodingAddress] = useState(false);

  const populateEditFields = (user) => {
    if (!user) return;
    setEditFirstName(user.first_name || "");
    setEditLastName(user.last_name || "");
    setEditEmail(user.email || "");
    setEditContact(user.contact_number || "");
    setEditStreet(user.default_street || user.street || "");
    const userBarangay = user.default_barangay || "Poblacion";
    setEditBarangay(userBarangay);
    setEditCity(user.default_city || "Cordova");
    setEditProvince(user.default_province || "Cebu");
    setEditLandmark(user.default_landmark || "");
    const parsedLat = parseFloat(user.default_lat);
    const parsedLng = parseFloat(user.default_lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng) && (parsedLat !== 10.2540 || parsedLng !== 123.9490)) {
      setEditLat(parsedLat);
      setEditLng(parsedLng);
    } else {
      // Auto-pinpoint directly to coordinates of user's default barangay (e.g. Gabi -> 10.2705, 123.9575)
      const match = POPULAR_AREAS.find((a) => a.name.toLowerCase() === userBarangay.trim().toLowerCase());
      if (match) {
        setEditLat(match.lat);
        setEditLng(match.lng);
      } else {
        setEditLat(10.2540);
        setEditLng(123.9490);
      }
    }
  };

  const handleBarangayChange = (val) => {
    setEditBarangay(val);
    const match = POPULAR_AREAS.find((a) => a.name.toLowerCase() === val.trim().toLowerCase());
    if (match) {
      setEditLat(match.lat);
      setEditLng(match.lng);
    }
  };

  const autoPinpointFromAddress = async () => {
    setGeocodingAddress(true);
    try {
      const searchParts = [editStreet, editBarangay, editCity, editProvince, "Philippines"].filter(Boolean);
      const query = searchParts.join(", ");
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setEditLat(lat);
        setEditLng(lng);
        setShowMapPicker(true);
      } else {
        const match = POPULAR_AREAS.find((a) => a.name.toLowerCase() === editBarangay.trim().toLowerCase());
        if (match) {
          setEditLat(match.lat);
          setEditLng(match.lng);
          setShowMapPicker(true);
        }
      }
    } catch (e) {
      const match = POPULAR_AREAS.find((a) => a.name.toLowerCase() === editBarangay.trim().toLowerCase());
      if (match) {
        setEditLat(match.lat);
        setEditLng(match.lng);
      }
    } finally {
      setGeocodingAddress(false);
    }
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
        handlePostAuthRedirect(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || "Invalid login credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const GOOGLE_CLIENT_ID =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    "358903013359-eu79ddh7kd7sr8e1dqkj3t2bd7706583.apps.googleusercontent.com";

  const handleGoogleSignIn = () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!window.google?.accounts?.oauth2) {
      setErrorMessage("Google Sign-In is initializing. Please try again in a moment.");
      return;
    }

    try {
      setGoogleAuthLoading(true);
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setGoogleAuthLoading(false);
            if (tokenResponse.error !== "popup_closed_by_user") {
              setErrorMessage(tokenResponse.error_description || "Google authorization was cancelled.");
            }
            return;
          }

          try {
            const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            if (!userInfoRes.ok) {
              throw new Error("Unable to retrieve Google profile information.");
            }
            const userInfo = await userInfoRes.json();
            const googleSubId = userInfo.sub || userInfo.id || "";
            const res = await authService.googleLogin({
              email: userInfo.email,
              name: userInfo.name,
              first_name: userInfo.given_name || userInfo.name,
              last_name: userInfo.family_name || "",
              google_id: googleSubId,
              sub: googleSubId,
              avatar: userInfo.picture,
            });

            if (res && res.success) {
              setSuccessMessage(res.message || "Google sign-in successful!");
              setCurrentUser(res.user);
              populateEditFields(res.user);
              handlePostAuthRedirect(res.user);
            } else {
              setErrorMessage(res?.message || "Google sign-in failed.");
            }
          } catch (err) {
            setErrorMessage(err.message || "Failed to process Google account.");
          } finally {
            setGoogleAuthLoading(false);
          }
        },
      });

      client.requestAccessToken();
    } catch (err) {
      setGoogleAuthLoading(false);
      setErrorMessage(err.message || "Could not launch Google sign-in window.");
    }
  };
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
        handlePostAuthRedirect(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };
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
    <div className={`account-page ${currentUser ? "dashboard-page" : "auth-page"}`}>
      {currentUser ? (
        <div className="account-dashboard-layout">
          <aside className="dashboard-sidebar">
            <div className="sidebar-profile-card">
              <img
                src={currentUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"}
                alt="Profile Avatar"
                className="sidebar-avatar"
              />
              <h2 className="sidebar-name">{currentUser.first_name} {currentUser.last_name}</h2>
              <span className="sidebar-username">@{currentUser.username}</span>
              <span className={`role-badge ${currentUser.role || 'customer'}`}>
                {currentUser.role === 'admin' && '👑 Administrator'}
                {currentUser.role === 'staff' && '👨‍🍳 Bakery Staff'}
                {currentUser.role === 'customer' && '🛍️ Valued Customer'}
              </span>
            </div>

            <nav className="sidebar-nav">
              <button
                type="button"
                className={`sidebar-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('overview');
                  setSettingsMessage({ text: "", type: "" });
                }}
              >
                👤 Profile Overview
              </button>
              <button
                type="button"
                className={`sidebar-nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => {
                  populateEditFields(currentUser);
                  setActiveTab('settings');
                  setSettingsMessage({ text: "", type: "" });
                }}
              >
                ⚙️ Edit Details & Location
              </button>
              {currentUser.role === 'customer' && (
                <Link to="/my-orders" className="sidebar-nav-btn">
                  📦 My Orders
                </Link>
              )}
              {(currentUser.role === 'admin' || currentUser.role === 'staff') && (
                <Link to="/admin" className="sidebar-nav-btn">
                  🛠️ Admin Portal
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="sidebar-nav-btn logout-sidebar-btn"
              >
                🚪 Logout
              </button>
            </nav>
          </aside>

          <main className="dashboard-main-content">
            {activeTab === 'overview' ? (
              <div className="dashboard-card overview-card">
                <div className="dashboard-card-header">
                  <div>
                    <h2>👤 Account Overview</h2>
                    <p className="subtitle">
                      Welcome, <strong>{currentUser.first_name || currentUser.username}</strong>! View your profile details and saved delivery address.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      populateEditFields(currentUser);
                      setActiveTab('settings');
                    }}
                    className="quick-edit-link header-quick-edit"
                  >
                    ⚙️ Edit Details
                  </button>
                </div>

                <div className="overview-tab-content">
                  {/* Personal Information */}
                  <div className="overview-section">
                    <div className="overview-section-header">
                      <h4>👤 Personal Details</h4>
                    </div>
                    <div className="overview-details-grid">
                      <div className="overview-detail-item">
                        <span className="overview-detail-label">Full Name</span>
                        <span className="overview-detail-val">
                          {currentUser.first_name} {currentUser.last_name}
                        </span>
                      </div>
                      <div className="overview-detail-item">
                        <span className="overview-detail-label">Username</span>
                        <span className="overview-detail-val">@{currentUser.username}</span>
                      </div>
                      <div className="overview-detail-item">
                        <span className="overview-detail-label">Email Address</span>
                        <span className="overview-detail-val">{currentUser.email || "Not specified"}</span>
                      </div>
                      <div className="overview-detail-item">
                        <span className="overview-detail-label">Contact Number</span>
                        <span className="overview-detail-val">{currentUser.contact_number || "Not specified"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="profile-delivery-box">
                    <div className="delivery-box-header">
                      <div>
                        <h4>🏠 Default Delivery Address (Auto-filled at Checkout)</h4>
                        <p>Your preferred delivery spot and pinpoint location.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          populateEditFields(currentUser);
                          setActiveTab('settings');
                        }}
                        className="quick-edit-link"
                      >
                        ✏️ Edit Location
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

                  {/* Clean Dashboard Shortcuts */}
                  <div className="overview-shortcuts-row">
                    {currentUser.role === 'customer' && (
                      <Link to="/my-orders" className="overview-shortcut-card">
                        <div className="shortcut-icon">📦</div>
                        <div className="shortcut-info">
                          <h5>My Orders</h5>
                          <p>View order progress, receipts & re-order favorites</p>
                        </div>
                        <span className="shortcut-arrow">→</span>
                      </Link>
                    )}

                    {(currentUser.role === 'admin' || currentUser.role === 'staff') && (
                      <Link to="/admin" className="overview-shortcut-card">
                        <div className="shortcut-icon">⚙️</div>
                        <div className="shortcut-info">
                          <h5>{currentUser.role === 'admin' ? 'Admin Portal' : 'Staff Queue'}</h5>
                          <p>Manage bakery queues, products & kitchen workflow</p>
                        </div>
                        <span className="shortcut-arrow">→</span>
                      </Link>
                    )}

                    <Link to="/menu" className="overview-shortcut-card">
                      <div className="shortcut-icon">🥐</div>
                      <div className="shortcut-info">
                        <h5>Bakery Menu</h5>
                        <p>Discover handcrafted breads, cookies & custom cakes</p>
                      </div>
                      <span className="shortcut-arrow">→</span>
                    </Link>
                  </div>
                </div>
              </div>
              ) : (
                <div className="dashboard-card settings-card">
                  <form onSubmit={handleSaveSettings} className="settings-tab-form">
                  <div className="settings-header">
                    <h2>Edit Your Details</h2>
                    <p className="subtitle">
                      Update your contact information and default delivery location.
                    </p>
                  </div>

                  {settingsMessage.text && (
                    <div className={`alert ${settingsMessage.type === 'success' ? 'success-alert' : 'error-alert'}`}>
                      {settingsMessage.text}
                    </div>
                  )}
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
                  <div className="settings-section">
                    <h3 className="section-title">🏠 Default Delivery Address</h3>
                    <p className="section-desc">
                      These details will automatically pre-fill your checkout form so you can place orders with 1 tap.
                    </p>

                    <label className="field-label">House No. / Street / Unit / Subdivision *</label>
                    <input
                      type="text"
                      value={editStreet}
                      onChange={(e) => setEditStreet(e.target.value)}
                      onBlur={() => {
                        if (editStreet.trim() && editBarangay) {
                          autoPinpointFromAddress();
                        }
                      }}
                      placeholder="e.g. Tumoy, Blk 4 Lot 12 Villa Teresa Subdivision, or 123 Rizal St."
                    />

                    <div className="form-row">
                      <div>
                        <label className="field-label">Barangay *</label>
                        <input
                          type="text"
                          list="cordova-barangays"
                          value={editBarangay}
                          onChange={(e) => handleBarangayChange(e.target.value)}
                          placeholder="e.g. Gabi, Poblacion, Bangbang"
                        />
                        <datalist id="cordova-barangays">
                          {POPULAR_AREAS.map((area) => (
                            <option key={area.name} value={area.name} />
                          ))}
                        </datalist>
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
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="toggle-map-btn"
                            onClick={autoPinpointFromAddress}
                            disabled={geocodingAddress}
                            style={{
                              background: "#FFFBEB",
                              border: "1px solid #F59E0B",
                              color: "#B45309",
                              fontSize: "0.82rem",
                              fontWeight: "600",
                              cursor: "pointer"
                            }}
                            title="Auto-pinpoint coordinates based on your address above"
                          >
                            {geocodingAddress ? "⏳ Pinpointing..." : "🎯 Auto-Pinpoint Address"}
                          </button>
                          <button
                            type="button"
                            className="toggle-map-btn"
                            onClick={() => setShowMapPicker(!showMapPicker)}
                          >
                            {showMapPicker ? "🔼 Hide Map Pin" : "🔽 Pinpoint on Map"}
                          </button>
                        </div>
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
              </div>
            )}
          </main>
        </div>
      ) : (
        <div className="account-container auth-container">
          <div className="account-left">
            <div className="account-carousel-bg" aria-hidden="true">
              {BREAD_PASTRY_SLIDES.map((slide, idx) => (
                <div
                  key={idx}
                  className={`carousel-slide ${idx === currentSlide ? "active" : ""}`}
                  style={{
                    backgroundImage: `url(${slide.image}), url(${slide.fallback || catPastries})`
                  }}
                />
              ))}
              <div className="carousel-overlay" />
            </div>
            <div className="account-left-content">
              <div className="account-left-header">
                <span className="brand-badge">🥖 Artisanal Bakery</span>
                <h1>BAKE HOUSE</h1>
                <p className="brand-tagline">
                  Freshly baked happiness delivered to your doorstep. Handcrafted daily with love.
                </p>
              </div>
              <div className="carousel-highlight-card">
                <span className="slide-tag">{BREAD_PASTRY_SLIDES[currentSlide].tag}</span>
                <h3 className="slide-title">{BREAD_PASTRY_SLIDES[currentSlide].title}</h3>
                <p className="slide-desc">{BREAD_PASTRY_SLIDES[currentSlide].desc}</p>
              </div>
              <div className="carousel-controls">
                <button
                  type="button"
                  className="carousel-arrow"
                  onClick={() =>
                    setCurrentSlide((prev) => (prev - 1 + BREAD_PASTRY_SLIDES.length) % BREAD_PASTRY_SLIDES.length)
                  }
                  title="Previous pastry"
                  aria-label="Previous pastry"
                >
                  ‹
                </button>

                <div className="carousel-dots">
                  {BREAD_PASTRY_SLIDES.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`carousel-dot ${idx === currentSlide ? "active" : ""}`}
                      onClick={() => setCurrentSlide(idx)}
                      aria-label={`Show ${BREAD_PASTRY_SLIDES[idx].title}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="carousel-arrow"
                  onClick={() =>
                    setCurrentSlide((prev) => (prev + 1) % BREAD_PASTRY_SLIDES.length)
                  }
                  title="Next pastry"
                  aria-label="Next pastry"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
          <div className="account-right">
            {redirectNotice && !currentUser && (
              <div style={{
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                color: "#92400E",
                padding: "12px 16px",
                borderRadius: "10px",
                marginBottom: "20px",
                fontSize: "0.92rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>🔐</span>
                <span>{redirectNotice}</span>
              </div>
            )}
            {isLogin ? (
            <form onSubmit={handleLoginSubmit}>
              <h2>Welcome Back</h2>
              <p className="subtitle">Sign in to continue your bakery journey.</p>
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
              <div className="divider">
                <span>OR</span>
              </div>

              <button
                type="button"
                className="google-btn"
                onClick={handleGoogleSignIn}
                disabled={loading || googleAuthLoading}
              >
                <svg className="google-icon" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {googleAuthLoading ? "Signing in with Google..." : "Continue with Google"}
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
              <div className="divider">
                <span>OR</span>
              </div>

              <button
                type="button"
                className="google-btn"
                onClick={handleGoogleSignIn}
                disabled={loading || googleAuthLoading}
              >
                <svg className="google-icon" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {googleAuthLoading ? "Signing up with Google..." : "Sign up with Google"}
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
      )}
    </div>
  );
}

export default Account;