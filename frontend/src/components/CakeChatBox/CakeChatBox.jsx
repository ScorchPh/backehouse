/**
 * ============================================================================
 * BAKE HOUSE - Live Cake Chat Box Component (Customer 1-to-1 & Admin 1-to-Many)
 * ============================================================================
 * Capstone Project Architecture:
 * 1. Customer (1-to-1):
 *    - Customers chat directly with the bakery regarding custom cake orders,
 *      dietary restrictions, tier requests, and delivery clarifications.
 *    - Synced with their specific user account (session_user_<id>).
 * 2. Admin & Staff (1-to-Many):
 *    - Admin sees all active customer conversations across the entire store.
 *    - Displays active thread list and allows replying directly to each customer.
 * 3. Guest / Logged Out:
 *    - Completely hidden until logged in.
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cakeChatService } from "../../services/cakeChatService";
import { authService } from "../../services/authService";
import { orderService } from "../../services/orderService";
import AdminCakeChatModal from "../AdminCakeChatModal/AdminCakeChatModal";
import "./CakeChatBox.css";

/**
 * Helper to parse automated cake order announcement messages
 */
function parseCakeOrderMessage(text) {
  if (!text || typeof text !== "string") return null;

  const isOrderPlaced = text.includes("Placed!") || text.includes("Custom Cake:") || text.includes("Message on cake:");
  if (!isOrderPlaced) return null;

  const orderMatch = text.match(/Order\s+(#?[A-Za-z0-9_-]+)/i);
  const orderId = orderMatch ? orderMatch[1].replace(/^#/, "") : null;

  let cakeName = "Custom Cake";
  let specsList = [];
  const cakeMatch = text.match(/Custom Cake:\s*([^(]+)(?:\(([^)]+)\))?/i);
  if (cakeMatch) {
    if (cakeMatch[1]) cakeName = cakeMatch[1].trim();
    if (cakeMatch[2]) {
      specsList = cakeMatch[2].split(",").map((s) => s.trim());
    }
  }

  let dedication = null;
  const dedicationMatch = text.match(/Message on cake:\s*["“]([^"”]+)["”]/i) || text.match(/Message on cake:\s*([^.]+)\./i);
  if (dedicationMatch && dedicationMatch[1]) {
    dedication = dedicationMatch[1].trim();
  }

  let specialRequest = null;
  const requestMatch = text.match(/Special Request:\s*["“]([^"”]+)["”]/i) || text.match(/Special Request:\s*(.+)$/i);
  if (requestMatch && requestMatch[1]) {
    specialRequest = requestMatch[1].trim();
  }

  return {
    orderId,
    cakeName,
    specs: specsList,
    dedication,
    specialRequest
  };
}

/**
 * Returns comprehensive, user-friendly clarification details based on the order's real-time status
 */
function getStatusClarification(status, cancellationReason) {
  const norm = (status || "").toLowerCase().trim();

  if (norm === "confirmed" || norm === "accepted") {
    return {
      label: "Accepted by Bakery",
      icon: "✅",
      badgeClass: "badge-accepted",
      step: 2,
      isDenied: false,
      title: "Order Accepted & Confirmed!",
      description: "Great news! Our cake decorators have reviewed and accepted your custom cake design. Ingredients and baking schedules are officially locked in for your date.",
      actionHint: "Need to make quick adjustments or add candles? Message our baker below!"
    };
  }

  if (norm === "denied" || norm === "cancelled") {
    return {
      label: "Order Denied / Declined",
      icon: "❌",
      badgeClass: "badge-denied",
      step: -1,
      isDenied: true,
      title: "Order Denied by Bakery",
      description: cancellationReason
        ? `Clarification from Bakery: "${cancellationReason}"`
        : "Our decorators are currently unable to accommodate this custom cake request for the requested schedule or requirements.",
      actionHint: "💡 Please chat with our baker below to discuss alternative flavors, sizes, or available dates!"
    };
  }

  if (norm === "preparing" || norm === "in preparation") {
    return {
      label: "In the Kitchen / Baking",
      icon: "👨‍🍳",
      badgeClass: "badge-preparing",
      step: 3,
      isDenied: false,
      title: "Actively Baking & Decorating",
      description: "Our kitchen has started on your cake! The sponge layers are baking and our decorators are crafting your frosting, dedication, and toppings.",
      actionHint: "You can ask for a photo of the finished cake below before dispatch!"
    };
  }

  if (norm === "ready for pickup") {
    return {
      label: "Ready for Pickup",
      icon: "📦",
      badgeClass: "badge-ready",
      step: 4,
      isDenied: false,
      title: "Ready at the Counter!",
      description: "Your custom cake has been decorated, boxed, and is waiting at our counter. Please present your Order ID upon arrival.",
      actionHint: "Our counter staff is ready to hand you your freshly baked cake!"
    };
  }

  if (norm === "for delivery" || norm === "out for delivery") {
    return {
      label: "Out for Delivery",
      icon: "🚚",
      badgeClass: "badge-delivery",
      step: 4,
      isDenied: false,
      title: "On the Way to You",
      description: "Your custom cake is carefully packaged and currently on the road with our delivery rider.",
      actionHint: "Please keep your contact phone nearby for rider arrival."
    };
  }

  if (norm === "completed") {
    return {
      label: "Order Completed",
      icon: "🎉",
      badgeClass: "badge-completed",
      step: 5,
      isDenied: false,
      title: "Order Completed & Fulfilled",
      description: "This custom cake order has been successfully fulfilled. Thank you for celebrating with Bake House!",
      actionHint: "We hope you loved every bite! Tag us in your celebration photos."
    };
  }

  // Default: Pending review
  return {
    label: "Pending Baker Review",
    icon: "⏳",
    badgeClass: "badge-pending",
    step: 1,
    isDenied: false,
    title: "Awaiting Baker Review",
    description: "Your custom cake specifications have been received by our kitchen. Our head decorator is reviewing your dedication and request details.",
    actionHint: "Feel free to send photo references or message our bakers below!"
  };
}

function CakeChatBox() {
  // 1. All React Hooks (Always called unconditionally in constant order)
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [isOpen, setIsOpen] = useState(false);
  const [isOrderCollapsed, setIsOrderCollapsed] = useState(false);
  const [isExpandedSize, setIsExpandedSize] = useState(false);
  const [messages, setMessages] = useState([]);
  const [adminThreads, setAdminThreads] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Determine user role
  const isAdminOrStaff = currentUser?.role === "admin" || currentUser?.role === "staff";

  // Persistent session identifier per customer account
  const sessionId = currentUser?.id
    ? `session_user_${currentUser.id}`
    : "session_guest";

  // Track purchased custom cake details
  const [purchasedCake, setPurchasedCake] = useState(() => {
    try {
      const saved = localStorage.getItem("bh_last_purchased_cake");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Listen for login / logout state changes in real time
  useEffect(() => {
    const handleAuthChange = () => {
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      if (!user) {
        setIsOpen(false);
      }
    };
    window.addEventListener("authChange", handleAuthChange);
    return () => window.removeEventListener("authChange", handleAuthChange);
  }, []);

  // Listen for external open commands (e.g. from OrderSuccess page or button)
  useEffect(() => {
    const handleOpenChat = () => {
      if (authService.getCurrentUser()) {
        setIsOpen(true);
      }
    };
    const handleCakePurchased = () => {
      try {
        const saved = localStorage.getItem("bh_last_purchased_cake");
        setPurchasedCake(saved ? JSON.parse(saved) : null);
        if (authService.getCurrentUser()) {
          setIsOpen(true);
        }
      } catch {
        setPurchasedCake(null);
      }
    };

    window.addEventListener("openCakeChat", handleOpenChat);
    window.addEventListener("cakePurchased", handleCakePurchased);
    window.addEventListener("storage", handleCakePurchased);

    return () => {
      window.removeEventListener("openCakeChat", handleOpenChat);
      window.removeEventListener("cakePurchased", handleCakePurchased);
      window.removeEventListener("storage", handleCakePurchased);
    };
  }, []);

  // Fetch messages for customer (1-to-1)
  const fetchCustomerMessages = useCallback(async () => {
    if (!currentUser || isAdminOrStaff) return;
    try {
      const res = await cakeChatService.getMessages(sessionId);
      if (res && res.success && Array.isArray(res.messages)) {
        setMessages(res.messages);
      }
    } catch (err) {
      console.warn("Could not poll cake chat messages:", err);
    }
  }, [currentUser, isAdminOrStaff, sessionId]);

  // Fetch active customer threads for admin (1-to-Many)
  const fetchAdminThreads = useCallback(async () => {
    if (!currentUser || !isAdminOrStaff) return;
    try {
      const res = await cakeChatService.getActiveSessions();
      if (res && res.success && Array.isArray(res.threads)) {
        setAdminThreads(res.threads);
      }
    } catch (err) {
      console.warn("Could not poll admin threads:", err);
    }
  }, [currentUser, isAdminOrStaff]);

  // Periodic polling every 3.5 seconds
  useEffect(() => {
    if (!currentUser) return;

    if (isAdminOrStaff) {
      fetchAdminThreads();
      const interval = setInterval(fetchAdminThreads, 3500);
      return () => clearInterval(interval);
    } else {
      fetchCustomerMessages();
      const interval = setInterval(fetchCustomerMessages, 3500);
      return () => clearInterval(interval);
    }
  }, [currentUser, isAdminOrStaff, fetchAdminThreads, fetchCustomerMessages]);

  // Scroll to bottom when customer messages update
  useEffect(() => {
    if (isOpen && !isAdminOrStaff) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isAdminOrStaff]);

  // Listen for read-state updates from AdminCakeChatModal
  const [readVersion, setReadVersion] = useState(0);

  useEffect(() => {
    const handleReadUpdate = () => {
      setReadVersion((v) => v + 1);
    };
    window.addEventListener("cakeChatReadUpdated", handleReadUpdate);
    window.addEventListener("storage", handleReadUpdate);
    return () => {
      window.removeEventListener("cakeChatReadUpdated", handleReadUpdate);
      window.removeEventListener("storage", handleReadUpdate);
    };
  }, []);

  // Compute strictly UNREAD threads (only shows badge if customer sent a message that hasn't been read)
  const unreadThreadsCount = useMemo(() => {
    if (!isAdminOrStaff || !Array.isArray(adminThreads)) return 0;
    try {
      const readStore = JSON.parse(localStorage.getItem("bh_admin_read_cake_threads") || "{}");
      return adminThreads.filter((t) => {
        // If the last message was sent by admin or staff, the admin already replied
        if (t.last_sender_role && t.last_sender_role !== "customer") {
          return false;
        }

        // Check if admin viewed/read this thread after the last message was posted
        const lastReadAt = readStore[t.session_id];
        if (lastReadAt) {
          const lastMsgTime = t.last_message_at ? new Date(t.last_message_at).getTime() : 0;
          if (lastReadAt >= lastMsgTime) {
            return false; // Already read!
          }
        }

        const backendUnread = Number(t.unread_count || 0);
        return backendUnread > 0 || !lastReadAt;
      }).length;
    } catch {
      return 0;
    }
  }, [isAdminOrStaff, adminThreads, readVersion]);

  // Live order status and clarification tracking
  const [liveOrderDetails, setLiveOrderDetails] = useState(null);

  // Derive order and custom cake details from chat announcements or purchasedCake
  const detectedOrder = useMemo(() => {
    // 1. Search messages history for custom cake order announcement (newest first)
    if (Array.isArray(messages)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m?.message) {
          const parsed = parseCakeOrderMessage(m.message);
          if (parsed && parsed.orderId) {
            return {
              orderId: parsed.orderId.replace(/^#/, ""),
              cakeName: parsed.cakeName,
              specs: parsed.specs,
              dedication: parsed.dedication,
              specialRequest: parsed.specialRequest
            };
          }
        }
      }
    }
    // 2. Fall back to localStorage purchasedCake
    if (purchasedCake?.orderId) {
      return {
        orderId: (purchasedCake.orderId || "").replace(/^#/, ""),
        cakeName: purchasedCake.cakeName,
        specs: [purchasedCake.size, purchasedCake.flavor, purchasedCake.shape].filter(Boolean),
        dedication: purchasedCake.message,
        specialRequest: purchasedCake.instructions,
        scheduledDate: purchasedCake.scheduledDate,
        scheduledTime: purchasedCake.scheduledTime
      };
    }
    return null;
  }, [messages, purchasedCake]);

  const activeOrderId = detectedOrder?.orderId || null;

  // Poll live order details (status, denial reason, scheduled date, etc.)
  const fetchLiveOrderStatus = useCallback(async () => {
    if (!activeOrderId || isAdminOrStaff) return;
    try {
      const res = await orderService.getOrderDetails(activeOrderId);
      if (res && res.success && res.order) {
        setLiveOrderDetails(res.order);
      }
    } catch (err) {
      console.warn("Could not fetch live order details:", err);
    }
  }, [activeOrderId, isAdminOrStaff]);

  useEffect(() => {
    if (activeOrderId && isOpen && !isAdminOrStaff) {
      fetchLiveOrderStatus();
      const interval = setInterval(fetchLiveOrderStatus, 4000);
      const handleOrdersUpdated = () => fetchLiveOrderStatus();
      window.addEventListener("ordersUpdated", handleOrdersUpdated);
      return () => {
        clearInterval(interval);
        window.removeEventListener("ordersUpdated", handleOrdersUpdated);
      };
    }
  }, [activeOrderId, isOpen, isAdminOrStaff, fetchLiveOrderStatus]);

  // Compute real-time status and clear explanation for the customer
  const currentStatus = (liveOrderDetails?.status || "Pending").trim();
  const cancellationReason = liveOrderDetails?.cancellation_reason || liveOrderDetails?.reason || "";
  const statusClarification = getStatusClarification(currentStatus, cancellationReason);

  // Customer Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    const senderRole = currentUser?.role || "customer";
    const senderName = currentUser?.first_name
      ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
      : (currentUser?.username || "Customer");

    try {
      setSending(true);
      setInputText("");

      const tempMsg = {
        id: Date.now(),
        session_id: sessionId,
        sender_name: senderName,
        sender_role: senderRole,
        message: trimmed,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, tempMsg]);

      await cakeChatService.sendMessage({
        sessionId,
        senderName,
        senderRole,
        message: trimmed,
        userId: currentUser?.id || null
      });

      fetchCustomerMessages();
    } catch (err) {
      console.error("Failed to send cake chat message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    setInputText(promptText);
  };

  // ==========================================================================
  // CONDITIONAL RENDER: Executed AFTER all hooks have executed unconditionally
  // ==========================================================================

  // 1. If not logged in (no account / logged out), do not render
  if (!currentUser) {
    return null;
  }

  // 2. If logged in as ADMIN or STAFF: Show the One-to-Many Chat Manager
  if (isAdminOrStaff) {
    return (
      <div className="cake-chat-wrapper">
        <button
          type="button"
          className="cake-chat-trigger admin-chat-trigger"
          onClick={() => setIsOpen(true)}
          title="Customer Cake Inquiries (Admin Portal)"
        >
          <span className="chat-trigger-icon">👑</span>
          <span className="chat-trigger-label">Customer Chats</span>
          {unreadThreadsCount > 0 && (
            <span className="chat-badge" title={`${unreadThreadsCount} unread customer message${unreadThreadsCount > 1 ? "s" : ""}`}>
              {unreadThreadsCount}
            </span>
          )}
        </button>

        {/* Full One-to-Many Multi-Customer Admin Console */}
        <AdminCakeChatModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </div>
    );
  }

  // 3. If logged in as CUSTOMER: Show the One-to-One Bakery Chat Box
  const customerName = currentUser.first_name
    ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
    : currentUser.username;

  return (
    <div className="cake-chat-wrapper">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          className="cake-chat-trigger"
          onClick={() => setIsOpen(true)}
          title="Chat with Bakery about your Cake"
        >
          <span className="chat-trigger-icon">💬</span>
          <span className="chat-trigger-label">
            {purchasedCake ? "Cake Order Chat" : "Chat with Baker"}
          </span>
          {purchasedCake && <span className="purchased-dot" title="Active Cake Order"></span>}
        </button>
      )}

      {/* Expandable Chat Window (One-to-One with Baker) */}
      {isOpen && (
        <div className={`cake-chat-window ${isExpandedSize ? "expanded-view" : ""}`}>
          {/* Header */}
          <div className="cake-chat-header">
            <div className="header-baker-info">
              <span className="baker-avatar">👨‍🍳</span>
              <div>
                <h4>Bake House Cake Concierge</h4>
                <span className="status-indicator">
                  <span className="status-dot"></span> Online • Baker & Staff
                </span>
              </div>
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="chat-size-toggle-btn"
                onClick={() => setIsExpandedSize(!isExpandedSize)}
                title={isExpandedSize ? "Restore comfortable size" : "Make chatbox bigger"}
                aria-label={isExpandedSize ? "Restore normal size" : "Expand chat window"}
              >
                {isExpandedSize ? "🗗" : "🗖"}
              </button>
              <button
                type="button"
                className="chat-close-btn"
                onClick={() => setIsOpen(false)}
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Purchased Cake Order Card (Collapsible with Real-Time Status & Clarification) */}
          {(detectedOrder || purchasedCake) ? (
            <div className={`purchased-cake-banner banner-${statusClarification.badgeClass} ${isOrderCollapsed ? "is-collapsed" : ""}`}>
              <div
                className="banner-top clickable"
                onClick={() => setIsOrderCollapsed(!isOrderCollapsed)}
                title="Click to collapse or expand order details"
              >
                <div className="banner-top-left">
                  <span className="order-pill">🎂 Order #{activeOrderId || purchasedCake?.orderId}</span>
                  <span className={`status-badge-pill ${statusClarification.badgeClass}`}>
                    {statusClarification.icon} {statusClarification.label}
                  </span>
                </div>
                <button
                  type="button"
                  className="order-collapse-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOrderCollapsed(!isOrderCollapsed);
                  }}
                  aria-expanded={!isOrderCollapsed}
                >
                  {isOrderCollapsed ? "▾ Show Details" : "▴ Collapse"}
                </button>
              </div>

              {/* Order Status Clarification Callout */}
              <div className={`order-status-card ${statusClarification.badgeClass}`}>
                <div className="status-card-header">
                  <span className="status-card-icon">{statusClarification.icon}</span>
                  <div className="status-card-titles">
                    <strong>{statusClarification.title}</strong>
                    <span className="status-sub-label">Current Fulfillment Status</span>
                  </div>
                </div>

                <p className="status-card-desc">{statusClarification.description}</p>

                {/* Progress Pipeline Stepper (for active orders) */}
                {!statusClarification.isDenied && (
                  <div className="status-stepper-row">
                    <div className={`step-node ${statusClarification.step >= 1 ? "step-active" : ""}`}>
                      <span className="step-dot">{statusClarification.step > 1 ? "✓" : "1"}</span>
                      <span className="step-name">Received</span>
                    </div>
                    <div className={`step-line ${statusClarification.step >= 2 ? "line-active" : ""}`}></div>
                    <div className={`step-node ${statusClarification.step >= 2 ? "step-active" : ""}`}>
                      <span className="step-dot">{statusClarification.step > 2 ? "✓" : "2"}</span>
                      <span className="step-name">Accepted</span>
                    </div>
                    <div className={`step-line ${statusClarification.step >= 3 ? "line-active" : ""}`}></div>
                    <div className={`step-node ${statusClarification.step >= 3 ? "step-active" : ""}`}>
                      <span className="step-dot">{statusClarification.step > 3 ? "✓" : "3"}</span>
                      <span className="step-name">Baking</span>
                    </div>
                    <div className={`step-line ${statusClarification.step >= 4 ? "line-active" : ""}`}></div>
                    <div className={`step-node ${statusClarification.step >= 4 ? "step-active" : ""}`}>
                      <span className="step-dot">{statusClarification.step > 4 ? "✓" : "4"}</span>
                      <span className="step-name">Ready</span>
                    </div>
                  </div>
                )}

                {/* Special Guidance / Clarification Action Hint */}
                {statusClarification.actionHint && (
                  <div className="status-card-hint">
                    {statusClarification.actionHint}
                  </div>
                )}
              </div>

              {!isOrderCollapsed && (
                <div className="banner-details">
                  <p><strong>Cake:</strong> {detectedOrder?.cakeName || purchasedCake?.cakeName || liveOrderDetails?.items?.[0]?.product_name || "Custom Cake"}</p>
                  {(detectedOrder?.specs?.length > 0 || purchasedCake?.size || liveOrderDetails?.items?.[0]?.customization) && (
                    <p>
                      <strong>Specs:</strong>{" "}
                      {detectedOrder?.specs?.length > 0
                        ? detectedOrder.specs.join(" • ")
                        : [
                            purchasedCake?.size || liveOrderDetails?.items?.[0]?.customization?.size,
                            purchasedCake?.flavor || liveOrderDetails?.items?.[0]?.customization?.flavor,
                            purchasedCake?.shape || liveOrderDetails?.items?.[0]?.customization?.shape
                          ].filter(Boolean).join(" • ")}
                    </p>
                  )}
                  {(purchasedCake?.color || liveOrderDetails?.items?.[0]?.customization?.color) && (
                    <p><strong>Frosting:</strong> {purchasedCake?.color || liveOrderDetails?.items?.[0]?.customization?.color}</p>
                  )}
                  {(detectedOrder?.dedication || purchasedCake?.message || liveOrderDetails?.items?.[0]?.customization?.message) && (
                    <p><strong>Dedication:</strong> "{detectedOrder?.dedication || purchasedCake?.message || liveOrderDetails?.items?.[0]?.customization?.message}"</p>
                  )}
                  {(detectedOrder?.specialRequest || purchasedCake?.instructions || liveOrderDetails?.items?.[0]?.customization?.instructions) && (
                    <p><strong>Requests:</strong> "{detectedOrder?.specialRequest || purchasedCake?.instructions || liveOrderDetails?.items?.[0]?.customization?.instructions}"</p>
                  )}
                  {(purchasedCake?.scheduledDate || liveOrderDetails?.items?.[0]?.customization?.scheduled_date) && (
                    <p>
                      <strong>📅 Date Needed:</strong>{" "}
                      {purchasedCake?.scheduledDate || liveOrderDetails?.items?.[0]?.customization?.scheduled_date}{" "}
                      {(purchasedCake?.scheduledTime || liveOrderDetails?.items?.[0]?.customization?.scheduled_time)
                        ? `(${purchasedCake?.scheduledTime || liveOrderDetails?.items?.[0]?.customization?.scheduled_time})`
                        : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="cake-context-badge">
              🎂 <strong>Custom Cake Builder:</strong> Chat with our bakers anytime!
            </div>
          )}

          {/* Message History */}
          <div className="cake-chat-body">
            {/* Default Greeting */}
            <div className="chat-bubble baker-bubble system-welcome">
              <span className="bubble-sender">👨‍🍳 Chef Baker</span>
              <p>
                {purchasedCake
                  ? `Hello ${customerName}! We have your custom cake details for Order #${purchasedCake.orderId}. If you need to clarify decorations, request candles, or adjust timing, let us know here!`
                  : `Hello! Welcome to Bake House! Designing a custom cake or have questions about flavors, tiers, or rush orders? Ask us here!`}
              </p>
              <span className="bubble-time">Live Support</span>
            </div>

            {messages.map((m, idx) => {
              const isMe = m.sender_role === "customer";
              const timeString = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

              // Check if message is a product photo from baker or customer
              let imgData = null;
              if (m.message && typeof m.message === "string" && m.message.trim().startsWith("[IMAGE]:")) {
                const payload = m.message.trim().replace(/^\[IMAGE\]:\s*/i, "");
                const separatorIdx = payload.indexOf("|");
                if (separatorIdx !== -1) {
                  imgData = {
                    imageUrl: payload.slice(0, separatorIdx).trim(),
                    caption: payload.slice(separatorIdx + 1).trim()
                  };
                } else {
                  imgData = { imageUrl: payload.trim(), caption: "" };
                }
              }

              return (
                <div
                  key={m.id || idx}
                  className={`chat-bubble ${isMe ? "customer-bubble" : "baker-bubble"}`}
                >
                  <span className="bubble-sender">
                    {isMe ? "You" : `👨‍🍳 ${m.sender_name || 'Baker'}`}
                  </span>

                  {imgData ? (
                    <div className="chat-photo-attachment">
                      <div className="photo-label-row">
                        <span>{isMe ? "📷 Photo Sent" : "🎂 Product Photo from Baker"}</span>
                      </div>
                      <div
                        className="photo-thumb-container"
                        onClick={() => window.open(imgData.imageUrl.startsWith("http") ? imgData.imageUrl : `http://localhost:8000${imgData.imageUrl}`, "_blank")}
                        title="Click to open full photo"
                      >
                        <img
                          src={imgData.imageUrl}
                          alt="Product or Reference"
                          className="customer-chat-photo"
                          onError={(e) => {
                            if (!imgData.imageUrl.startsWith("http")) {
                              e.target.src = `http://localhost:8000${imgData.imageUrl}`;
                            }
                          }}
                        />
                      </div>
                      {imgData.caption && (
                        <p className="photo-caption-text">{imgData.caption}</p>
                      )}
                    </div>
                  ) : (
                    <p>{m.message}</p>
                  )}

                  {timeString && <span className="bubble-time">{timeString}</span>}
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="quick-suggestions">
            {purchasedCake ? (
              <>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt(`Hi! Can you send a photo of the cake before it's dispatched?`)}
                >
                  📸 Send photo before delivery?
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt(`Can you include birthday candles and a cake knife?`)}
                >
                  🕯️ Include candles?
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt(`Hi, what is the estimated preparation status for Order #${purchasedCake.orderId}?`)}
                >
                  ⏳ Prep Status?
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt("Can you make a 2-tier version of this design?")}
                >
                  2-Tier Cake?
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt("Can you customize this with gold leaf & flowers?")}
                >
                  Add Gold Leaf?
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt("Is rush delivery available for this weekend?")}
                >
                  Rush Delivery?
                </button>
              </>
            )}
          </div>

          {/* Input Form */}
          <form className="cake-chat-footer" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder={purchasedCake ? `Ask baker about Order #${purchasedCake.orderId}...` : "Ask the baker about your cake..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={sending}
              autoFocus
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="chat-send-btn"
            >
              {sending ? "..." : "➤"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default CakeChatBox;
