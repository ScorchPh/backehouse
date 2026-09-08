/**
 * ============================================================================
 * BAKE HOUSE - Admin Orders Dashboard & Master Archive
 * ============================================================================
 * Features:
 * 1. Financial & Order Volume KPI Dashboard
 * 2. Master Historical Ledger with search & filter
 * 3. Deep Order Inspection Modal with full item breakdown & print slip
 * 4. Quick navigation link to the dedicated Live Kitchen Queue
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Orders.css";
import { orderService } from "../../../services/orderService";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getOrders({
        status: statusFilter,
        search: searchTerm,
      });
      if (res && res.orders) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.error("Failed to fetch orders archive:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchTerm]);

  const isOrderScheduled = (o) => {
    if (o.is_scheduled === true || o.is_scheduled === "true" || o.is_scheduled === 1 || o.is_scheduled === "1") return true;
    if (o.scheduled_date) return true;
    if (o.items && Array.isArray(o.items)) {
      return o.items.some((it) => it.customization?.scheduled_date || it.scheduled_date);
    }
    return false;
  };

  const getScheduledInfo = (o) => {
    if (o.scheduled_date) {
      return { date: o.scheduled_date, time: o.scheduled_time || "Standard Delivery Window" };
    }
    if (o.items && Array.isArray(o.items)) {
      const it = o.items.find((i) => i.customization?.scheduled_date || i.scheduled_date);
      if (it) {
        return {
          date: it.customization?.scheduled_date || it.scheduled_date,
          time: it.customization?.scheduled_time || it.scheduled_time || "Standard Delivery Window"
        };
      }
    }
    return null;
  };

  // Filtered by fulfillment (Pickup vs Delivery)
  const displayedOrders = orders.filter((o) => {
    if (fulfillmentFilter === "all") return true;
    const isPickup =
      (o.fulfillment_type && o.fulfillment_type.toLowerCase() === "pickup") ||
      (o.delivery_address && o.delivery_address.toLowerCase().includes("pickup"));
    return fulfillmentFilter === "pickup" ? isPickup : !isPickup;
  });

  // Analytics Metrics
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => (o.status || "").toLowerCase() === "completed");
  const pendingOrders = orders.filter((o) => (o.status || "").toLowerCase() === "pending");
  const inProgressOrders = orders.filter((o) => {
    const s = (o.status || "").toLowerCase();
    return s === "confirmed" || s === "preparing" || s === "ready for pickup" || s === "for delivery";
  });
  const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  const avgOrderValue = totalOrders > 0 ? (orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) / totalOrders) : 0;

  return (
    <div className="orders-page">
      {/* Header */}
      <div className="orders-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <Link to="/admin" style={{ textDecoration: "none", color: "#54331D", fontWeight: "700", fontSize: "0.9rem" }}>
              ← Back to Dashboard
            </Link>
          </div>
          <h1>📦 All Orders History</h1>
          <p>Master customer orders registry, fulfillment records, and transaction archive.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link to="/admin/queue" className="open-kitchen-queue-link">
            📋 Go to Order Queues ({pendingOrders.length + inProgressOrders.length} active)
          </Link>
          <button className="refresh-orders-btn" onClick={fetchOrders} title="Refresh records">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* KPI Dashboard Grid */}
      <div className="order-summary-grid">
        <div className="summary-metric-card" onClick={() => setStatusFilter("all")}>
          <div className="metric-icon">💰</div>
          <div>
            <span>Fulfilled Revenue</span>
            <strong style={{ color: "#047857" }}>₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>

        <div className="summary-metric-card" onClick={() => setStatusFilter("all")}>
          <div className="metric-icon">📋</div>
          <div>
            <span>Total Orders Placed</span>
            <strong>{totalOrders}</strong>
          </div>
        </div>

        <div className="summary-metric-card" onClick={() => setStatusFilter("pending")}>
          <div className="metric-icon">⏳</div>
          <div>
            <span>Pending Orders</span>
            <strong style={{ color: "#D97706" }}>{pendingOrders.length}</strong>
          </div>
        </div>

        <div className="summary-metric-card" onClick={() => setStatusFilter("preparing")}>
          <div className="metric-icon">👨‍🍳</div>
          <div>
            <span>In Kitchen Prep</span>
            <strong style={{ color: "#7C3AED" }}>{inProgressOrders.length}</strong>
          </div>
        </div>

        <div className="summary-metric-card" onClick={() => setStatusFilter("completed")}>
          <div className="metric-icon">✅</div>
          <div>
            <span>Completed Orders</span>
            <strong style={{ color: "#059669" }}>{completedOrders.length}</strong>
          </div>
        </div>

        <div className="summary-metric-card">
          <div className="metric-icon">📈</div>
          <div>
            <span>Average Order Value</span>
            <strong style={{ color: "#1D4ED8" }}>₱{avgOrderValue.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="orders-panel">
        <div className="orders-tools-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by Order ID, customer name, contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="styled-select"
            >
              <option value="all">All Statuses</option>
              <option value="pending">🟡 Pending</option>
              <option value="confirmed">🔵 Confirmed</option>
              <option value="preparing">🟣 Preparing (Bake)</option>
              <option value="ready for pickup">🏪 Ready for Pickup</option>
              <option value="for delivery">🚚 For Delivery</option>
              <option value="completed">🟢 Completed</option>
              <option value="denied">🔴 Denied / Cancelled</option>
            </select>

            <select
              value={fulfillmentFilter}
              onChange={(e) => setFulfillmentFilter(e.target.value)}
              className="styled-select"
            >
              <option value="all">All Fulfillment Types</option>
              <option value="delivery">🚚 Delivery Only</option>
              <option value="pickup">🏪 Pickup Only</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="orders-table-wrapper">
          <div className="orders-table-header">
            <span>Order ID</span>
            <span>Customer & Type</span>
            <span>Date & Time</span>
            <span>Items Summary</span>
            <span>Total Amount</span>
            <span>Current Status</span>
            <span>Actions</span>
          </div>

          {loading ? (
            <div className="orders-loading-state">
              <div className="spinner"></div>
              <p>Loading bakery orders...</p>
            </div>
          ) : displayedOrders.length === 0 ? (
            <div className="orders-empty-state">
              <span style={{ fontSize: "32px" }}>🍰</span>
              <p>No orders found matching your search or filters.</p>
            </div>
          ) : (
            displayedOrders.map((order) => {
              const isPickup =
                (order.fulfillment_type && order.fulfillment_type.toLowerCase() === "pickup") ||
                (order.delivery_address && order.delivery_address.toLowerCase().includes("pickup"));
              const isDenied = order.status === "Denied" || order.status === "Cancelled";
              const scheduledInfo = getScheduledInfo(order);

              return (
                <div className={`orders-table-row ${isDenied ? "row-denied" : ""}`} key={order.id}>
                  {/* Order ID */}
                  <div className="col-order-id">
                    <strong>#{order.id}</strong>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "2px" }}>
                      {scheduledInfo && (
                        <span className="scheduled-order-chip">📅 ADVANCE EVENT</span>
                      )}
                      {order.distance_km && !isPickup && (
                        <span className="distance-chip">{order.distance_km} km</span>
                      )}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="col-customer">
                    <span className="customer-name">{order.customer_name}</span>
                    <div className="customer-sub">
                      <span className={`fulfillment-badge ${isPickup ? "badge-pickup" : "badge-delivery"}`}>
                        {isPickup ? "🏪 PICKUP" : "🚚 DELIVERY"}
                      </span>
                      <small className="customer-phone">{order.customer_contact}</small>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="col-date">
                    {scheduledInfo ? (
                      <div className="scheduled-date-cell">
                        <strong className="event-date-highlight">📅 {scheduledInfo.date}</strong>
                        <small className="event-time-sub">{scheduledInfo.time}</small>
                      </div>
                    ) : (
                      <span>{order.formatted_date || order.created_at || order.date}</span>
                    )}
                  </div>

                  {/* Items */}
                  <div className="col-items">
                    <span className="items-summary-text">
                      {order.items_summary || (order.items ? `${order.items.length} item(s)` : "Bakery Items")}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="col-total">
                    <strong>₱{parseFloat(order.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    <small>{order.payment_method || "Cash on Delivery"}</small>
                  </div>

                  {/* Status Pill */}
                  <div className="col-status">
                    <span className={`status-pill status-${(order.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>
                      ● {order.status || "Pending"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-actions">
                    <button
                      className="view-order-btn"
                      onClick={() => setSelectedOrder(order)}
                      title="Inspect full order details"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="order-details-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal-header">
              <div>
                <div className="modal-title-row">
                  <h2>Order #{selectedOrder.id}</h2>
                  <span className={`status-pill status-${(selectedOrder.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>
                    ● {selectedOrder.status || "Pending"}
                  </span>
                </div>
                <p className="order-timestamp">
                  📅 Placed on {selectedOrder.formatted_date || selectedOrder.created_at || selectedOrder.date}
                </p>
              </div>

              <div className="header-actions">
                <button
                  type="button"
                  className="print-slip-btn"
                  onClick={() => window.print()}
                  title="Print Kitchen Preparation Slip"
                >
                  🖨️ Print Slip
                </button>
                <button className="close-modal-btn" onClick={() => setSelectedOrder(null)}>✕</button>
              </div>
            </div>

            <div className="order-modal-body">
              {/* Denial Notice Banner if order is Denied */}
              {(selectedOrder.status === "Denied" || selectedOrder.status === "Cancelled") && (
                <div className="modal-denied-banner">
                  <div className="denied-banner-icon">⚠️</div>
                  <div>
                    <strong>Order Denied / Cancelled</strong>
                    <p>Reason: {selectedOrder.denial_reason || selectedOrder.cancellation_reason || "Unable to fulfill order."}</p>
                    {selectedOrder.denied_at && <small>Recorded on: {selectedOrder.denied_at}</small>}
                  </div>
                </div>
              )}

              {/* Scheduled Event Banner */}
              {getScheduledInfo(selectedOrder) && (
                <div style={{
                  background: "#FFFBEB",
                  border: "1.5px solid #FCD34D",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "18px"
                }}>
                  <span style={{ fontSize: "1.8rem" }}>📅</span>
                  <div>
                    <strong style={{ color: "#92400E", fontSize: "0.95rem" }}>
                      Scheduled Advance Order for: {getScheduledInfo(selectedOrder).date}
                    </strong>
                    <p style={{ margin: "2px 0 0", color: "#B45309", fontSize: "0.85rem" }}>
                      Preferred Time Slot: <strong>{getScheduledInfo(selectedOrder).time}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Info 3-Card Grid */}
              <div className="modal-info-grid">
                {/* 1. Customer Card */}
                <div className="info-box-card">
                  <div className="info-box-header">
                    <span>👤 Customer Details</span>
                  </div>
                  <strong className="info-primary">{selectedOrder.customer_name}</strong>
                  <p className="info-sub">
                    📞 <a href={`tel:${selectedOrder.customer_contact}`}>{selectedOrder.customer_contact || "N/A"}</a>
                  </p>
                  {selectedOrder.user_id && <small className="user-tag">Registered Account (ID #{selectedOrder.user_id})</small>}
                </div>

                {/* 2. Fulfillment Card */}
                <div className="info-box-card">
                  <div className="info-box-header">
                    <span>
                      {(selectedOrder.fulfillment_type || "").toLowerCase() === "pickup" ? "🏪 Store Pickup" : "🚚 Home Delivery"}
                    </span>
                  </div>
                  <strong className="info-primary">
                    {(selectedOrder.fulfillment_type || "").toLowerCase() === "pickup" ? "Pickup at Counter" : "Door Delivery"}
                  </strong>
                  <p className="info-sub">
                    📍 {selectedOrder.delivery_address || "Poblacion, Cordova, Cebu"}
                  </p>
                  {selectedOrder.delivery_coordinates && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedOrder.delivery_coordinates.lat},${selectedOrder.delivery_coordinates.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="map-nav-btn"
                    >
                      🗺️ Open Navigation ({selectedOrder.distance_km ? `${selectedOrder.distance_km} km` : "GPS Pin"})
                    </a>
                  )}
                </div>

                {/* 3. Payment & Totals Card */}
                <div className="info-box-card">
                  <div className="info-box-header">
                    <span>💳 Payment & Total</span>
                  </div>
                  <strong className="info-primary">
                    ₱{parseFloat(selectedOrder.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                  <p className="info-sub">
                    Method: <strong>{selectedOrder.payment_method || "Cash on Delivery"}</strong>
                  </p>
                  <span className="payment-status-pill">
                    {selectedOrder.status === "Completed" ? "✅ Payment Settled" : "⏳ Pending Payment / COD"}
                  </span>
                </div>
              </div>

              {/* Items Section */}
              <div className="modal-items-section">
                <h3>🍰 Items in this Order</h3>
                <div className="items-card-list">
                  {selectedOrder.items && selectedOrder.items.map((it, idx) => (
                    <div className="order-item-detail-card" key={idx}>
                      <div className="item-main-row">
                        <div className="item-title-qty">
                          <span className="qty-badge">{it.quantity}×</span>
                          <strong>{it.product_name || it.name}</strong>
                        </div>
                        <div className="item-pricing">
                          <span>₱{parseFloat(it.price || 0).toFixed(2)} each</span>
                          <strong className="row-total">
                            ₱{(parseFloat(it.price || 0) * parseInt(it.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                      </div>

                      {/* Custom Cake Specifications */}
                      {it.customization && (
                        <div className="item-customization-box">
                          <span className="custom-tag"><strong>Size:</strong> {it.customization.size}</span>
                          <span className="custom-tag"><strong>Flavor:</strong> {it.customization.flavor}</span>
                          <span className="custom-tag"><strong>Shape:</strong> {it.customization.shape}</span>
                          <span className="custom-tag"><strong>Frosting:</strong> {it.customization.color}</span>
                          {it.customization.occasion && (
                            <span className="custom-tag"><strong>Occasion:</strong> {it.customization.occasion}</span>
                          )}
                          {it.customization.message && (
                            <div className="custom-message-row">
                              ✍️ <em>"{it.customization.message}"</em>
                            </div>
                          )}
                          {it.customization.instructions && (
                            <div className="custom-notes-row">
                              📝 <em>Notes: {it.customization.instructions}</em>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="modal-totals-breakdown">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <strong>₱{parseFloat(selectedOrder.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="total-row">
                  <span>Fulfillment Fee:</span>
                  <strong>₱{parseFloat(selectedOrder.delivery_fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="total-row grand-total">
                  <span>Total Amount:</span>
                  <strong>₱{parseFloat(selectedOrder.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="order-modal-footer">
              <Link to="/admin/queue" className="view-order-btn" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                ⚡ Go to Kitchen Queue to Change Status
              </Link>
              <button
                type="button"
                className="close-footer-btn"
                onClick={() => setSelectedOrder(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;