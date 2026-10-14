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
      allow_customization: true,
      delivery_fee: 30
    },
    tax_settings: {
      vat_enabled: true,
      vat_rate: 12,
      vat_type: "exclusive",
      vat_tin: "000-847-293-000"
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
            },
            tax_settings: {
              ...prev.tax_settings,
              ...(data.tax_settings || {})
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

  // 5. Save Order & Delivery Settings
  const handleSaveOrderSettings = async (e) => {
    e.preventDefault();
    setSavingSection("orders");
    try {
      await settingsService.updateSettings({
        order_settings: storeSettings.order_settings
      });
      triggerFeedback("orders");
    } catch (err) {
      setErrorMessage("Failed to save delivery & order settings: " + err.message);
    } finally {
      setSavingSection(null);
    }
  };

  // 6. Save Tax & VAT Settings
  const handleSaveTaxSettings = async (e) => {
    e.preventDefault();
    setSavingSection("tax");
    try {
      await settingsService.updateSettings({
        tax_settings: storeSettings.tax_settings
      });
      triggerFeedback("tax");
    } catch (err) {
      setErrorMessage("Failed to save Tax & VAT settings: " + err.message);
    } finally {
      setSavingSection(null);
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

      {/* Order & Delivery Settings */}
      <div className="settings-section">
        <h2>Order & Delivery Settings</h2>
        <p className="section-description">
          Configure standard delivery fee, customer checkout availability, and cake customization.
        </p>

        <form onSubmit={handleSaveOrderSettings} className="order-delivery-settings-form">
          <div className="delivery-fee-card">
            <div className="delivery-fee-info">
              <strong>Standard Delivery Fee (₱)</strong>
              <p>Charged automatically for home delivery orders at customer checkout. Store Pickup is always free (₱0).</p>
            </div>
            <div className="delivery-fee-input-wrap">
              <span className="currency-prefix">₱</span>
              <input
                type="number"
                min="0"
                step="5"
                placeholder="30"
                value={storeSettings.order_settings?.delivery_fee ?? 30}
                onChange={(e) =>
                  setStoreSettings({
                    ...storeSettings,
                    order_settings: {
                      ...storeSettings.order_settings,
                      delivery_fee: e.target.value === "" ? "" : Number(e.target.value)
                    }
                  })
                }
                className="delivery-fee-input"
              />
              <span className="fee-unit-tag">PHP</span>
            </div>
          </div>

          <div className="setting-option">
            <div>
              <strong>Accept New Online Orders</strong>
              <p>Allow customers to place new delivery and pickup orders at checkout.</p>
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
                className="manage-customizer-btn"
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

          <div className="order-settings-actions-row">
            <button
              type="submit"
              className="save-btn"
              disabled={savingSection === "orders"}
            >
              {savingSection === "orders" ? "Saving..." : "Save Delivery & Order Settings"}
            </button>
            {savedFeedback === "orders" && (
              <span className="save-success-pill">✓ Delivery fee and order settings updated!</span>
            )}
          </div>
        </form>
      </div>

      {/* Tax & VAT Configuration */}
      <div className="settings-section">
        <div className="section-title-badge-row">
          <h2>Tax &amp; VAT Configuration</h2>
          <span className="section-badge vat-badge">Counter POS &amp; Official Receipts</span>
        </div>
        <p className="section-description">
          Configure how Value Added Tax (VAT) is calculated at the counter register and printed on official receipts.
        </p>

        <form onSubmit={handleSaveTaxSettings} className="tax-settings-form">
          <div className="setting-option">
            <div>
              <strong>Enable Value Added Tax (VAT)</strong>
              <p>Calculate and display VAT breakdown on POS bills and printed thermal receipts.</p>
            </div>

            <label className="toggle">
              <input
                type="checkbox"
                checked={storeSettings.tax_settings?.vat_enabled !== false}
                onChange={(e) =>
                  setStoreSettings({
                    ...storeSettings,
                    tax_settings: {
                      ...storeSettings.tax_settings,
                      vat_enabled: e.target.checked
                    }
                  })
                }
              />
              <span></span>
            </label>
          </div>

          {storeSettings.tax_settings?.vat_enabled !== false && (
            <>
              {/* VAT Rate Input */}
              <div className="form-group">
                <label>
                  <strong>VAT Percentage Rate (%)</strong>
                </label>
                <div className="vat-rate-input-wrap">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={storeSettings.tax_settings?.vat_rate ?? 12}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        tax_settings: {
                          ...storeSettings.tax_settings,
                          vat_rate: e.target.value === "" ? "" : Number(e.target.value)
                        }
                      })
                    }
                    placeholder="12"
                    className="vat-rate-input"
                  />
                  <span className="vat-rate-unit">%</span>
                </div>
                <span className="form-field-hint">
                  Standard Philippine retail VAT is 12%. Set to 0% for Non-VAT registered bakeries.
                </span>
              </div>

              {/* VAT Calculation Mode: Exclusive (Add to purchase) vs Inclusive */}
              <div className="form-group">
                <label>
                  <strong>VAT Calculation Method</strong>
                </label>
                <div className="vat-mode-grid">
                  <div
                    className={`vat-mode-card ${storeSettings.tax_settings?.vat_type === "exclusive" ? "selected" : ""}`}
                    onClick={() =>
                      setStoreSettings({
                        ...storeSettings,
                        tax_settings: {
                          ...storeSettings.tax_settings,
                          vat_type: "exclusive"
                        }
                      })
                    }
                  >
                    <div className="vat-mode-radio">
                      <span className={`custom-radio-dot ${storeSettings.tax_settings?.vat_type === "exclusive" ? "active" : ""}`}></span>
                      <strong>Add VAT on top of purchase (Exclusive)</strong>
                    </div>
                    <p>
                      Tax is added on top of the items subtotal at checkout:
                      <br />
                      <em>Total Due = Subtotal + {storeSettings.tax_settings?.vat_rate ?? 12}% VAT</em>
                    </p>
                    <span className="vat-example-pill">
                      Example: ₱100 item + ₱{((100 * (storeSettings.tax_settings?.vat_rate ?? 12)) / 100).toFixed(2)} VAT = <strong>₱{(100 + (100 * (storeSettings.tax_settings?.vat_rate ?? 12)) / 100).toFixed(2)} Total</strong>
                    </span>
                  </div>

                  <div
                    className={`vat-mode-card ${storeSettings.tax_settings?.vat_type === "inclusive" ? "selected" : ""}`}
                    onClick={() =>
                      setStoreSettings({
                        ...storeSettings,
                        tax_settings: {
                          ...storeSettings.tax_settings,
                          vat_type: "inclusive"
                        }
                      })
                    }
                  >
                    <div className="vat-mode-radio">
                      <span className={`custom-radio-dot ${storeSettings.tax_settings?.vat_type === "inclusive" ? "active" : ""}`}></span>
                      <strong>Include VAT in menu prices (Inclusive)</strong>
                    </div>
                    <p>
                      Item prices already cover the tax (no extra charge added):
                      <br />
                      <em>Total Due = Subtotal (VAT breakdown shown on receipt)</em>
                    </p>
                    <span className="vat-example-pill">
                      Example: ₱100 item = <strong>₱100.00 Total</strong> (₱{(100 - (100 / (1 + (storeSettings.tax_settings?.vat_rate ?? 12) / 100))).toFixed(2)} VAT included)
                    </span>
                  </div>
                </div>
              </div>

              {/* VAT TIN Number for Receipt */}
              <div className="form-group">
                <label>
                  <strong>VAT Registration TIN (Printed on Receipts)</strong>
                </label>
                <input
                  type="text"
                  placeholder="000-847-293-000"
                  value={storeSettings.tax_settings?.vat_tin || ""}
                  onChange={(e) =>
                    setStoreSettings({
                      ...storeSettings,
                      tax_settings: {
                        ...storeSettings.tax_settings,
                        vat_tin: e.target.value
                      }
                    })
                  }
                />
                <span className="form-field-hint">
                  This Taxpayer Identification Number will be printed on all Official Receipts &amp; Invoices.
                </span>
              </div>
            </>
          )}

          <div className="tax-settings-actions-row">
            <button
              type="submit"
              className="save-btn"
              disabled={savingSection === "tax"}
            >
              {savingSection === "tax" ? "Saving..." : "Save Tax & VAT Settings"}
            </button>
            {savedFeedback === "tax" && (
              <span className="save-success-pill">✓ Tax &amp; VAT settings updated! POS register updated live.</span>
            )}
          </div>
        </form>
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