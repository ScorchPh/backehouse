/**
 * ============================================================================
 * BAKE HOUSE - Live Kitchen & Fulfillment Queue Component
 * ============================================================================
 * Features:
 * 1. Dedicated Kitchen Dispatch Hub:
 *    - ⚡ Today's Live Queue (immediate baking & delivery/pickup today).
 *    - 📅 Scheduled & Advance Bookings (custom cake events & future deliveries).
 * 2. Rapid Status Control & Workflow Advancer:
 *    - Confirm Order -> Start Baking -> Mark Ready / In Transit -> Mark Completed.
 *    - Quick Deny with Reason modal.
 * 3. Kitchen Print Slips & Live Urgency Indicators.
 * ============================================================================
 */

import { useState, useEffect } from "react";
import "./Queue.css";
import { orderService } from "../../../services/orderService";

const PRESET_DENIAL_REASONS = [
  "📍 Out of delivery coverage / unreachable address",
  "🧁 Requested flavor or ingredient temporarily out of stock",
  "📞 Customer cannot be reached via call / SMS",
  "👨‍🍳 Kitchen capacity exceeded / Store closing",
  "⚠️ Incomplete or invalid customer information",
  "✏️ Custom Reason (Specify below)"
];

function Queue() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQueueTab, setActiveQueueTab] = useState("today"); // 'today' vs 'scheduled'
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Deny modal
  const [denyModalOrder, setDenyModalOrder] = useState(null);
  const [selectedReasonPreset, setSelectedReasonPreset] = useState(PRESET_DENIAL_REASONS[0]);
  const [customReasonText, setCustomReasonText] = useState("");
  const [isSubmittingDenial, setIsSubmittingDenial] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getOrders();
      if (res && res.orders) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.error("Failed to fetch kitchen queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Auto-refresh queue every 30 seconds for live kitchen operations
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const handleStatusChange = async (order, newStatus) => {
    if (newStatus === "Denied" || newStatus === "Cancelled") {
      openDenyModal(order);
      return;
    }

    try {
      setUpdatingId(order.id);
      const res = await orderService.updateOrderStatus(order.id, newStatus);
      if (res.success) {
        setOrders((prev) =>
          prev.map((ord) => (ord.id === order.id ? { ...ord, status: newStatus } : ord))
        );
        if (selectedOrder && selectedOrder.id === order.id) {
          setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const openDenyModal = (order) => {
    setDenyModalOrder(order);
    setSelectedReasonPreset(PRESET_DENIAL_REASONS[0]);
    setCustomReasonText("");
  };

  const handleConfirmDenial = async () => {
    if (!denyModalOrder) return;
    const finalReason = selectedReasonPreset.includes("Custom Reason")
      ? (customReasonText.trim() || "Order cancelled by store.")
      : (customReasonText.trim() ? `${selectedReasonPreset} - ${customReasonText.trim()}` : selectedReasonPreset);

    try {
      setIsSubmittingDenial(true);
      const res = await orderService.updateOrderStatus(denyModalOrder.id, "Denied", finalReason);
      if (res.success) {
        setOrders((prev) =>
          prev.map((ord) =>
            ord.id === denyModalOrder.id
              ? { ...ord, status: "Denied", denial_reason: finalReason, denied_at: new Date().toLocaleString() }
              : ord
          )
        );
        if (selectedOrder && selectedOrder.id === denyModalOrder.id) {
          setSelectedOrder((prev) => ({
            ...prev,
            status: "Denied",
            denial_reason: finalReason,
            denied_at: new Date().toLocaleString()
          }));
        }
        setDenyModalOrder(null);
      }
    } catch (err) {
      alert("Failed to deny order: " + err.message);
    } finally {
      setIsSubmittingDenial(false);
    }
  };

  // Active kitchen queue items (Pending, Confirmed, Preparing, Ready/Delivering)
  const activeOrders = orders.filter((o) => o.status !== "Completed" && o.status !== "Denied" && o.status !== "Cancelled");
  const todayQueue = activeOrders.filter((o) => !isOrderScheduled(o));
  const scheduledQueue = activeOrders.filter((o) => isOrderScheduled(o));

  const currentDisplayList = activeQueueTab === "today" ? todayQueue : scheduledQueue;

  return (
    <div className="kitchen-queue-page">
      {/* Header */}
      <div className="queue-header">
        <div>
          <h1>📋 Order Queues & Status Operations</h1>
          <p>Real-time order fulfillment dispatcher. Manage live today's orders and advance scheduled bookings.</p>
        </div>

        <div className="queue-header-actions">
          <span className="live-pulse-badge">
            <span className="pulse-dot"></span> Auto-Syncing (30s)
          </span>
          <button className="refresh-queue-btn" onClick={fetchOrders} title="Refresh Live Queue">
            🔄 Refresh Queue
          </button>
        </div>
      </div>

      {/* Two Main Queue Tabs */}
      <div className="queue-tab-selector-bar">
        <button
          type="button"
          className={`queue-main-tab ${activeQueueTab === "today" ? "active" : ""}`}
          onClick={() => setActiveQueueTab("today")}
        >
          <span className="tab-icon">⚡</span>
          <div className="tab-text-group">
            <strong>Today's Live Queue</strong>
            <small>Active orders for immediate baking & dispatch</small>
          </div>
          <span className="queue-count-pill">{todayQueue.length}</span>
        </button>

        <button
          type="button"
          className={`queue-main-tab ${activeQueueTab === "scheduled" ? "active" : ""}`}
          onClick={() => setActiveQueueTab("scheduled")}
        >
          <span className="tab-icon">📅</span>
          <div className="tab-text-group">
            <strong>Scheduled & Advance Orders</strong>
            <small>Custom cakes & bookings for future event dates</small>
          </div>
          <span className="queue-count-pill scheduled">{scheduledQueue.length}</span>
        </button>
      </div>

      {/* Status Pipeline Cards Summary */}
      <div className="queue-status-track">
        <div className="status-track-step pending">
          <span className="step-icon">🟡</span>
          <div>
            <span>Pending Acceptance</span>
            <strong>{currentDisplayList.filter((o) => o.status === "Pending").length}</strong>
          </div>
        </div>
        <div className="status-track-step confirmed">
          <span className="step-icon">🔵</span>
          <div>
            <span>Confirmed / In Queue</span>
            <strong>{currentDisplayList.filter((o) => o.status === "Confirmed").length}</strong>
          </div>
        </div>
        <div className="status-track-step preparing">
          <span className="step-icon">👨‍🍳</span>
          <div>
            <span>Currently Baking</span>
            <strong>{currentDisplayList.filter((o) => o.status === "Preparing").length}</strong>
          </div>
        </div>
        <div className="status-track-step ready">
          <span className="step-icon">🚚</span>
          <div>
            <span>Ready / In Transit</span>
            <strong>{currentDisplayList.filter((o) => o.status === "Ready for Pickup" || o.status === "For Delivery").length}</strong>
          </div>
        </div>
      </div>

      {/* Queue Cards Grid */}
      <div className="queue-cards-container">
        {loading ? (
          <div className="queue-loading">
            <div className="spinner"></div>
            <p>Loading kitchen queue...</p>
          </div>
        ) : currentDisplayList.length === 0 ? (
          <div className="queue-empty-state">
            <span style={{ fontSize: "48px" }}>🎉</span>
            <h3>No Orders Waiting in this Queue</h3>
            <p>All active bakery orders in this section are currently completed or fulfilled!</p>
          </div>
        ) : (
          <div className="queue-cards-grid">
            {currentDisplayList.map((order) => {
              const isPickup =
                (order.fulfillment_type && order.fulfillment_type.toLowerCase() === "pickup") ||
                (order.delivery_address && order.delivery_address.toLowerCase().includes("pickup"));
              const scheduledInfo = getScheduledInfo(order);

              return (
                <div className={`queue-card status-border-${(order.status || "pending").toLowerCase().replace(/\s+/g, "-")}`} key={order.id}>
                  {/* Card Header */}
                  <div className="queue-card-top">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3 className="queue-order-id">#{order.id}</h3>
                        <span className={`queue-fulfillment-tag ${isPickup ? "tag-pickup" : "tag-delivery"}`}>
                          {isPickup ? "🏪 PICKUP" : "🚚 DELIVERY"}
                        </span>
                      </div>
                      <span className="queue-customer-name">👤 {order.customer_name}</span>
                    </div>

                    <div className="queue-status-pill-box">
                      <span className={`queue-status-badge status-${(order.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>
                        ● {order.status || "Pending"}
                      </span>
                    </div>
                  </div>

                  {/* Scheduled Event Highlight Banner if present */}
                  {scheduledInfo && (
                    <div className="queue-scheduled-banner">
                      <span>📅 Event Date: <strong>{scheduledInfo.date}</strong></span>
                      <small>🕒 {scheduledInfo.time}</small>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="queue-items-box">
                    <strong>Items to Prepare:</strong>
                    <ul className="queue-items-list">
                      {order.items && order.items.map((it, idx) => (
                        <li key={idx}>
                          <span className="queue-qty-tag">{it.quantity}×</span>
                          <span className="queue-item-name">{it.product_name || it.name}</span>
                          {it.customization && (
                            <span className="queue-custom-note">
                              ({it.customization.size}, {it.customization.flavor}, {it.customization.shape}, {it.customization.color})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Address / Location Note */}
                  <div className="queue-location-info">
                    <p>📍 {order.delivery_address || (isPickup ? "Store Pickup" : "Cordova, Cebu")}</p>
                    {order.distance_km && !isPickup && (
                      <span className="queue-distance-tag">📏 {order.distance_km} km away</span>
                    )}
                  </div>

                  {/* Rapid Status Changing Action Toolbar */}
                  <div className="queue-card-actions">
                    <div className="rapid-status-buttons">
                      {order.status === "Pending" && (
                        <button
                          type="button"
                          className="action-btn confirm"
                          onClick={() => handleStatusChange(order, "Confirmed")}
                          disabled={updatingId === order.id}
                        >
                          🔵 Confirm Order
                        </button>
                      )}

                      {(order.status === "Pending" || order.status === "Confirmed") && (
                        <button
                          type="button"
                          className="action-btn bake"
                          onClick={() => handleStatusChange(order, "Preparing")}
                          disabled={updatingId === order.id}
                        >
                          🟣 Start Baking
                        </button>
                      )}

                      {order.status === "Preparing" && (
                        <button
                          type="button"
                          className="action-btn ready"
                          onClick={() =>
                            handleStatusChange(
                              order,
                              isPickup ? "Ready for Pickup" : "For Delivery"
                            )
                          }
                          disabled={updatingId === order.id}
                        >
                          {isPickup ? "🏪 Mark Ready for Pickup" : "🚚 Dispatch / Out for Delivery"}
                        </button>
                      )}

                      {(order.status === "Ready for Pickup" || order.status === "For Delivery") && (
                        <button
                          type="button"
                          className="action-btn complete"
                          onClick={() => handleStatusChange(order, "Completed")}
                          disabled={updatingId === order.id}
                        >
                          🟢 Mark as Completed
                        </button>
                      )}
                    </div>

                    <div className="queue-secondary-actions">
                      <button
                        type="button"
                        className="details-btn-sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        Inspect Details
                      </button>

                      <button
                        type="button"
                        className="deny-btn-sm"
                        onClick={() => openDenyModal(order)}
                        title="Deny with reason"
                      >
                        ✕ Deny
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deny Modal */}
      {denyModalOrder && (
        <div className="admin-modal-overlay" onClick={() => setDenyModalOrder(null)}>
          <div className="deny-order-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="deny-modal-header">
              <div className="deny-title-group">
                <span className="deny-icon-badge">❌</span>
                <div>
                  <h2>Deny Order #{denyModalOrder.id}</h2>
                  <p>Customer: <strong>{denyModalOrder.customer_name}</strong></p>
                </div>
              </div>
              <button className="close-modal-btn" onClick={() => setDenyModalOrder(null)}>✕</button>
            </div>

            <div className="deny-modal-body">
              <div className="deny-warning-callout">
                ⚠️ <strong>Notice:</strong> Denying this order will notify the customer and automatically return reserved stock back to the catalog.
              </div>

              <label className="form-field-label">Select Reason for Denial *</label>
              <div className="preset-reasons-list">
                {PRESET_DENIAL_REASONS.map((reason) => (
                  <label key={reason} className={`reason-radio-label ${selectedReasonPreset === reason ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="denialReason"
                      checked={selectedReasonPreset === reason}
                      onChange={() => setSelectedReasonPreset(reason)}
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <label className="form-field-label" style={{ marginTop: "15px" }}>
                Additional Explanation / Customer Note
              </label>
              <textarea
                rows="3"
                placeholder="Provide details..."
                value={customReasonText}
                onChange={(e) => setCustomReasonText(e.target.value)}
                className="deny-textarea"
              />
            </div>

            <div className="deny-modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setDenyModalOrder(null)}
                disabled={isSubmittingDenial}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-deny-btn"
                onClick={handleConfirmDenial}
                disabled={isSubmittingDenial}
              >
                {isSubmittingDenial ? "Processing..." : "Confirm Order Denial"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
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
                  📅 {selectedOrder.formatted_date || selectedOrder.created_at}
                </p>
              </div>

              <div className="header-actions">
                <button type="button" className="print-slip-btn" onClick={() => window.print()}>
                  🖨️ Print Kitchen Slip
                </button>
                <button className="close-modal-btn" onClick={() => setSelectedOrder(null)}>✕</button>
              </div>
            </div>

            <div className="order-modal-body">
              <div className="modal-info-grid">
                <div className="info-box-card">
                  <div className="info-box-header"><span>👤 Customer</span></div>
                  <strong className="info-primary">{selectedOrder.customer_name}</strong>
                  <p className="info-sub">📞 {selectedOrder.customer_contact}</p>
                </div>
                <div className="info-box-card">
                  <div className="info-box-header"><span>🏪 / 🚚 Fulfillment</span></div>
                  <strong className="info-primary">{selectedOrder.fulfillment_type || "Delivery"}</strong>
                  <p className="info-sub">📍 {selectedOrder.delivery_address}</p>
                </div>
                <div className="info-box-card">
                  <div className="info-box-header"><span>💳 Payment</span></div>
                  <strong className="info-primary">₱{parseFloat(selectedOrder.total || 0).toLocaleString()}</strong>
                  <p className="info-sub">{selectedOrder.payment_method || "Cash on Delivery"}</p>
                </div>
              </div>

              <div className="modal-items-section">
                <h3>🍰 Order Items</h3>
                <div className="items-card-list">
                  {selectedOrder.items && selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="order-item-detail-card">
                      <div className="item-main-row">
                        <div className="item-title-qty">
                          <span className="qty-badge">{it.quantity}×</span>
                          <strong>{it.product_name || it.name}</strong>
                        </div>
                        <strong>₱{(parseFloat(it.price || 0) * parseInt(it.quantity || 1)).toLocaleString()}</strong>
                      </div>
                      {it.customization && (
                        <div className="item-customization-box">
                          <span className="custom-tag">Size: {it.customization.size}</span>
                          <span className="custom-tag">Flavor: {it.customization.flavor}</span>
                          <span className="custom-tag">Frosting: {it.customization.color}</span>
                          {it.customization.message && <div className="custom-message-row"><em>"{it.customization.message}"</em></div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-modal-footer">
              <button type="button" className="close-footer-btn" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Queue;
