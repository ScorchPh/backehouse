/**
 * ============================================================================
 * BAKE HOUSE - Admin Dashboard Component
 * ============================================================================
 * Capstone Project Explanation:
 * Visualizes store analytics retrieved dynamically from /api/admin/dashboard_stats.php:
 * 1. Total Orders count
 * 2. Preparation (Baking) queue count
 * 3. Out for Delivery count
 * 4. Total Store Revenue (PHP)
 * 5. Recent incoming orders
 * 6. Popular / Best-Selling items
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../../services/adminService";
import { authService } from "../../../services/authService";
import "./Dashboard.css";

function Dashboard() {
  const currentUser = authService.getCurrentUser();
  const [stats, setStats] = useState({
    total_orders: 0,
    preparing_orders: 0,
    delivery_orders: 0,
    total_revenue: 0,
    formatted_revenue: "₱0.00",
    low_stock_products: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const data = await adminService.getDashboardStats();
        if (data && data.success) {
          setStats(data.stats);
          setRecentOrders(data.recent_orders || []);
          setPopularProducts(data.popular_products || []);
        }
      } catch (err) {
        console.warn("Could not load dashboard statistics:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const todayString = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {currentUser?.first_name || "Admin"}! Here's what's happening at BAKE HOUSE today.</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            to="/admin/pos"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #E69526, #C77810)",
              color: "#FFFFFF",
              textDecoration: "none",
              padding: "10px 18px",
              borderRadius: "10px",
              fontWeight: "800",
              fontSize: "0.9rem",
              boxShadow: "0 4px 12px rgba(230, 149, 38, 0.3)",
              transition: "all 0.2s ease"
            }}
          >
            <span>🖥️</span> Open Counter POS
          </Link>

          <button className="dashboard-date">
            📅 {todayString}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div>
            <p>Total Orders</p>
            <h2>{stats.total_orders}</h2>
            <span className="positive">All-time placed orders</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👨‍🍳</div>
          <div>
            <p>In Preparation</p>
            <h2>{stats.preparing_orders}</h2>
            <span>Currently baking/packing</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚚</div>
          <div>
            <p>For Delivery</p>
            <h2>{stats.delivery_orders}</h2>
            <span>Out with rider</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div>
            <p>Total Revenue</p>
            <h2>{stats.formatted_revenue || `₱${stats.total_revenue.toLocaleString()}`}</h2>
            <span className="positive">Store sales</span>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {/* Recent Orders */}
        <div className="dashboard-panel recent-orders">
          <div className="panel-header">
            <h2>Recent Orders</h2>
            <Link to="/admin/orders" style={{ textDecoration: "none" }}>
              <button>View All</button>
            </Link>
          </div>

          <div className="order-table">
            <div className="table-header">
              <span>Order ID</span>
              <span>Customer</span>
              <span>Amount</span>
              <span>Status</span>
            </div>

            {recentOrders.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
                No recent orders found.
              </div>
            ) : (
              recentOrders.map((ord) => (
                <div className="table-row" key={ord.id}>
                  <span><strong>{ord.id}</strong></span>
                  <span>{ord.customer_name}</span>
                  <span>₱{parseFloat(ord.total || 0).toLocaleString()}</span>
                  <span className={`status ${(ord.status || 'pending').toLowerCase().replace(' ', '-')}`}>
                    {ord.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Popular Products */}
        <div className="dashboard-panel popular-products">
          <div className="panel-header">
            <h2>Popular Products</h2>
            <Link to="/menu" style={{ textDecoration: "none" }}>
              <button>View Menu</button>
            </Link>
          </div>

          {popularProducts.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
              No products found.
            </div>
          ) : (
            popularProducts.map((prod) => (
              <div className="product-item" key={prod.id}>
                <div className="product-placeholder">
                  {prod.category === 'Cake' ? '🍰' : prod.category === 'Pastry' ? '🥐' : '🍞'}
                </div>

                <div>
                  <h3>{prod.name}</h3>
                  <p>{prod.category} • Stock: {prod.stock || 0}</p>
                </div>

                <strong>₱{parseFloat(prod.price || 0).toLocaleString()}</strong>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;