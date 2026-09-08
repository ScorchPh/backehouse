import { Link } from "react-router-dom";
import "./Settings.css";

function Settings() {
  return (
    <div className="settings-page">

      {/* Header */}
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your BAKE HOUSE admin settings.</p>
      </div>

      {/* Account Settings */}
      <div className="settings-section">

        <h2>Admin Account</h2>
        <p className="section-description">
          Manage your administrator account information.
        </p>

        <div className="settings-form">

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              defaultValue="BAKE HOUSE Admin"
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              defaultValue="admin@bakehouse.com"
            />
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="text"
              defaultValue="0917-000-0000"
            />
          </div>

          <button className="save-btn">
            Save Changes
          </button>

        </div>

      </div>

      {/* Bakery Information */}
      <div className="settings-section">

        <h2>Bakery Information</h2>
        <p className="section-description">
          Update the information displayed for your bakery.
        </p>

        <div className="settings-form">

          <div className="form-group">
            <label>Bakery Name</label>
            <input
              type="text"
              defaultValue="BAKE HOUSE"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              defaultValue="info@bakehouse.com"
            />
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="text"
              defaultValue="0917-123-4567"
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea
              defaultValue="Cebu, Philippines"
            ></textarea>
          </div>

          <button className="save-btn">
            Save Information
          </button>

        </div>

      </div>

      {/* Order Settings */}
      <div className="settings-section">

        <h2>Order Settings</h2>
        <p className="section-description">
          Configure basic order options.
        </p>

        <div className="setting-option">

          <div>
            <strong>Accept New Orders</strong>
            <p>
              Allow customers to place new orders.
            </p>
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              defaultChecked
            />
            <span></span>
          </label>

        </div>

        <div className="setting-option">

          <div>
            <strong>Allow Cake Customization</strong>
            <p>
              Allow customers to customize their cakes.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link 
              to="/admin/customizer" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.9rem',
                backgroundColor: 'var(--color-primary-50, #fdf6ec)',
                color: 'var(--color-primary-600, #b25e1a)',
                border: '1px solid var(--color-primary-200, #f8d7b0)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              🎂 Manage Customizer Options →
            </Link>
            <label className="toggle">
              <input
                type="checkbox"
                defaultChecked
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
          Manage your administrator password.
        </p>

        <button className="change-password-btn">
          Change Password
        </button>

      </div>

    </div>
  );
}

export default Settings;