/**
 * ============================================================================
 * BAKE HOUSE - Admin & Staff Portal Layout (Modern Sidebar + Ops Header)
 * ============================================================================
 * Capstone Project Explanation:
 * Matches the dedicated BakeSmart / BAKE HOUSE Admin Dashboard design:
 * 1. Clean Left Sidebar with active gold accent indicators.
 * 2. Top Operations Bar with real-time search, Live Operations indicator,
 *    notifications, and user profile avatar.
 * 3. Role-aware routes (Admin vs Staff).
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { authService } from "../../services/authService";
import "./AdminLayout.css";

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(authService.getCurrentUser());
    };
    window.addEventListener("authChange", handleAuthChange);
    return () => window.removeEventListener("authChange", handleAuthChange);
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate("/account");
  };

  const role = currentUser?.role || "admin";

  const isActive = (path) => {
    if (path === "/admin" && location.pathname === "/admin") return true;
    if (path !== "/admin" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="bakesmart-admin-layout">
      {/* 1. LEFT SIDEBAR */}
      <aside className="bakesmart-sidebar">
        {/* Brand Header */}
        <div className="bakesmart-brand">
          <div className="bakesmart-brand-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.55.45-3 1.22-4.23l11.01 11.01C13.99 19.45 13.04 20 12 20zm6.78-3.77L7.77 5.22C8.99 4.45 10.44 4 12 4c4.41 0 8 3.59 8 8 0 1.56-.45 3.01-1.22 4.23z"/>
            </svg>
          </div>
          <div className="bakesmart-brand-text">
            <h2>BAKE HOUSE</h2>
            <span>{role === 'staff' ? 'STAFF PORTAL' : 'ADMIN PORTAL'}</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="bakesmart-nav">
          <Link
            to="/admin"
            className={`bakesmart-nav-item ${isActive("/admin") ? "active" : ""}`}
          >
            <span className="nav-icon">🎛️</span>
            <span className="nav-label">Dashboard</span>
          </Link>

          <Link
            to="/admin/pos"
            className={`bakesmart-nav-item ${isActive("/admin/pos") ? "active" : ""}`}
          >
            <span className="nav-icon">🖥️</span>
            <span className="nav-label">Counter POS</span>
          </Link>

          <Link
            to="/admin/queue"
            className={`bakesmart-nav-item ${isActive("/admin/queue") ? "active" : ""}`}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">Order Queues</span>
          </Link>

          <Link
            to="/admin/products"
            className={`bakesmart-nav-item ${isActive("/admin/products") ? "active" : ""}`}
          >
            <span className="nav-icon">🍰</span>
            <span className="nav-label">Products</span>
          </Link>

          <Link
            to="/admin/customizer"
            className={`bakesmart-nav-item ${isActive("/admin/customizer") ? "active" : ""}`}
          >
            <span className="nav-icon">🎂</span>
            <span className="nav-label">Cake Customizer</span>
          </Link>

          {role === 'admin' && (
            <>
              <Link
                to="/admin/customers"
                className={`bakesmart-nav-item ${isActive("/admin/customers") ? "active" : ""}`}
              >
                <span className="nav-icon">👥</span>
                <span className="nav-label">Customers</span>
              </Link>

              <Link
                to="/admin/reports"
                className={`bakesmart-nav-item ${isActive("/admin/reports") ? "active" : ""}`}
              >
                <span className="nav-icon">📊</span>
                <span className="nav-label">Reports & Analytics</span>
              </Link>

              <Link
                to="/admin/settings"
                className={`bakesmart-nav-item ${isActive("/admin/settings") ? "active" : ""}`}
              >
                <span className="nav-icon">⚙️</span>
                <span className="nav-label">Settings</span>
              </Link>
            </>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="bakesmart-sidebar-footer">
          <Link to="/" className="bakesmart-store-link">
            <span>←</span> Back to Store
          </Link>

          <div className="bakesmart-user-row">
            <div className="bakesmart-user-info">
              <span className="bakesmart-user-name">
                {currentUser?.first_name || currentUser?.username || "Admin"}
              </span>
              <span className={`bakesmart-user-role ${role}`}>
                {role.toUpperCase()}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="bakesmart-logout-btn"
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN ADMIN CONTENT CONTAINER */}
      <div className="bakesmart-main-container">
        {/* Top Operations Header */}
        <header className="bakesmart-top-header">
          <div className="bakesmart-search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search orders, ingredients, or riders..."
              className="bakesmart-search-input"
            />
          </div>

          <div className="bakesmart-header-actions">
            <div className="bakesmart-live-badge">
              <span className="live-dot"></span>
              Live Operations
            </div>

            <button className="header-icon-btn" title="Notifications">
              🔔
            </button>

            <div className="header-profile-avatar" title={currentUser?.email || "Profile"}>
              <img
                src={currentUser?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                alt="User"
              />
            </div>
          </div>
        </header>

        {/* Dynamic Admin Sub-Page */}
        <main className="bakesmart-page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;