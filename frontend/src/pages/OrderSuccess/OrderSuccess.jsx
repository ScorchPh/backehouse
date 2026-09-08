/**
 * ============================================================================
 * BAKE HOUSE - Order Success & Digital Receipt Component
 * ============================================================================
 * Capstone Project Explanation:
 * Displays the post-checkout confirmation screen and digital receipt.
 * Features:
 * 1. Dynamic Fulfillment Detection:
 *    - Store Pickup: Displays "Estimated Pickup Time: 15–30 Minutes" and store location.
 *    - Home Delivery: Displays "Estimated Delivery Time: 30–45 Minutes" and customer destination.
 * 2. Scannable Digital Receipt QR Code:
 *    - Encodes Order ID and verification data for rapid counter pickup scanning.
 * 3. Printable Receipt & Quick Navigation buttons.
 * ============================================================================
 */

import "./OrderSuccess.css";
import { Link, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

function OrderSuccess() {
  const location = useLocation();
  const order = location.state?.order;

  // Fallback values if navigated to directly
  const orderId = order?.id || "BH-2026001";
  const fulfillmentType = order?.fulfillment_type || "Delivery";
  const isPickup =
    fulfillmentType.toLowerCase() === "pickup" ||
    (order?.delivery_address && order.delivery_address.toLowerCase().includes("pickup"));

  const customerName = order?.customer_name || "Valued Customer";
  const totalAmount = order?.total ? parseFloat(order.total) : 0;
  const paymentMethod = order?.payment_method || order?.payment || "Cash on Delivery";
  const status = order?.status || "Pending";
  const address = order?.delivery_address || (isPickup ? "BAKE HOUSE Main Branch, Poblacion, Cordova, Cebu" : "Cordova, Cebu");

  // Clean, concise QR Code payload for low-density, high-readability scanning
  const qrVerificationUrl = `${window.location.origin}/order-details?id=${orderId}`;

  return (
    <div className="order-success">
      <div className="success-card">
        <div className="success-icon">
          ✅
        </div>

        <h1>Order Placed Successfully!</h1>

        <p className="success-intro">
          Thank you for choosing <strong>BAKE HOUSE</strong>, {customerName}!
          Your order has been received and our bakers are preparing your freshly baked goods.
        </p>

        {/* Fulfillment Type Highlight Badge */}
        <div className="fulfillment-badge-container">
          <span className={`fulfillment-tag ${isPickup ? "pickup-tag" : "delivery-tag"}`}>
            {isPickup ? "🏪 STORE PICKUP ORDER" : "🚚 DOOR-TO-DOOR DELIVERY"}
          </span>
        </div>

        {/* Dynamic Order Details Box */}
        <div className="order-details">
          <div className="detail-row">
            <span>Order Number</span>
            <strong>#{orderId}</strong>
          </div>

          <div className="detail-row">
            <span>Fulfillment Type</span>
            <strong>{isPickup ? "Store Pickup" : "Home Delivery"}</strong>
          </div>

          {/* DYNAMIC ESTIMATED TIME: Calculated from Pin & OSRM Distance */}
          <div className="detail-row highlight-row">
            <span>{isPickup ? "Estimated Ready / Pickup Time" : "Estimated Delivery Time"}</span>
            <strong className="time-highlight">
              {order?.estimated_delivery_time || (isPickup ? "15–25 Minutes" : "30–45 Minutes")}
              {!isPickup && order?.distance_km ? ` (${order.distance_km} km)` : ""}
            </strong>
          </div>

          <div className="detail-row">
            <span>{isPickup ? "Pickup Location" : "Delivery Address"}</span>
            <strong style={{ maxWidth: "60%", textAlign: "right" }}>{address}</strong>
          </div>

          {totalAmount > 0 && (
            <div className="detail-row">
              <span>Total Amount</span>
              <strong>₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({paymentMethod})</strong>
            </div>
          )}

          <div className="detail-row">
            <span>Order Status</span>
            <span className="status-pill">{status}</span>
          </div>
        </div>

        {/* SCANNABLE DIGITAL RECEIPT QR CODE (Low-Density, High-Readability for Printing) */}
        <div className="qr-receipt-card">
          <div className="qr-badge">Digital Receipt QR</div>
          <div className="qr-code-wrapper">
            <QRCodeSVG
              value={qrVerificationUrl}
              size={175}
              level="M"
              includeMargin={true}
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          </div>
          <span className="qr-order-code">Order #{orderId}</span>
          <p className="qr-caption">
            {isPickup
              ? "📱 Show this QR code at our store pickup counter to verify and claim your order."
              : "📱 Scan QR code to view your digital receipt and live delivery tracker."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="success-buttons">
          <button onClick={() => window.print()} className="print-receipt-btn" title="Print this receipt">
            🖨️ Print Receipt
          </button>

          <Link to={`/order-details?id=${orderId}`} state={{ order }} className="orders-btn">
            Track Order Details
          </Link>

          <Link to="/menu" className="continue-btn">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OrderSuccess;