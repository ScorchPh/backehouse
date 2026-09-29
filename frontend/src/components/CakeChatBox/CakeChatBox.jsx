/**
 * ============================================================================
 * BAKE HOUSE - Live Custom Cake Chat Box Component
 * ============================================================================
 * Allows customers and bakers/admins to consult in real-time regarding custom
 * cake requests, decorations, tiers, delivery times, and flavors.
 * ============================================================================
 */

import { useState, useEffect, useRef } from "react";
import { cakeChatService } from "../../services/cakeChatService";
import { authService } from "../../services/authService";
import "./CakeChatBox.css";

function CakeChatBox({ cakeContext = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  const currentUser = authService.getCurrentUser();

  // Persistent session identifier per customer
  const [sessionId] = useState(() => {
    let stored = localStorage.getItem("bh_cake_chat_session");
    if (!stored) {
      stored = "session_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      localStorage.setItem("bh_cake_chat_session", stored);
    }
    return stored;
  });

  const customerName = currentUser
    ? (currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim() : currentUser.username)
    : "Customer";

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

      // Refetch confirmed state
      fetchMessages();
    } catch (err) {
      console.error("Failed to send cake chat message:", err);
    } finally {
      setSending(false);
    }
  };

  // Quick prompt button helper
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
          title="Consult with Baker"
        >
          <span className="chat-trigger-icon">💬</span>
          <span className="chat-trigger-label">Chat with Baker</span>
          {unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
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
                <h4>Baker Consultation</h4>
                <span className="status-indicator">
                  <span className="status-dot"></span> Online • Bake House Staff
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

          {/* Quick Context Banner */}
          {cakeContext.flavor && (
            <div className="cake-context-badge">
              🎂 Designing: <strong>{cakeContext.size}</strong> {cakeContext.flavor} ({cakeContext.occasion || 'Cake'})
            </div>
          )}

          {/* Message History */}
          <div className="cake-chat-body">
            {/* Default Greeting */}
            <div className="chat-bubble baker-bubble system-welcome">
              <span className="bubble-sender">👨‍🍳 Chef Baker</span>
              <p>
                Hello! Welcome to Bake House custom cake builder! Have special dietary needs, theme colors, or multi-tier ideas? Ask us anything here!
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

          {/* Quick Question Chips */}
          <div className="quick-suggestions">
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
              onClick={() => handleQuickPrompt("Is same-day pickup or rush delivery available?")}
            >
              Rush Order?
            </button>
          </div>

          {/* Input Form */}
          <form className="cake-chat-footer" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Ask the baker about your cake..."
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
