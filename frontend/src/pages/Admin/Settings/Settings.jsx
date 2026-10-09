import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { settingsService } from "../../../services/settingsService";
import { authService } from "../../../services/authService";
import "./Settings.css";

function Settings() {
  const currentUser = authService.getCurrentUser();

  // Admin Account Info
  const [adminProfile, setAdminProfile] = useState({
    name: currentUser ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() || currentUser.username : "BAKE HOUSE Admin",
    email: currentUser?.email || "admin@bakehouse.com",
    contact: currentUser?.contact_number || "0917-000-0000"
  });

  // Bakery Store Information & Social Media Links
  const [storeSettings, setStoreSettings] = useState({
    bakery_name: "BAKE HOUSE",
    email: "info@bakehouse.com",
    contact_number: "0917-123-4567",
    address: "Cebu, Philippines",
    social_links: {
      facebook: "https://facebook.com",
      instagram: "https://instagram.com",
      tiktok: "https://tiktok.com"
    },
    order_settings: {
      accept_orders: true,
      allow_customization: true
    }
  });

  const [savingSection, setSavingSection] = useState(null);
  const [savedFeedback, setSavedFeedback] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Load existing settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await settingsService.getSettings();
        if (data) {
          setStoreSettings((prev) => ({
            ...prev,
            ...data,
            social_links: {
              ...prev.social_links,
              ...(data.social_links || {})
            },
            order_settings: {
              ...prev.order_settings,
              ...(data.order_settings || {})
            }
          }));
        }
      } catch (err) {
        console.warn("Could not load settings:", err);
      }
    }
    fetchSettings();
  }, []);

  const triggerFeedback = (section) => {
    setSavedFeedback(section);
    setErrorMessage(null);
    setTimeout(() => {
      setSavedFeedback((curr) => (curr === section ? null : curr));
    }, 3500);
  };

  // 1. Save Admin Account
  const handleSaveAdminAccount = (e) => {
    e.preventDefault();
    setSavingSection("account");
    setTimeout(() => {
      setSavingSection(null);
      triggerFeedback("account");
    }, 400);
  };

  // 2. Save Bakery Information
  const handleSaveBakeryInfo = async (e) => {
    e.preventDefault();
    setSavingSection("bakery");
    try {
      await settingsService.updateSettings({
        bakery_name: storeSettings.bakery_name,
        email: storeSettings.email,
        contact_number: storeSettings.contact_number,
        address: storeSettings.address
      });
      triggerFeedback("bakery");
    } catch (err) {
      setErrorMessage("Failed to save bakery information: " + err.message);
    } finally {
      setSavingSection(null);
    }
  };

  // 3. Save Social Media Links (Facebook, Instagram, TikTok)
  const handleSaveSocialLinks = async (e) => {
    e.preventDefault();
    setSavingSection("social");
    try {
      await settingsService.updateSettings({
        social_links: storeSettings.social_links
      });
      triggerFeedback("social");
    } catch (err) {
      setErrorMessage("Failed to save social media links: " + err.message);
    } finally {
      setSavingSection(null);
    }
  };

  // 4. Toggle Order Settings in real time
  const handleToggleOrderOption = async (optionKey) => {
    const currentVal = !!storeSettings.order_settings?.[optionKey];
    const updatedOrderSettings = {
      ...storeSettings.order_settings,
      [optionKey]: !currentVal
    };

    setStoreSettings((prev) => ({
      ...prev,
      order_settings: updatedOrderSettings
    }));

    try {
      await settingsService.updateSettings({
        order_settings: updatedOrderSettings
      });
    } catch (err) {
      console.error("Failed to update order setting:", err);
    }
  };

  const getValidExternalUrl = (url) => {
    if (!url || typeof url !== "string") return "#";
    const trimmed = url.trim();
    if (!trimmed || trimmed === "#") return "#";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your BAKE HOUSE admin settings, bakery details, and social accounts.</p>
      </div>

      {errorMessage && (
        <div className="settings-error-banner">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Account Settings */}
      <div className="settings-section">
        <h2>Admin Account</h2>
        <p className="section-description">
          Manage your administrator account information.
        </p>

        <form className="settings-form" onSubmit={handleSaveAdminAccount}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={adminProfile.name}
              onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={adminProfile.email}
              onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="text"
              value={adminProfile.contact}
              onChange={(e) => setAdminProfile({ ...adminProfile, contact: e.target.value })}
            />
          </div>

          <div className="settings-actions-span">
            <button
              type="submit"
              className="save-btn"
              disabled={savingSection === "account"}
            >
              {savingSection === "account" ? "Saving..." : "Save Changes"}
            </button>
            {savedFeedback === "account" && (
              <span className="save-success-pill">✓ Account changes saved</span>
            )}
          </div>
        </form>
      </div>

      {/* Bakery Information */}
      <div className="settings-section">
        <h2>Bakery Information</h2>
        <p className="section-description">
          Update the contact and location information displayed across your storefront and contact page.
        </p>

        <form className="settings-form" onSubmit={handleSaveBakeryInfo}>
          <div className="form-group">
            <label>Bakery Name</label>
            <input
              type="text"
              value={storeSettings.bakery_name}
              onChange={(e) => setStoreSettings({ ...storeSettings, bakery_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={storeSettings.email}
              onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="text"
              value={storeSettings.contact_number}
              onChange={(e) => setStoreSettings({ ...storeSettings, contact_number: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea
              value={storeSettings.address}
              onChange={(e) => setStoreSettings({ ...storeSettings, address: e.target.value })}
            ></textarea>
          </div>

          <div className="settings-actions-span">
            <button
              type="submit"
              className="save-btn"
              disabled={savingSection === "bakery"}
            >
              {savingSection === "bakery" ? "Saving..." : "Save Information"}
            </button>
            {savedFeedback === "bakery" && (
              <span className="save-success-pill">✓ Bakery information updated</span>
            )}
          </div>
        </form>
      </div>

      {/* Social Media Links (Customizable URL for Contact Us) */}
      <div className="settings-section">
        <div className="section-title-badge-row">
          <h2>Social Media Accounts</h2>
          <span className="section-badge">Contact Us &amp; Footer</span>
        </div>
        <p className="section-description">
          Customize the link URL of the social accounts when customers click them in <strong>Contact Us</strong>.
        </p>

        <form className="settings-form social-settings-form" onSubmit={handleSaveSocialLinks}>
          <div className="form-group social-form-group">
            <label>
              <span className="social-badge-icon facebook-icon">f</span>
              <strong>Facebook Page URL</strong>
            </label>
            <div className="social-input-row">
              <input
                type="text"
                placeholder="https://facebook.com/your-bakery-page"
                value={storeSettings.social_links?.facebook || ""}
                onChange={(e) =>
                  setStoreSettings({
                    ...storeSettings,
                    social_links: { ...storeSettings.social_links, facebook: e.target.value }
                  })
                }
              />
              {storeSettings.social_links?.facebook && storeSettings.social_links.facebook !== "#" && (
                <a
                  href={getValidExternalUrl(storeSettings.social_links.facebook)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-test-link-btn"
                  title="Test and open Facebook link in a new tab"
                >
                  🔗 Test Link
                </a>
              )}
            </div>
            <span className="form-field-hint">
              When clicked on Contact Us, customers will be redirected to this Facebook page.
            </span>
          </div>

          <div className="form-group social-form-group">
            <label>
              <span className="social-badge-icon instagram-icon">📷</span>
              <strong>Instagram Profile URL</strong>
            </label>
            <div className="social-input-row">
              <input
                type="text"
                placeholder="https://instagram.com/your-bakery"
                value={storeSettings.social_links?.instagram || ""}
                onChange={(e) =>
                  setStoreSettings({
                    ...storeSettings,
                    social_links: { ...storeSettings.social_links, instagram: e.target.value }
                  })
                }
              />
              {storeSettings.social_links?.instagram && storeSettings.social_links.instagram !== "#" && (
                <a
                  href={getValidExternalUrl(storeSettings.social_links.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-test-link-btn"
                  title="Test and open Instagram link in a new tab"
                >
                  🔗 Test Link
                </a>
              )}
            </div>
            <span className="form-field-hint">
              When clicked on Contact Us, customers will be redirected to this Instagram profile.
            </span>
          </div>

          <div className="form-group social-form-group">
            <label>
              <span className="social-badge-icon tiktok-icon">🎵</span>
              <strong>TikTok Profile URL</strong>
            </label>
            <div className="social-input-row">
              <input
                type="text"
                placeholder="https://tiktok.com/@your-bakery"
                value={storeSettings.social_links?.tiktok || ""}
                onChange={(e) =>
                  setStoreSettings({
                    ...storeSettings,
                    social_links: { ...storeSettings.social_links, tiktok: e.target.value }
                  })
                }
              />
              {storeSettings.social_links?.tiktok && storeSettings.social_links.tiktok !== "#" && (
                <a
                  href={getValidExternalUrl(storeSettings.social_links.tiktok)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-test-link-btn"
                  title="Test and open TikTok link in a new tab"
                >
                  🔗 Test Link
                </a>
              )}
            </div>
            <span className="form-field-hint">
              When clicked on Contact Us, customers will be redirected to this TikTok account.
            </span>
          </div>

          <div className="social-actions-row">
            <button
              type="submit"
              className="save-btn"
              disabled={savingSection === "social"}
            >
              {savingSection === "social" ? "Saving..." : "Save Social Links"}
            </button>
            {savedFeedback === "social" && (
              <span className="save-success-pill">✓ Social accounts updated! Test them on Contact Us</span>
            )}
          </div>
        </form>
      </div>

      {/* Order Settings */}
      <div className="settings-section">
        <h2>Order Settings</h2>
        <p className="section-description">
          Configure basic order and cake personalization availability.
        </p>

        <div className="setting-option">
          <div>
            <strong>Accept New Orders</strong>
            <p>Allow customers to place new orders through online checkout.</p>
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={!!storeSettings.order_settings?.accept_orders}
              onChange={() => handleToggleOrderOption("accept_orders")}
            />
            <span></span>
          </label>
        </div>

        <div className="setting-option">
          <div>
            <strong>Allow Cake Customization</strong>
            <p>Allow customers to customize 3D/2D cakes with custom flavors and messages.</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link
              to="/admin/customizer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.9rem",
                backgroundColor: "var(--color-primary-50, #fdf6ec)",
                color: "var(--color-primary-600, #b25e1a)",
                border: "1px solid var(--color-primary-200, #f8d7b0)",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: "600",
                textDecoration: "none"
              }}
            >
              🎂 Manage Customizer Options →
            </Link>
            <label className="toggle">
              <input
                type="checkbox"
                checked={!!storeSettings.order_settings?.allow_customization}
                onChange={() => handleToggleOrderOption("allow_customization")}
              />
              <span></span>
            </label>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="settings-section">
        <h2>Security</h2>
        <p className="section-description">
          Manage your administrator account credentials.
        </p>

        <button
          type="button"
          className="change-password-btn"
          onClick={() => alert("To change your password, please contact the system administrator or update your profile.")}
        >
          Change Password
        </button>
      </div>
    </div>
  );
}

export default Settings;