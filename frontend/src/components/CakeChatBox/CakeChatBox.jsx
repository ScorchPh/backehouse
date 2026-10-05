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

import { useState, useEffect, useRef, useCallback } from "react";
import { cakeChatService } from "../../services/cakeChatService";
import { authService } from "../../services/authService";
import AdminCakeChatModal from "../AdminCakeChatModal/AdminCakeChatModal";
import "./CakeChatBox.css";

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
          {adminThreads.length > 0 && (
            <span className="chat-badge" title={`${adminThreads.length} active customer threads`}>
              {adminThreads.length}
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

          {/* Purchased Cake Order Card (Collapsible) */}
          {purchasedCake ? (
            <div className={`purchased-cake-banner ${isOrderCollapsed ? "is-collapsed" : ""}`}>
              <div
                className="banner-top clickable"
                onClick={() => setIsOrderCollapsed(!isOrderCollapsed)}
                title="Click to collapse or expand order details"
              >
                <div className="banner-top-left">
                  <span className="order-pill">🎂 Order #{purchasedCake.orderId}</span>
                  <span className="badge-confirmed">Order Received</span>
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
                  {isOrderCollapsed ? "▾ Show Order Details" : "▴ Collapse Order"}
                </button>
              </div>

              {!isOrderCollapsed && (
                <>
                  <div className="banner-details">
                    <p><strong>Cake:</strong> {purchasedCake.cakeName}</p>
                    <p><strong>Specs:</strong> {purchasedCake.size} • {purchasedCake.flavor} • {purchasedCake.shape}</p>
                    <p><strong>Frosting:</strong> {purchasedCake.color}</p>
                    {purchasedCake.message && purchasedCake.message !== "None" && (
                      <p><strong>Message:</strong> "{purchasedCake.message}"</p>
                    )}
                    {purchasedCake.instructions && purchasedCake.instructions !== "None" && (
                      <p><strong>Requests:</strong> "{purchasedCake.instructions}"</p>
                    )}
                    {purchasedCake.scheduledDate && (
                      <p><strong>📅 Date Needed:</strong> {purchasedCake.scheduledDate} {purchasedCake.scheduledTime ? `(${purchasedCake.scheduledTime})` : ''}</p>
                    )}
                  </div>
                  <div className="banner-note">
                    💡 <em>Have special requests, delivery updates, or questions for our bakers? Message us below!</em>
                  </div>
                </>
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
