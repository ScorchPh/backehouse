/**
 * ============================================================================
 * BAKE HOUSE - Live Custom Cake Chat Box Component
 * ============================================================================
 * Allows customers and bakers/admins to consult in real-time regarding custom
 * cake requests, decorations, tiers, delivery times, and flavors.
 * Features:
 * - Automatically displays the customer's purchased custom cake order specs
 * - Real-time polling with baker online indicator
 * - Quick prompt suggestions for post-purchase clarifications
 * ============================================================================
 */

import { useState, useEffect, useRef } from "react";
import { cakeChatService } from "../../services/cakeChatService";
import { authService } from "../../services/authService";
import "./CakeChatBox.css";

function CakeChatBox() {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

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

  // Persistent session identifier per customer account
  const sessionId = currentUser?.id
    ? `session_user_${currentUser.id}`
    : (localStorage.getItem("bh_cake_chat_session") || "session_guest");

  // Track purchased custom cake details
  const [purchasedCake, setPurchasedCake] = useState(() => {
    try {
      const saved = localStorage.getItem("bh_last_purchased_cake");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Listen for external open commands (e.g. from OrderSuccess page or buttons)
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

  // If customer is not logged in or has no account, DO NOT display or open the chat box
  if (!currentUser) {
    return null;
  }

  const customerName = currentUser.first_name
    ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
    : (currentUser.username || "Customer");

  // Fetch messages from backend
  const fetchMessages = async () => {
    try {
      const res = await cakeChatService.getMessages(sessionId);
      if (res && res.success && Array.isArray(res.messages)) {
        setMessages(res.messages);
      }
    } catch (err) {
      console.warn("Could not poll cake chat messages:", err);
    }
  };

  // Initial load and periodic polling every 4 seconds
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      setInputText("");

      // Optimistic message update
      const tempMsg = {
        id: Date.now(),
        session_id: sessionId,
        sender_name: customerName,
        sender_role: "customer",
        message: trimmed,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, tempMsg]);

      await cakeChatService.sendMessage({
        sessionId,
        senderName: customerName,
        senderRole: "customer",
        message: trimmed,
        userId: currentUser?.id || null
      });

      fetchMessages();
    } catch (err) {
      console.error("Failed to send cake chat message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    setInputText(promptText);
  };

  return (
    <div className="cake-chat-wrapper">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          className="cake-chat-trigger"
          onClick={() => {
            setIsOpen(true);
            setUnreadCount(0);
          }}
          title="Chat with Bakery about your Cake"
        >
          <span className="chat-trigger-icon">💬</span>
          <span className="chat-trigger-label">
            {purchasedCake ? "Cake Order Chat" : "Chat with Baker"}
          </span>
          {purchasedCake && <span className="purchased-dot" title="Active Cake Order"></span>}
        </button>
      )}

      {/* Expandable Chat Window */}
      {isOpen && (
        <div className="cake-chat-window">
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
            <button
              type="button"
              className="chat-close-btn"
              onClick={() => setIsOpen(false)}
              title="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Purchased Cake Order Card */}
          {purchasedCake ? (
            <div className="purchased-cake-banner">
              <div className="banner-top">
                <span className="order-pill">🎂 Order #{purchasedCake.orderId}</span>
                <span className="badge-confirmed">Order Received</span>
              </div>
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

              return (
                <div
                  key={m.id || idx}
                  className={`chat-bubble ${isMe ? "customer-bubble" : "baker-bubble"}`}
                >
                  <span className="bubble-sender">
                    {isMe ? "You" : `👨‍🍳 ${m.sender_name || 'Baker'}`}
                  </span>
                  <p>{m.message}</p>
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
