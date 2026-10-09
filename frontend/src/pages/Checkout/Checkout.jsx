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
import { cakeChatService } from "../../services/cakeChatService";
import { useNavigate, Link } from "react-router-dom";
import DeliveryMapPicker from "../../components/DeliveryMapPicker/DeliveryMapPicker";
import StatusModal from "../../components/StatusModal/StatusModal";

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
  const [street, setStreet] = useState(currentUser?.default_street || currentUser?.street || "");
  const [barangay, setBarangay] = useState(currentUser?.default_barangay || "Poblacion");
  const [city, setCity] = useState(currentUser?.default_city || "Cordova");
  const [province, setProvince] = useState(currentUser?.default_province || "Cebu");
  const [landmark, setLandmark] = useState(currentUser?.default_landmark || "");
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  // Live Map Location & ETA Analytics (Shopee-Style Pin Drop)
  const [deliveryLocationInfo, setDeliveryLocationInfo] = useState({
    coordinates: (currentUser?.default_lat && currentUser?.default_lng)
      ? { lat: parseFloat(currentUser.default_lat), lng: parseFloat(currentUser.default_lng) }
      : { lat: 10.2540, lng: 123.9490 },
    distanceKm: 1.2,
    transitMinutes: 5,
    estimatedDeliveryTime: "25–35 Minutes",
    arrivalWindow: ""
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Status Modal (Clean, high-visibility dialog for errors and success)
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: "error", // 'error' | 'success' | 'warning' | 'info'
    title: "",
    message: "",
    primaryText: "Got It",
    secondaryText: null,
    onPrimary: null,
    onSecondary: null,
  });

  const showModal = (config) => {
    setModalState({
      isOpen: true,
      type: config.type || "error",
      title: config.title || "",
      message: config.message || "",
      primaryText: config.primaryText || "Got It",
      secondaryText: config.secondaryText || null,
      onPrimary: config.onPrimary || null,
      onSecondary: config.onSecondary || null,
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

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
      const msg = "Your cart is empty. Add products from the menu first.";
      setErrorMessage(msg);
      showModal({
        type: "warning",
        title: "Your Cart is Empty",
        message: "You don't have any bakery treats in your cart yet. Please select items from our menu first.",
        primaryText: "Browse Menu",
        onPrimary: () => {
          closeModal();
          navigate("/menu");
        },
      });
      return;
    }

    if (!fullName || !contactNumber) {
      const msg = "Please enter your full name and contact number.";
      setErrorMessage(msg);
      showModal({
        type: "error",
        title: "Customer Info Required",
        message: "Please enter your full name and contact number so our bakery staff can reach you about your order.",
        primaryText: "Complete Contact Info",
        onPrimary: () => {
          closeModal();
          setTimeout(() => {
            const el = !fullName
              ? document.getElementById("checkoutFullName")
              : document.getElementById("checkoutContact");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.focus();
            }
          }, 100);
        },
      });
      return;
    }

    if (fulfillmentType === "Delivery" && (!street || !barangay || !city)) {
      const msg = "Please complete your delivery address fields.";
      setErrorMessage(msg);
      showModal({
        type: "error",
        title: "Delivery Address Incomplete",
        message: "Please enter your complete delivery address (House No. / Street, Barangay, and City) so our delivery driver can find your location.",
        primaryText: "Complete Address",
        onPrimary: () => {
          closeModal();
          setTimeout(() => {
            const el = document.getElementById("checkoutStreet");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.focus();
            }
          }, 100);
        },
      });
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
        // Detect if any items in the order were customized cakes
        const customCakeItem = cartItems.find(
          (it) => it.customization && (it.customization.size || it.customization.flavor || it.customization.occasion)
        );

        if (customCakeItem) {
          const cakeDetails = {
            orderId: res.order.id,
            customerName: fullName,
            cakeName: customCakeItem.name,
            size: customCakeItem.customization.size,
            flavor: customCakeItem.customization.flavor,
            shape: customCakeItem.customization.shape,
            color: customCakeItem.customization.color,
            occasion: customCakeItem.customization.occasion,
            message: customCakeItem.customization.message || 'None',
            instructions: customCakeItem.customization.instructions || 'None',
            scheduledDate: res.order.scheduled_date || customCakeItem.scheduled_date || null,
            scheduledTime: res.order.scheduled_time || customCakeItem.scheduled_time || null,
            totalPrice: customCakeItem.price,
            purchasedAt: new Date().toISOString()
          };

          // Store in localStorage for the persistent chat consultation box
          localStorage.setItem("bh_last_purchased_cake", JSON.stringify(cakeDetails));
          window.dispatchEvent(new Event("cakePurchased"));

          // Post order summary message into the customer's own conversation thread as the customer
          const customerSenderName = fullName || (currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim() : "Customer");
          const chatSessionId = currentUser?.id ? `session_user_${currentUser.id}` : `session_${res.order.id}`;
          localStorage.setItem("bh_cake_chat_session", chatSessionId);

          cakeChatService.sendMessage({
            sessionId: chatSessionId,
            senderName: customerSenderName,
            senderRole: "customer",
            message: `🎂 Order #${res.order.id} Placed! Custom Cake: ${cakeDetails.cakeName} (${cakeDetails.size}, ${cakeDetails.flavor}, ${cakeDetails.shape}, Frosting: ${cakeDetails.color}). Message on cake: "${cakeDetails.message}". Special Request: "${cakeDetails.instructions}".`,
            userId: currentUser?.id || null
          }).catch((err) => console.warn("Auto cake chat notification note:", err));
        }

        // Save as customer's default delivery address if requested
        if (currentUser && saveAsDefault && fulfillmentType === "Delivery") {
          authService.updateProfile({
            id: currentUser.id,
            first_name: currentUser.first_name,
            last_name: currentUser.last_name,
            email: currentUser.email,
            contact_number: contactNumber || currentUser.contact_number,
            default_street: street,
            default_barangay: barangay,
            default_city: city,
            default_province: province,
            default_landmark: landmark,
            default_lat: deliveryLocationInfo?.coordinates?.lat,
            default_lng: deliveryLocationInfo?.coordinates?.lng,
          }).catch((err) => console.warn("Auto save default delivery address error:", err));
        }

        // Successful checkout: show celebratory status modal
        addOrder(res.order);
        clearCart();

        showModal({
          type: "success",
          title: "Order Placed Successfully! 🎉",
          message: `Thank you, ${fullName}! Your order #${res.order.id} has been received by Bake House. Our bakers are preparing your order!`,
          primaryText: "View Order Receipt",
          onPrimary: () => {
            closeModal();
            navigate("/order-success", { state: { order: res.order } });
          },
        });
      } else {
        const errorMsg = res.message || "Failed to place order. Please try again.";
        setErrorMessage(errorMsg);
        showModal({
          type: "error",
          title: "Unable to Place Order",
          message: errorMsg,
          primaryText: "Review & Try Again",
          onPrimary: closeModal,
        });
      }
    } catch (err) {
      /**
       * ======================================================================
       * FIRST-COME, FIRST-SERVED CONCURRENCY HANDLING
       * ======================================================================
       * If another customer completed checkout first and depleted available stock,
       * the backend rejects this order with HTTP 400 and an explanatory error message.
       * We display this message directly to the customer in a modal dialog.
       * ======================================================================
       */
      console.warn("Order placement rejected:", err);
      const errorMsg =
        err.message || "An unexpected error occurred while placing your order. Please try again.";
      setErrorMessage(errorMsg);
      showModal({
        type: "error",
        title: "Order Notice",
        message: errorMsg,
        primaryText: "Review Order",
        onPrimary: closeModal,
      });
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
          id="checkoutFullName"
          type="text"
          placeholder="Full Name *"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <input
          id="checkoutContact"
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

          {currentUser && (currentUser.default_street || currentUser.default_lat) && (
            <div style={{
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: "10px",
              padding: "10px 14px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.85rem",
              color: "#92400E"
            }}>
              <span>🏠 <strong>Pre-filled from your saved default delivery location.</strong></span>
              <Link to="/account" style={{ color: "#B45309", fontWeight: "700", textDecoration: "underline" }}>
                Edit Settings
              </Link>
            </div>
          )}

          {/* Interactive Shopee/Grab-Style Pinpoint Map */}
          <DeliveryMapPicker
            initialBarangay={barangay}
            initialCoordinates={deliveryLocationInfo.coordinates}
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
              id="checkoutStreet"
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
                id="checkoutBarangay"
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
                id="checkoutCity"
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

          {currentUser && (
            <div style={{
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: "1px dashed #E5E7EB",
              display: "flex",
              alignItems: "center"
            }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                fontSize: "0.92rem",
                color: "#6B4226",
                fontWeight: "600"
              }}>
                <input
                  type="checkbox"
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#6B4226" }}
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                />
                <span>Save this address and map pin as my default delivery location for future orders</span>
              </label>
            </div>
          )}
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

      {/* High-visibility Status Alert Dialog for Error and Success */}
      <StatusModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        primaryText={modalState.primaryText}
        secondaryText={modalState.secondaryText}
        onPrimary={modalState.onPrimary}
        onSecondary={modalState.onSecondary}
        onClose={closeModal}
      />
    </div>
  );
}

export default Checkout;