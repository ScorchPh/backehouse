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

function AdminCakeChatModal({ isOpen, onClose }) {
  const [threads, setThreads] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const messagesEndRef = useRef(null);

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

  return (
    <div className="admin-chat-overlay" onClick={onClose}>
      <div className="admin-chat-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="admin-chat-header">
          <div className="header-title">
            <span className="header-icon">🎂</span>
            <div>
              <h3>Custom Cake Consultations</h3>
              <p>Live inquiries from customers personalizing cakes</p>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Content Layout */}
        <div className="admin-chat-body">
          {/* Left Column: Customer Threads */}
          <div className="threads-list">
            <div className="threads-header">
              <span>Customer Inquiries ({threads.length})</span>
              <button type="button" onClick={loadThreads} title="Refresh">🔄</button>
            </div>

            {threads.length === 0 ? (
              <div className="empty-threads">
                {loadingThreads ? "Loading chats..." : "No active customer chats yet."}
              </div>
            ) : (
              threads.map((t) => {
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
                  <span>Chatting with <strong>{threads.find((t) => t.session_id === selectedSessionId)?.customer_name || 'Customer'}</strong></span>
                  <span className="session-tag">ID: {selectedSessionId.slice(0, 12)}...</span>
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

                      return (
                        <div
                          key={m.id || idx}
                          className={`message-row ${isAdmin ? "row-admin" : "row-customer"}`}
                        >
                          <div className={`message-bubble ${isAdmin ? "bubble-admin" : "bubble-customer"}`}>
                            <span className="msg-sender">
                              {isAdmin ? `👑 ${m.sender_name} (Baker Staff)` : `👤 ${m.sender_name}`}
                            </span>
                            <p>{m.message}</p>
                            {timeStr && <span className="msg-time">{timeStr}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Form */}
                <form className="reply-form" onSubmit={handleSendReply}>
                  <input
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
