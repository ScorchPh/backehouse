/**
 * ============================================================================
 * BAKE HOUSE - Order Details & Real-Time Tracking Component
 * ============================================================================
 * Capstone Project Explanation:
 * Provides an e-commerce order tracking receipt and status progress visualizer:
 * 1. Progress Stepper: Supports both Store Pickup (Ready for Pickup -> Picked Up)
 *    and Home Delivery (Out for Delivery -> Delivered).
 * 2. Itemized Breakdown: Product photo, unit price, quantity, customization details, line totals.
 * 3. Payment & Fulfillment Card: Pickup branch location or delivery address.
 * 4. Print Receipt: Instant printable order summary.
 * ============================================================================
 */

import { useState, useEffect } from "react";
import "./OrderDetails.css";
import { useLocation, Link, useSearchParams } from "react-router-dom";
import { orderService } from "../../services/orderService";
import { QRCodeSVG } from "qrcode.react";

function OrderDetails() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);

  const orderId = order?.id || searchParams.get("id");

  useEffect(() => {
    if (!order && orderId) {
      async function fetchDetails() {
        try {
          setLoading(true);
          const res = await orderService.getOrderDetails(orderId);
          if (res && res.order) {
            setOrder(res.order);
          }
        } catch (err) {
          console.error("Failed to load order details:", err);
        } finally {
          setLoading(false);
        }
      }
      fetchDetails();
    }
  }, [order, orderId]);

  if (loading) {
    return (
      <div className="order-details-loading">
        <div className="loading-spinner">⏳</div>
        <h2>Loading order details & tracking...</h2>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-details-empty">
        <h1>Order Not Found</h1>
        <p>We could not find the order information you requested.</p>
        <Link to="/my-orders" className="back-btn">
          ← Back to My Orders
        </Link>
      </div>
    );
  }

  const rawStatus = (order.status || 'Pending').toLowerCase();
  const statusKey = rawStatus.replace(/\s+/g, '-');

  const isPickup = (order.fulfillment_type && order.fulfillment_type.toLowerCase() === 'pickup') ||
                   (order.delivery_address && order.delivery_address.toLowerCase().includes('pickup'));

  // Timeline Step Calculations
  // Step 1: Placed (All statuses)
  // Step 2: Preparing / Confirmed
  // Step 3: Ready for Pickup (if pickup) OR Out for Delivery (if delivery)
  // Step 4: Completed / Picked Up / Delivered
  const isStep1 = true;
  const isStep2 = ['confirmed', 'preparing', 'ready-for-pickup', 'for-delivery', 'delivery', 'completed', 'delivered'].includes(statusKey);
  const isStep3 = isPickup
    ? ['ready-for-pickup', 'completed', 'delivered'].includes(statusKey)
    : ['for-delivery', 'delivery', 'completed', 'delivered'].includes(statusKey);
  const isStep4 = ['completed', 'delivered'].includes(statusKey);

  const subtotal = parseFloat(order.subtotal || 0) || (parseFloat(order.total || 0) > 50 && !isPickup ? parseFloat(order.total) - 50 : parseFloat(order.total || 0));
  const deliveryFee = isPickup ? 0 : parseFloat(order.delivery_fee || 50);
  const totalAmount = parseFloat(order.total || (subtotal + deliveryFee));

  return (
    <div className="order-details-container">
      {/* 1. Header & Quick Actions */}
      <div className="order-details-header">
        <div className="header-left">
          <Link to="/my-orders" className="back-link">
            ← Back to Orders
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1>Order #{order.id}</h1>
            <span style={{
              background: isPickup ? "#FEF3C7" : "#EFF6FF",
              color: isPickup ? "#B45309" : "#1D4ED8",
              padding: "4px 10px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "800"
            }}>
              {isPickup ? "🏪 STORE PICKUP" : "🚚 DOOR DELIVERY"}
            </span>
          </div>
          <p className="order-meta">
            Placed on <strong>{order.formatted_date || order.created_at || order.date || "Recent"}</strong>
          </p>
        </div>

        <div className="header-right">
          <span className={`status-badge-lg ${statusKey}`}>
            ● {order.status || "Pending"}
          </span>
          <button onClick={() => window.print()} className="print-btn" title="Print Receipt">
            🖨️ Print Receipt
          </button>
        </div>
      </div>

      {/* Denial / Cancellation Alert Banner */}
      {(statusKey === "denied" || statusKey === "cancelled") && (
        <section style={{
          background: "#FEF2F2",
          border: "2px solid #FCA5A5",
          borderRadius: "16px",
          padding: "20px 24px",
          marginBottom: "25px",
          display: "flex",
          alignItems: "flex-start",
          gap: "16px",
          boxShadow: "0 4px 16px rgba(220, 38, 38, 0.08)"
        }}>
          <span style={{ fontSize: "2rem" }}>❌</span>
          <div>
            <h3 style={{ margin: "0 0 6px", color: "#991B1B", fontSize: "1.2rem", fontWeight: "800" }}>
              Order {order.status || "Denied"}
            </h3>
            <p style={{ margin: "0 0 6px", color: "#7F1D1D", fontSize: "0.95rem" }}>
              <strong>Reason from Bakery:</strong> {order.denial_reason || order.cancellation_reason || "Unable to process order at this time."}
            </p>
            {order.denied_at && (
              <small style={{ color: "#B91C1C", display: "block", marginBottom: "8px" }}>
                Updated on {order.denied_at}
              </small>
            )}
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#991B1B", fontStyle: "italic" }}>
              If you have questions or already paid via E-Wallet, please contact our support team at <strong>+63 912 345 6789</strong>.
            </p>
          </div>
        </section>
      )}

      {/* 2. Visual Progress Stepper */}
      {statusKey !== "denied" && statusKey !== "cancelled" && (
        <section className="tracking-stepper-card">
        <h2>Order Progress Tracker</h2>
        <div className="stepper-track">
          {/* Step 1 */}
          <div className={`stepper-node ${isStep1 ? 'completed' : ''} ${statusKey === 'pending' ? 'current' : ''}`}>
            <div className="node-circle">1</div>
            <div className="node-info">
              <strong>Order Placed</strong>
              <small>Received by bakery</small>
            </div>
          </div>
          <div className={`stepper-line ${isStep2 ? 'active' : ''}`}></div>

          {/* Step 2 */}
          <div className={`stepper-node ${isStep2 ? 'completed' : ''} ${statusKey === 'preparing' || statusKey === 'confirmed' ? 'current' : ''}`}>
            <div className="node-circle">2</div>
            <div className="node-info">
              <strong>Baking & Prep</strong>
              <small>In the kitchen</small>
            </div>
          </div>
          <div className={`stepper-line ${isStep3 ? 'active' : ''}`}></div>

          {/* Step 3 (Pickup vs Delivery) */}
          <div className={`stepper-node ${isStep3 ? 'completed' : ''} ${(statusKey === 'ready-for-pickup' || statusKey === 'for-delivery' || statusKey === 'delivery') ? 'current' : ''}`}>
            <div className="node-circle">3</div>
            <div className="node-info">
              <strong>{isPickup ? "Ready for Pickup" : "Out for Delivery"}</strong>
              <small>{isPickup ? "Ready at bakery counter" : "With delivery rider"}</small>
            </div>
          </div>
          <div className={`stepper-line ${isStep4 ? 'active' : ''}`}></div>

          {/* Step 4 */}
          <div className={`stepper-node ${isStep4 ? 'completed' : ''} ${statusKey === 'completed' || statusKey === 'delivered' ? 'current' : ''}`}>
            <div className="node-circle">4</div>
            <div className="node-info">
              <strong>{isPickup ? "Picked Up" : "Delivered"}</strong>
              <small>Enjoy your fresh treats!</small>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* 3. Main Content: 2-Column Grid */}
      <div className="order-details-grid">
        {/* Left Column: Items List & Total */}
        <div className="grid-left-col">
          {/* Items Card */}
          <section className="details-card items-card">
            <h2>Items Ordered ({order.items ? order.items.length : 1})</h2>

            <div className="items-list">
              {order.items && order.items.map((item, idx) => {
                const itemPrice = parseFloat(item.price || 0);
                const itemQty = parseInt(item.quantity || 1);
                const itemSubtotal = itemPrice * itemQty;

                return (
                  <div key={item.id || idx} className="item-row">
                    <div className="item-img-box">
                      <img
                        src={item.image || "/uploads/productimg/chocolate_cake.jpg"}
                        alt={item.product_name || item.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500";
                        }}
                      />
                    </div>

                    <div className="item-details">
                      <h3>{item.product_name || item.name}</h3>
                      <div className="item-pricing">
                        <span>₱{itemPrice.toLocaleString()}</span>
                        <span className="qty-tag">Qty: {itemQty}</span>
                      </div>

                      {/* Custom Cake Specifications */}
                      {item.customization && (
                        <div className="custom-specs-box">
                          <h4>🎂 Custom Cake Design:</h4>
                          <p>
                            {item.customization.size && <span>• Size: {item.customization.size} </span>}
                            {item.customization.flavor && <span>• Flavor: {item.customization.flavor} </span>}
                            {item.customization.shape && <span>• Shape: {item.customization.shape} </span>}
                            {item.customization.color && <span>• Frosting: {item.customization.color} </span>}
                            {item.customization.occasion && <span>• Occasion: {item.customization.occasion} </span>}
                          </p>
                          {item.customization.message && (
                            <p className="custom-msg">
                              <strong>Dedication Message:</strong> "{item.customization.message}"
                            </p>
                          )}
                          {item.customization.instructions && (
                            <p className="custom-inst">
                              <strong>Special Instructions:</strong> {item.customization.instructions}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="item-total">
                      <strong>₱{itemSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price Summary Breakdown */}
            <div className="price-breakdown">
              <div className="breakdown-row">
                <span>Items Subtotal:</span>
                <span>₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="breakdown-row">
                <span>{isPickup ? "Pickup Fee:" : "Delivery Fee:"}</span>
                <span>{isPickup ? "FREE (₱0.00)" : `₱${deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
              </div>

              <div className="breakdown-row grand-total">
                <span>Total Amount:</span>
                <strong>₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Delivery / Store Pickup & Payment Information */}
        <div className="grid-right-col">
          {/* Customer & Fulfillment Card */}
          <section className="details-card info-card">
            <h2>{isPickup ? "Store Pickup & Customer Details" : "Customer & Delivery Details"}</h2>

            <div className="info-entry">
              <span className="entry-icon">👤</span>
              <div>
                <strong>Customer Name</strong>
                <p>{order.customer_name || "Valued Customer"}</p>
              </div>
            </div>

            <div className="info-entry">
              <span className="entry-icon">📞</span>
              <div>
                <strong>Contact Number</strong>
                <p>{order.customer_contact || "—"}</p>
              </div>
            </div>

            <div className="info-entry">
              <span className="entry-icon">{isPickup ? "🏪" : "📍"}</span>
              <div>
                <strong>{isPickup ? "Pickup Location" : "Delivery Address & Pin"}</strong>
                <p>{order.delivery_address || (isPickup ? "BAKE HOUSE Branch, Poblacion, Cordova, Cebu" : "Cordova, Cebu")}</p>
                {!isPickup && order.delivery_coordinates && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_coordinates.lat},${order.delivery_coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "6px",
                      fontSize: "0.85rem",
                      color: "#8B4513",
                      fontWeight: "700",
                      textDecoration: "underline"
                    }}
                  >
                    🗺️ Open Pinned Location in Maps ({order.distance_km ? `${order.distance_km} km` : "GPS Pin"})
                  </a>
                )}
              </div>
            </div>

            <div className="info-entry">
              <span className="entry-icon">💳</span>
              <div>
                <strong>Payment Method</strong>
                <p>{order.payment_method || order.payment || (isPickup ? "Pay upon Store Pickup" : "Cash on Delivery")}</p>
              </div>
            </div>
          </section>

          {/* Digital Receipt QR Code Card */}
          <section className="details-card qr-receipt-details-card">
            <div className="qr-receipt-header">
              <h2>Digital Receipt QR Code</h2>
              <span className="qr-receipt-badge">Scannable</span>
            </div>
            <p className="qr-receipt-desc">
              {isPickup
                ? "Present this QR code to the cashier or staff at the pickup counter for quick verification."
                : "Scan this QR code to verify your official digital receipt and order details."}
            </p>
            <div className="qr-receipt-code-box">
              <QRCodeSVG
                value={`${window.location.origin}/order-details?id=${order.id}`}
                size={165}
                level="M"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
            <span className="qr-order-code">Order #{order.id}</span>
          </section>

          {/* Need Assistance Card */}
          <section className="details-card help-card">
            <h2>Need Help with this Order?</h2>
            <p>If you have questions regarding your order or pickup time, contact our store:</p>
            <div className="help-contacts">
              <p>📞 <strong>+63 912 345 6789</strong></p>
              <p>📧 <strong>support@bakehouse.com</strong></p>
              <p>🕒 <strong>Store Hours: 8:00 AM - 8:00 PM</strong></p>
            </div>
            <Link to="/menu" className="reorder-btn">
              🛍️ Order More Treats
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

export default OrderDetails;