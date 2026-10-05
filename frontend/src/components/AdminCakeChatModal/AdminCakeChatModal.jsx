/**
 * ============================================================================
 * BAKE HOUSE - Admin Cake Consultation Chat Manager
 * ============================================================================
 * Allows Admin and Baker Staff to monitor active custom cake design sessions,
 * view customer inquiries, and reply in real time.
 * ============================================================================
 */

import { useState, useEffect, useRef } from "react";
import { cakeChatService } from "../../services/cakeChatService";
import { authService } from "../../services/authService";
import "./AdminCakeChatModal.css";

const BAKER_QUICK_REPLIES = [
  { label: "✨ Confirmed Design", text: "Hello! We reviewed your custom cake design and our decorators can definitely prepare this!" },
  { label: "📸 Send Photo", text: "Hi! Could you please share a photo reference or inspiration picture of how you'd like the cake decorated?" },
  { label: "✍️ Dedication Noted", text: "Got it! Your dedication message has been forwarded directly to our cake decorator." },
  { label: "👨‍🍳 Now Baking", text: "Great news! Your custom cake has entered our kitchen and is currently in the oven." },
  { label: "📦 Ready for Pickup", text: "Your custom cake has been decorated, boxed, and is ready for pickup at our counter!" }
];

/**
 * NOTE TO BE REVIEWED LATER:
 * Parser function for automated custom cake order messages.
 * Detects whether a message is an order notification and breaks it down
 * into structured components (Order ID, cake specs, dedication message, notes)
 * for high legibility in the bakery kitchen.
 */
function parseCakeOrderMessage(text) {
  if (!text || typeof text !== "string") return null;

  const isOrderPlaced = text.includes("Placed!") || text.includes("Custom Cake:") || text.includes("Message on cake:");
  if (!isOrderPlaced) return null;

  const orderMatch = text.match(/Order\s+(#?[A-Za-z0-9_-]+)/i);
  const orderId = orderMatch ? orderMatch[1] : null;

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
    specialRequest,
    rawText: text
  };
}

function AdminCakeChatModal({ isOpen, onClose }) {
  const [threads, setThreads] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedOrderId, setCopiedOrderId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const currentUser = authService.getCurrentUser();
  const adminName = currentUser ? (currentUser.first_name || currentUser.username) : "Baker";

  // Load threads
  const loadThreads = async () => {
    try {
      setLoadingThreads(true);
      const res = await cakeChatService.getActiveSessions();
      if (res && res.success && Array.isArray(res.threads)) {
        setThreads(res.threads);
        if (!selectedSessionId && res.threads.length > 0) {
          setSelectedSessionId(res.threads[0].session_id);
        }
      }
    } catch (err) {
      console.warn("Could not load chat threads:", err);
    } finally {
      setLoadingThreads(false);
    }
  };

  // Load messages for selected thread
  const loadMessages = async (sid) => {
    if (!sid) return;
    try {
      const res = await cakeChatService.getMessages(sid);
      if (res && res.success && Array.isArray(res.messages)) {
        setMessages(res.messages);
      }
    } catch (err) {
      console.warn("Could not load thread messages:", err);
    }
  };

  // Poll threads and active thread messages
  useEffect(() => {
    if (!isOpen) return;
    loadThreads();
    const interval = setInterval(() => {
      loadThreads();
      if (selectedSessionId) {
        loadMessages(selectedSessionId);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, selectedSessionId]);

  // When selected session changes, fetch immediately
  useEffect(() => {
    if (selectedSessionId) {
      loadMessages(selectedSessionId);
    }
  }, [selectedSessionId]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Copy Order ID helper
  const handleCopyOrderId = (oid) => {
    if (!oid) return;
    navigator.clipboard?.writeText(oid.replace(/^#/, ''));
    setCopiedOrderId(oid);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  // Use quick reply preset
  const handleApplyQuickReply = (text) => {
    setReplyText(text);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Send Admin Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed || !selectedSessionId || sending) return;

    try {
      setSending(true);
      setReplyText("");

      const optimistic = {
        id: Date.now(),
        session_id: selectedSessionId,
        sender_name: adminName,
        sender_role: "admin",
        message: trimmed,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, optimistic]);

      await cakeChatService.sendMessage({
        sessionId: selectedSessionId,
        senderName: adminName,
        senderRole: currentUser?.role || "admin",
        message: trimmed,
        userId: currentUser?.id || null
      });

      loadMessages(selectedSessionId);
    } catch (err) {
      console.error("Failed to send admin reply:", err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  // Filter threads by search query
  const filteredThreads = threads.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
      (t.last_message && t.last_message.toLowerCase().includes(q))
    );
  });

  const activeThread = threads.find((t) => t.session_id === selectedSessionId);

  return (
    <div className="admin-chat-overlay" onClick={onClose}>
      <div className="admin-chat-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="admin-chat-header">
          <div className="header-title">
            <span className="header-icon">🎂</span>
            <div>
              <h3>Custom Cake Consultations</h3>
              <p>Live inquiries & design specifications from customers</p>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} title="Close Consultations">✕</button>
        </div>

        {/* Content Layout */}
        <div className="admin-chat-body">
          {/* Left Column: Customer Threads */}
          <div className="threads-list">
            <div className="threads-header">
              <span>Customer Inquiries ({threads.length})</span>
              <button type="button" onClick={loadThreads} title="Refresh Inquiries">🔄</button>
            </div>

            {/* Inquiries Search Bar */}
            <div className="threads-search-wrap">
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="threads-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="threads-clear-search"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>

            {filteredThreads.length === 0 ? (
              <div className="empty-threads">
                {loadingThreads ? "Loading chats..." : "No matching customer chats."}
              </div>
            ) : (
              filteredThreads.map((t) => {
                const isSelected = t.session_id === selectedSessionId;
                const timeStr = t.last_message_at
                  ? new Date(t.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : "";

                return (
                  <div
                    key={t.session_id}
                    className={`thread-item ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedSessionId(t.session_id)}
                  >
                    <div className="thread-avatar">👤</div>
                    <div className="thread-info">
                      <div className="thread-top">
                        <strong>{t.customer_name || "Customer"}</strong>
                        <span className="thread-time">{timeStr}</span>
                      </div>
                      <p className="thread-preview">{t.last_message || "No messages"}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Chat View */}
          <div className="chat-conversation-pane">
            {selectedSessionId ? (
              <>
                <div className="conversation-header">
                  <div className="conversation-user-details">
                    <span className="customer-avatar-badge">👤</span>
                    <div>
                      <strong className="customer-name-heading">
                        {activeThread?.customer_name || 'Customer'}
                      </strong>
                      <div className="customer-meta-row">
                        <span className="active-status-dot">● Active Consultation</span>
                        <span className="session-tag" title={selectedSessionId}>
                          Session: {selectedSessionId.slice(0, 10)}...
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="header-pane-actions">
                    <button
                      type="button"
                      className="header-action-pill"
                      onClick={() => loadMessages(selectedSessionId)}
                      title="Refresh this chat"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>

                <div className="conversation-messages">
                  {messages.length === 0 ? (
                    <div className="empty-messages">
                      <p>No messages in this conversation thread yet.</p>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isAdmin = m.sender_role === "admin" || m.sender_role === "staff";
                      const timeStr = m.created_at
                        ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : "";

                      // NOTE TO BE REVIEWED LATER: Check if message is an automated cake order specification
                      const cakeOrder = !isAdmin ? parseCakeOrderMessage(m.message) : null;

                      return (
                        <div
                          key={m.id || idx}
                          className={`message-row ${isAdmin ? "row-admin" : "row-customer"}`}
                        >
                          <div className={`message-bubble ${isAdmin ? "bubble-admin" : "bubble-customer"}`}>
                            <span className="msg-sender">
                              {isAdmin ? `👨‍🍳 ${m.sender_name} (Baker Staff)` : `👤 ${m.sender_name}`}
                            </span>

                            {cakeOrder ? (
                              <div className="cake-spec-card">
                                <div className="cake-spec-header">
                                  <span className="spec-badge-title">🎂 Custom Cake Placed</span>
                                  {cakeOrder.orderId && (
                                    <button
                                      type="button"
                                      className="order-id-chip"
                                      onClick={() => handleCopyOrderId(cakeOrder.orderId)}
                                      title="Click to copy Order ID"
                                    >
                                      {copiedOrderId === cakeOrder.orderId ? "✓ Copied!" : `📋 ${cakeOrder.orderId}`}
                                    </button>
                                  )}
                                </div>

                                <strong className="cake-spec-name">{cakeOrder.cakeName}</strong>

                                {cakeOrder.specs.length > 0 && (
                                  <div className="spec-chips-row">
                                    {cakeOrder.specs.map((spec, sIdx) => (
                                      <span key={sIdx} className="spec-chip">
                                        {spec}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {cakeOrder.dedication && (
                                  <div className="spec-dedication-box">
                                    <span className="dedication-label">✍️ Dedication on Cake:</span>
                                    <span className="dedication-quote">"{cakeOrder.dedication}"</span>
                                  </div>
                                )}

                                {cakeOrder.specialRequest && (
                                  <div className="spec-request-box">
                                    <span className="request-label">📝 Special Customer Note:</span>
                                    <p className="request-text">{cakeOrder.specialRequest}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="bubble-text">{m.message}</p>
                            )}

                            {timeStr && <span className="msg-time">{timeStr}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Reply Presets Toolbar */}
                <div className="quick-replies-toolbar">
                  <span className="quick-label">⚡ Baker Quick-Replies:</span>
                  <div className="quick-chips-scroll">
                    {BAKER_QUICK_REPLIES.map((qr, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        className="quick-reply-btn"
                        onClick={() => handleApplyQuickReply(qr.text)}
                        title={qr.text}
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reply Form */}
                <form className="reply-form" onSubmit={handleSendReply}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type reply to customer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={sending}
                  />
                  <button type="submit" disabled={!replyText.trim() || sending}>
                    {sending ? "..." : "Send Reply"}
                  </button>
                </form>
              </>
            ) : (
              <div className="no-thread-selected">
                <p>Select a customer conversation from the left to view and reply.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminCakeChatModal;
