/**
 * ============================================================================
 * BAKE HOUSE - Checkout Page Component
 * ============================================================================
 * Capstone Project Explanation:
 * Collects customer delivery / store pickup options and payment selection.
 * Features:
 * 1. Fulfillment Selection: Door-to-Door Delivery (₱50 fee) vs. Store Pickup (₱0 fee).
 * 2. Dynamic Address Display: Delivery requires street/barangay; Store Pickup sets
 *    the bakery branch address automatically.
 * 3. Submits order to PHP backend API (/api/orders/create_order.php).
 * ============================================================================
 */

import { useState } from "react";
import "./Checkout.css";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrderContext";
import { orderService } from "../../services/orderService";
import { authService } from "../../services/authService";
import { useNavigate, Link } from "react-router-dom";
import DeliveryMapPicker from "../../components/DeliveryMapPicker/DeliveryMapPicker";

function Checkout() {
  const { cartItems, clearCart } = useCart();
  const { addOrder } = useOrders();
  const navigate = useNavigate();

  const currentUser = authService.getCurrentUser();

  // Fulfillment Method: 'Delivery' vs. 'Pickup'
  const [fulfillmentType, setFulfillmentType] = useState("Delivery");

  // Form Fields
  const [fullName, setFullName] = useState(
    currentUser ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() : ""
  );
  const [contactNumber, setContactNumber] = useState(currentUser?.contact_number || "");
  const [street, setStreet] = useState("");
  const [barangay, setBarangay] = useState("Poblacion");
  const [city, setCity] = useState("Cordova");
  const [province, setProvince] = useState("Cebu");
  const [landmark, setLandmark] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");

  // Live Map Location & ETA Analytics (Shopee-Style Pin Drop)
  const [deliveryLocationInfo, setDeliveryLocationInfo] = useState({
    coordinates: { lat: 10.2540, lng: 123.9490 },
    distanceKm: 1.2,
    transitMinutes: 5,
    estimatedDeliveryTime: "25–35 Minutes",
    arrivalWindow: ""
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Delivery fee is ₱50 for Home Delivery, and ₱0 for Store Pickup
  const deliveryFee = fulfillmentType === "Pickup" ? 0 : (cartItems.length > 0 ? 50 : 0);
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (cartItems.length === 0) {
      setErrorMessage("Your cart is empty. Add products from the menu first.");
      return;
    }

    if (!fullName || !contactNumber) {
      setErrorMessage("Please enter your full name and contact number.");
      return;
    }

    if (fulfillmentType === "Delivery" && (!street || !barangay || !city)) {
      setErrorMessage("Please complete your delivery address fields.");
      return;
    }

    const destinationAddress = fulfillmentType === "Pickup"
      ? "Store Pickup (Poblacion, Cordova, Cebu Bakery Branch)"
      : `${street}, Brgy. ${barangay}, ${city}, ${province}${landmark ? ` (Landmark: ${landmark})` : ""}`;

    // Check if order contains a scheduled item (custom cake or scheduled advance order)
    const scheduledItem = cartItems.find(
      (it) => it.scheduled_date || it.customization?.scheduled_date || it.customization?.is_scheduled
    );
    const scheduledDate = scheduledItem?.scheduled_date || scheduledItem?.customization?.scheduled_date || null;
    const scheduledTime = scheduledItem?.scheduled_time || scheduledItem?.customization?.scheduled_time || null;
    const isScheduled = Boolean(scheduledDate);

    const orderPayload = {
      user_id: currentUser ? currentUser.id : null,
      customer_name: fullName,
      customer_contact: contactNumber,
      fulfillment_type: fulfillmentType,
      delivery_address: destinationAddress,
      delivery_coordinates: fulfillmentType === "Delivery" ? deliveryLocationInfo.coordinates : null,
      distance_km: fulfillmentType === "Delivery" ? deliveryLocationInfo.distanceKm : 0,
      estimated_delivery_time: fulfillmentType === "Pickup" ? "15–25 Minutes" : deliveryLocationInfo.estimatedDeliveryTime,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      is_scheduled: isScheduled,
      payment_method: paymentMethod,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      items: cartItems,
    };

    try {
      setLoading(true);
      const res = await orderService.createOrder(orderPayload);

      if (res && res.success) {
        // Successful checkout: update order history, empty cart, and navigate to confirmation
        addOrder(res.order);
        clearCart();
        navigate("/order-success", { state: { order: res.order } });
      } else {
        setErrorMessage(res.message || "Failed to place order. Please try again.");
      }
    } catch (err) {
      /**
       * ======================================================================
       * FIRST-COME, FIRST-SERVED CONCURRENCY HANDLING
       * ======================================================================
       * If another customer completed checkout first and depleted available stock,
       * the backend rejects this order with HTTP 400 and an explanatory error message.
       * We display this message directly to the customer so they can adjust their cart.
       * ======================================================================
       */
      console.warn("Order placement rejected:", err);
      setErrorMessage(
        err.message || "An unexpected error occurred while placing your order. Please try again."
      );
      // Scroll to top so the error banner is immediately visible
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="checkout" style={{ textAlign: "center", padding: "80px 20px" }}>
        <h1>Your Cart is Empty</h1>
        <p style={{ margin: "20px 0", color: "#666" }}>
          You don't have any bakery treats in your cart yet.
        </p>
        <Link to="/menu" className="place-order-btn" style={{ display: "inline-block", textDecoration: "none", maxWidth: "250px" }}>
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout">
      <h1>Checkout</h1>

      {errorMessage && (
        <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "14px", borderRadius: "10px", marginBottom: "20px", fontWeight: "600" }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* 1. Fulfillment Method Selection (Delivery vs Store Pickup) */}
      <section className="checkout-section">
        <h2>Order Fulfillment Option</h2>
        <div className="fulfillment-options-grid">
          <label className={`fulfillment-card ${fulfillmentType === "Delivery" ? "active" : ""}`}>
            <input
              type="radio"
              name="fulfillment"
              checked={fulfillmentType === "Delivery"}
              onChange={() => setFulfillmentType("Delivery")}
            />
            <div className="fulfillment-content">
              <span className="fulfillment-icon">🚚</span>
              <div>
                <strong>Door-to-Door Delivery</strong>
                <p>Delivered directly to your address (₱50.00 fee)</p>
              </div>
            </div>
          </label>

          <label className={`fulfillment-card ${fulfillmentType === "Pickup" ? "active" : ""}`}>
            <input
              type="radio"
              name="fulfillment"
              checked={fulfillmentType === "Pickup"}
              onChange={() => setFulfillmentType("Pickup")}
            />
            <div className="fulfillment-content">
              <span className="fulfillment-icon">🏪</span>
              <div>
                <strong>Store Pickup</strong>
                <p>Pick up at our bakery counter in Cordova (FREE)</p>
              </div>
            </div>
          </label>
        </div>
      </section>

      {/* 2. Customer Information */}
      <section className="checkout-section">
        <h2>Customer Information</h2>
        <input
          type="text"
          placeholder="Full Name *"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Contact Number (+63 ...) *"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
          required
        />
      </section>

      {/* 3. Delivery Address OR Store Pickup Branch Notice */}
      {fulfillmentType === "Delivery" ? (
        <section className="checkout-section">
          <h2>Delivery Address & Pinpoint Location</h2>

          {/* Interactive Shopee/Grab-Style Pinpoint Map */}
          <DeliveryMapPicker
            initialBarangay={barangay}
            onLocationSelected={(info) => {
              setDeliveryLocationInfo(info);
              if (info?.addressDetails) {
                if (info.addressDetails.barangay) {
                  setBarangay(info.addressDetails.barangay);
                }
                if (info.addressDetails.city) {
                  setCity(info.addressDetails.city);
                }
                if (info.addressDetails.province) {
                  setProvince(info.addressDetails.province);
                }
                if (info.addressDetails.street) {
                  setStreet(info.addressDetails.street);
                }
              }
            }}
          />

          {deliveryLocationInfo?.addressDetails?.fullFormattedAddress && (
            <div style={{
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              color: "#166534",
              borderRadius: "10px",
              padding: "8px 14px",
              fontSize: "0.85rem",
              fontWeight: "600",
              marginTop: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              ✨ <span>Auto-filled from Pin: <strong>{deliveryLocationInfo.addressDetails.fullFormattedAddress}</strong></span>
            </div>
          )}

          <div style={{ marginTop: "15px" }}>
            <label style={{ fontWeight: "700", color: "#6B4226", display: "block", marginBottom: "8px" }}>
              House No. / Street / Subdivision / Unit *
            </label>
            <input
              type="text"
              placeholder="e.g. Blk 4 Lot 12 Villa Teresa Subdivision, or 123 Rizal St."
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "10px" }}>
            <div>
              <label style={{ fontWeight: "700", color: "#6B4226", display: "block", marginBottom: "8px" }}>
                Barangay *
              </label>
              <input
                type="text"
                placeholder="e.g. Poblacion, Gabi, Bangbang"
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontWeight: "700", color: "#6B4226", display: "block", marginBottom: "8px" }}>
                City / Municipality *
              </label>
              <input
                type="text"
                placeholder="Cordova"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "10px" }}>
            <div>
              <label style={{ fontWeight: "700", color: "#6B4226", display: "block", marginBottom: "8px" }}>
                Province
              </label>
              <input
                type="text"
                placeholder="Cebu"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontWeight: "700", color: "#6B4226", display: "block", marginBottom: "8px" }}>
                Landmark / Gate Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Near subdivision clubhouse, blue gate"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="checkout-section pickup-notice-card">
          <h2>Store Pickup Details</h2>
          <div className="pickup-info-box">
            <p>📍 <strong>Pickup Location:</strong> BAKE HOUSE Main Branch, Poblacion, Cordova, Cebu</p>
            <p>🕒 <strong>Store Pickup Hours:</strong> Monday - Sunday (8:00 AM - 8:00 PM)</p>
            <p>💡 <strong>Note:</strong> We will bake and prepare your items fresh. You can track status until it says <strong>Ready for Pickup</strong>!</p>
          </div>
        </section>
      )}

      {/* 4. Payment Method */}
      <section className="checkout-section">
        <h2>Payment Method</h2>

        <label>
          <input
            type="radio"
            name="payment"
            checked={paymentMethod === "Cash on Delivery" || paymentMethod === "Pay on Pickup"}
            onChange={() => setPaymentMethod(fulfillmentType === "Pickup" ? "Pay on Pickup" : "Cash on Delivery")}
          />
          {fulfillmentType === "Pickup" ? "Pay upon Store Pickup (Cash / Card)" : "Cash on Delivery"}
        </label>

        <label>
          <input
            type="radio"
            name="payment"
            checked={paymentMethod === "GCash"}
            onChange={() => setPaymentMethod("GCash")}
          />
          GCash (E-Wallet)
        </label>

        <label>
          <input
            type="radio"
            name="payment"
            checked={paymentMethod === "Maya"}
            onChange={() => setPaymentMethod("Maya")}
          />
          Maya (E-Wallet)
        </label>
      </section>

      {/* 5. Order Summary */}
      <section className="checkout-section">
        <h2>Order Summary</h2>

        {cartItems.map((item) => (
          <div key={item.id} className="summary-item">
            <div>
              <strong>{item.name}</strong>
              <p>Qty: {item.quantity}</p>

              {item.customization && (
                <div className="checkout-customization">
                  <p><strong>Size:</strong> {item.customization.size}</p>
                  <p><strong>Flavor:</strong> {item.customization.flavor}</p>
                  <p><strong>Shape:</strong> {item.customization.shape}</p>
                  <p><strong>Frosting:</strong> {item.customization.color}</p>
                  <p><strong>Occasion:</strong> {item.customization.occasion}</p>
                  {item.customization.message && (
                    <p><strong>Message:</strong> "{item.customization.message}"</p>
                  )}
                  {item.customization.instructions && (
                    <p><strong>Instructions:</strong> {item.customization.instructions}</p>
                  )}
                </div>
              )}
            </div>

            <strong>₱{(item.price * item.quantity).toLocaleString()}</strong>
          </div>
        ))}

        <hr />

        <div className="summary-item">
          <span>Subtotal</span>
          <span>₱{subtotal.toLocaleString()}</span>
        </div>

        <div className="summary-item">
          <span>{fulfillmentType === "Pickup" ? "Pickup Fee" : "Delivery Fee"}</span>
          <span>{fulfillmentType === "Pickup" ? "FREE (₱0)" : `₱${deliveryFee.toLocaleString()}`}</span>
        </div>

        <div className="summary-item">
          <span>{fulfillmentType === "Pickup" ? "Est. Ready Time" : "Est. Delivery Time"}</span>
          <span style={{ color: "#059669", fontWeight: "700" }}>
            {fulfillmentType === "Pickup"
              ? "15–25 Minutes"
              : `${deliveryLocationInfo.estimatedDeliveryTime} (${deliveryLocationInfo.distanceKm} km away)`}
          </span>
        </div>

        <div className="summary-item total">
          <span>Total</span>
          <span>₱{total.toLocaleString()}</span>
        </div>
      </section>

      <button
        className="place-order-btn"
        onClick={handlePlaceOrder}
        disabled={loading}
      >
        {loading ? "Processing Order..." : fulfillmentType === "Pickup" ? "Place Pickup Order" : "Place Delivery Order"}
      </button>
    </div>
  );
}

export default Checkout;