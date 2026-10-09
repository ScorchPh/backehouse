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
import { productService } from "../../services/productService";
import { orderService } from "../../services/orderService";
import "./AdminCakeChatModal.css";

const BAKER_QUICK_REPLIES = [
  { label: "✨ Confirmed Design", text: "Hello! We reviewed your custom cake design and our decorators can definitely prepare this!" },
  { label: "📸 Send Photo", text: "Hi! Could you please share a photo reference or inspiration picture of how you'd like the cake decorated?" },
  { label: "✍️ Dedication Noted", text: "Got it! Your dedication message has been forwarded directly to our cake decorator." },
  { label: "👨‍🍳 Now Baking", text: "Great news! Your custom cake has entered our kitchen and is currently in the oven." },
  { label: "📦 Ready for Pickup", text: "Your custom cake has been decorated, boxed, and is ready for pickup at our counter!" }
];

const PRESET_DENIAL_REASONS = [
  "Fully booked for this scheduled date and time slot",
  "Custom decorative elements or ingredients currently out of stock",
  "Lead time is too short for this multi-tier / sculpted design",
  "Design complexity exceeds current kitchen capacity",
  "Other specific reason..."
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
    specialRequest,
    rawText: text
  };
}

/**
 * NOTE TO BE REVIEWED LATER:
 * Image message parser.
 * Detects if the message contains an uploaded product/cake photo:
 * Format: [IMAGE]: /uploads/productimg/prod_123.jpg | Optional Caption
 */
function parseImageMessage(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (trimmed.startsWith("[IMAGE]:")) {
    const payload = trimmed.replace(/^\[IMAGE\]:\s*/i, "");
    const separatorIdx = payload.indexOf("|");
    if (separatorIdx !== -1) {
      return {
        imageUrl: payload.slice(0, separatorIdx).trim(),
        caption: payload.slice(separatorIdx + 1).trim()
      };
    }
    return { imageUrl: payload.trim(), caption: "" };
  }
  if (/^\/uploads\/productimg\/[^\s]+$/i.test(trimmed)) {
    return { imageUrl: trimmed, caption: "" };
  }
  return null;
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

  // Picture attachment state for product photo preview
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);

  // Live order status management for custom cake consultations
  const [orderStatuses, setOrderStatuses] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [denyingOrderId, setDenyingOrderId] = useState(null);
  const [denialPreset, setDenialPreset] = useState(PRESET_DENIAL_REASONS[0]);
  const [customDenialReason, setCustomDenialReason] = useState("");
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const isInitialThreadLoadRef = useRef(true);

  const currentUser = authService.getCurrentUser();
  const adminName = currentUser ? (currentUser.first_name || currentUser.username) : "Baker";

  // Fetch details for any order found in thread messages
  const fetchOrdersForMessages = async (msgs) => {
    if (!Array.isArray(msgs) || msgs.length === 0) return;
    const ids = [];
    msgs.forEach((m) => {
      const parsed = parseCakeOrderMessage(m.message);
      if (parsed?.orderId && !ids.includes(parsed.orderId)) {
        ids.push(parsed.orderId);
      }
    });

    for (const oid of ids) {
      try {
        const res = await orderService.getOrderDetails(oid);
        if (res && res.success && res.order) {
          setOrderStatuses((prev) => ({
            ...prev,
            [oid]: {
              status: res.order.status,
              cancellation_reason: res.order.cancellation_reason || ""
            }
          }));
        }
      } catch (e) {
        console.warn("Could not fetch details for order:", oid, e);
      }
    }
  };

  // Load threads
  const loadThreads = async () => {
    try {
      setLoadingThreads(true);
      const res = await cakeChatService.getActiveSessions();
      if (res && res.success && Array.isArray(res.threads)) {
        setThreads(res.threads);
        if (!selectedSessionId && res.threads.length > 0) {
          const firstSid = res.threads[0].session_id;
          setSelectedSessionId(firstSid);
          markSessionRead(firstSid);
        } else if (selectedSessionId) {
          markSessionRead(selectedSessionId);
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
        setMessages((prev) => {
          // Avoid triggering unnecessary re-renders and scroll changes if messages haven't changed
          if (
            prev.length === res.messages.length &&
            prev.length > 0 &&
            prev[prev.length - 1]?.id === res.messages[res.messages.length - 1]?.id
          ) {
            return prev;
          }
          return res.messages;
        });
        fetchOrdersForMessages(res.messages);
      }
    } catch (err) {
      console.warn("Could not load thread messages:", err);
    }
  };

  // Listen for external order status changes to keep consultation synced
  useEffect(() => {
    const handleOrdersUpdated = () => {
      if (messages.length > 0) {
        fetchOrdersForMessages(messages);
      }
    };
    window.addEventListener("ordersUpdated", handleOrdersUpdated);
    return () => window.removeEventListener("ordersUpdated", handleOrdersUpdated);
  }, [messages]);

  // Handle Baker Decisions (Accept, Deny, Prepare, Ready)
  const handleUpdateStatus = async (orderId, newStatus, reason = null) => {
    if (!orderId || actionLoading) return;
    try {
      setActionLoading(orderId);
      const res = await orderService.updateOrderStatus(orderId, newStatus, reason);
      if (res && res.success !== false) {
        // Update local map optimistically
        setOrderStatuses((prev) => ({
          ...prev,
          [orderId]: {
            status: newStatus,
            cancellation_reason: reason || ""
          }
        }));

        // Send official bakery notification message into customer chat
        let autoMsg = "";
        if (newStatus === "Confirmed") {
          autoMsg = `✅ [ORDER ACCEPTED]: Great news! We have reviewed and ACCEPTED your custom cake order (Order #${orderId}). Our decorators will schedule your cake preparation for your needed date!`;
        } else if (newStatus === "Denied") {
          autoMsg = `❌ [ORDER DECLINED]: We apologize, but your custom cake order (Order #${orderId}) could not be accommodated.\nClarification from Bakery: "${reason || 'Fully booked or requirements unavailable'}".\nPlease message us here if you would like to discuss alternative flavors, sizes, or available dates!`;
        } else if (newStatus === "Preparing") {
          autoMsg = `👨‍🍳 [ORDER UPDATE]: Order #${orderId} has entered our kitchen and is now actively baking and decorating!`;
        } else if (newStatus === "Ready for Pickup") {
          autoMsg = `📦 [ORDER UPDATE]: Order #${orderId} has been decorated, boxed, and is READY FOR PICKUP at the Bake House counter!`;
        }

        if (autoMsg && selectedSessionId) {
          await cakeChatService.sendMessage({
            sessionId: selectedSessionId,
            senderName: `${adminName} (Baker Staff)`,
            senderRole: "admin",
            message: autoMsg,
            userId: currentUser?.id || null
          });
          loadMessages(selectedSessionId);
        }
      }
    } catch (err) {
      console.error("Failed to update cake order status:", err);
      alert("Error updating order status: " + (err.message || "Unknown error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenDenialModal = (orderId) => {
    setDenyingOrderId(orderId);
    setDenialPreset(PRESET_DENIAL_REASONS[0]);
    setCustomDenialReason("");
  };

  const handleConfirmDenial = async () => {
    if (!denyingOrderId) return;
    const finalReason = denialPreset === "Other specific reason..."
      ? (customDenialReason.trim() || "Unable to fulfill custom request at this time")
      : denialPreset;

    const oid = denyingOrderId;
    setDenyingOrderId(null);
    await handleUpdateStatus(oid, "Denied", finalReason);
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

  // Mark session as read helper (updates localStorage, triggers event, and calls backend)
  const markSessionRead = async (sid) => {
    if (!sid) return;
    try {
      // 1. Record read timestamp in localStorage for instant reactive UI
      const readStore = JSON.parse(localStorage.getItem("bh_admin_read_cake_threads") || "{}");
      readStore[sid] = Date.now();
      localStorage.setItem("bh_admin_read_cake_threads", JSON.stringify(readStore));
      window.dispatchEvent(new Event("cakeChatReadUpdated"));

      // 2. Optimistically mark read in component state
      setThreads((prev) =>
        prev.map((t) => (t.session_id === sid ? { ...t, unread_count: 0 } : t))
      );

      // 3. Persist read receipt to backend
      await cakeChatService.markSessionAsRead(sid);
    } catch (e) {
      console.warn("Could not mark session read:", e);
    }
  };

  // When selected session changes, fetch immediately and mark as read
  useEffect(() => {
    if (selectedSessionId && isOpen) {
      isInitialThreadLoadRef.current = true;
      isAtBottomRef.current = true;
      setShowScrollBottomBtn(false);
      loadMessages(selectedSessionId);
      markSessionRead(selectedSessionId);
    }
  }, [selectedSessionId, isOpen]);

  // Handle user scroll detection
  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    // If distance from bottom is within 100px, treat as reading at bottom
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const atBottom = distanceFromBottom <= 100;
    isAtBottomRef.current = atBottom;
    setShowScrollBottomBtn(!atBottom);
  };

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    isAtBottomRef.current = true;
    setShowScrollBottomBtn(false);
  };

  // Scroll to bottom of chat only when at bottom or on initial thread load
  useEffect(() => {
    if (isInitialThreadLoadRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      isInitialThreadLoadRef.current = false;
    } else if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    // If user scrolled up to read previous chat (isAtBottomRef.current === false), do NOT auto-scroll!
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

  // Select photo file handler
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG, WEBP, JFIF).");
      return;
    }
    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleCancelImage = () => {
    setSelectedImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Send Admin Reply (with optional product image upload)
  const handleSendReply = async (e) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if ((!trimmed && !selectedImageFile) || !selectedSessionId || sending) return;

    try {
      setSending(true);

      let finalUploadedUrl = "";
      if (selectedImageFile) {
        const uploadRes = await productService.uploadProductImage(selectedImageFile);
        if (uploadRes && uploadRes.image_url) {
          finalUploadedUrl = uploadRes.image_url;
        } else {
          throw new Error(uploadRes.error || "Failed to upload product picture.");
        }
      }

      const finalMessage = finalUploadedUrl
        ? (trimmed ? `[IMAGE]: ${finalUploadedUrl} | ${trimmed}` : `[IMAGE]: ${finalUploadedUrl}`)
        : trimmed;

      setReplyText("");
      handleCancelImage();

      const optimistic = {
        id: Date.now(),
        session_id: selectedSessionId,
        sender_name: adminName,
        sender_role: "admin",
        message: finalMessage,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, optimistic]);
      isAtBottomRef.current = true;
      setTimeout(() => scrollToBottom("smooth"), 50);

      await cakeChatService.sendMessage({
        sessionId: selectedSessionId,
        senderName: adminName,
        senderRole: currentUser?.role || "admin",
        message: finalMessage,
        userId: currentUser?.id || null
      });

      loadMessages(selectedSessionId);
    } catch (err) {
      console.error("Failed to send admin reply:", err);
      alert("Error: " + err.message);
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

                // Format preview for photos or custom orders
                let previewText = t.last_message || "No messages";
                if (previewText.startsWith("[IMAGE]:")) {
                  const parts = previewText.replace(/^\[IMAGE\]:\s*/i, "").split("|");
                  const caption = parts[1] ? parts[1].trim() : "";
                  previewText = caption ? `📷 Photo: ${caption}` : "📷 [Sent a Product Photo]";
                }

                return (
                  <div
                    key={t.session_id}
                    className={`thread-item ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedSessionId(t.session_id);
                      markSessionRead(t.session_id);
                    }}
                  >
                    <div className="thread-avatar">👤</div>
                    <div className="thread-info">
                      <div className="thread-top">
                        <strong>{t.customer_name || "Customer"}</strong>
                        <span className="thread-time">{timeStr}</span>
                      </div>
                      <p className="thread-preview">{previewText}</p>
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

                <div className="conversation-messages-wrapper">
                  <div
                    className="conversation-messages"
                    ref={messagesContainerRef}
                    onScroll={handleMessagesScroll}
                  >
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

                      // NOTE TO BE REVIEWED LATER: Check for custom cake spec or product image attachment
                      const cakeOrder = !isAdmin ? parseCakeOrderMessage(m.message) : null;
                      const imgData = parseImageMessage(m.message);

                      return (
                        <div
                          key={m.id || idx}
                          className={`message-row ${isAdmin ? "row-admin" : "row-customer"}`}
                        >
                          <div className={`message-bubble ${isAdmin ? "bubble-admin" : "bubble-customer"}`}>
                            <span className="msg-sender">
                              {isAdmin ? `👨‍🍳 ${m.sender_name} (Baker Staff)` : `👤 ${m.sender_name}`}
                            </span>

                            {imgData ? (
                              <div className="cake-photo-card">
                                <div className="photo-card-header">
                                  <span>{isAdmin ? "🎂 Cake / Product Photo" : "📸 Customer Photo Reference"}</span>
                                  <span className="photo-zoom-hint">🔍 Click to zoom</span>
                                </div>
                                <div
                                  className="photo-img-wrap"
                                  onClick={() => setZoomedImage(imgData.imageUrl)}
                                  title="Click to view full size"
                                >
                                  <img
                                    src={imgData.imageUrl}
                                    alt="Product or Reference"
                                    className="chat-embedded-photo"
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
                            ) : cakeOrder ? (
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

                                {/* NOTE TO BE REVIEWED LATER: Live Order Status & Baker Decision Action Bar */}
                                {cakeOrder.orderId && (() => {
                                  const orderInfo = orderStatuses[cakeOrder.orderId] || null;
                                  const normStatus = (orderInfo?.status || "Pending").toLowerCase().trim();
                                  const isAccepted = normStatus === "confirmed" || normStatus === "accepted";
                                  const isDenied = normStatus === "denied" || normStatus === "cancelled";
                                  const isPreparing = normStatus === "preparing" || normStatus === "in preparation";
                                  const isReady = normStatus === "ready for pickup";
                                  const isCompleted = normStatus === "completed";

                                  return (
                                    <div className="cake-status-baker-section">
                                      <div className="cake-status-row">
                                        <span className="status-title-label">Live Fulfillment Status:</span>
                                        <span className={`baker-status-pill status-${normStatus.replace(/\s+/g, '-')}`}>
                                          {isAccepted && "✅ Accepted & Confirmed"}
                                          {isDenied && "❌ Denied / Declined"}
                                          {isPreparing && "👨‍🍳 In Kitchen (Baking)"}
                                          {isReady && "📦 Ready for Pickup"}
                                          {isCompleted && "🎉 Order Completed"}
                                          {!isAccepted && !isDenied && !isPreparing && !isReady && !isCompleted && "⏳ Pending Baker Review"}
                                        </span>
                                      </div>

                                      {isDenied && orderInfo?.cancellation_reason && (
                                        <div className="baker-denial-reason-box">
                                          <strong>Clarification from Bakery:</strong> "{orderInfo.cancellation_reason}"
                                        </div>
                                      )}

                                      {/* Baker Action Buttons Row */}
                                      <div className="baker-actions-row">
                                        {!isAccepted && !isPreparing && !isReady && !isCompleted && (
                                          <button
                                            type="button"
                                            className="btn-baker-action btn-baker-accept"
                                            onClick={() => handleUpdateStatus(cakeOrder.orderId, "Confirmed")}
                                            disabled={actionLoading === cakeOrder.orderId}
                                            title="Accept this custom cake order and notify customer"
                                          >
                                            {actionLoading === cakeOrder.orderId ? "Saving..." : "✅ Accept Order"}
                                          </button>
                                        )}

                                        {!isDenied && !isCompleted && (
                                          <button
                                            type="button"
                                            className="btn-baker-action btn-baker-deny"
                                            onClick={() => handleOpenDenialModal(cakeOrder.orderId)}
                                            disabled={actionLoading === cakeOrder.orderId}
                                            title="Deny this custom cake order with a clarification reason"
                                          >
                                            ❌ Deny Order...
                                          </button>
                                        )}

                                        {isAccepted && (
                                          <button
                                            type="button"
                                            className="btn-baker-action btn-baker-bake"
                                            onClick={() => handleUpdateStatus(cakeOrder.orderId, "Preparing")}
                                            disabled={actionLoading === cakeOrder.orderId}
                                            title="Mark as actively in kitchen / baking"
                                          >
                                            👨‍🍳 Start Baking
                                          </button>
                                        )}

                                        {isPreparing && (
                                          <button
                                            type="button"
                                            className="btn-baker-action btn-baker-ready"
                                            onClick={() => handleUpdateStatus(cakeOrder.orderId, "Ready for Pickup")}
                                            disabled={actionLoading === cakeOrder.orderId}
                                            title="Mark as finished and ready for customer pickup"
                                          >
                                            📦 Mark Ready
                                          </button>
                                        )}

                                        {isDenied && (
                                          <button
                                            type="button"
                                            className="btn-baker-action btn-baker-reopen"
                                            onClick={() => handleUpdateStatus(cakeOrder.orderId, "Confirmed")}
                                            disabled={actionLoading === cakeOrder.orderId}
                                            title="Reconsider and Accept this order"
                                          >
                                            ↩️ Re-open & Accept
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
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

                {showScrollBottomBtn && (
                  <button
                    type="button"
                    className="btn-scroll-to-bottom"
                    onClick={() => scrollToBottom("smooth")}
                    title="Jump to latest messages"
                  >
                    ↓ Latest Messages
                  </button>
                )}
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

                {/* Staged Photo Attachment Bar */}
                {selectedImageFile && (
                  <div className="staged-image-preview-bar">
                    <div className="staged-preview-left">
                      <img src={imagePreviewUrl} alt="Staged Preview" className="staged-thumb" />
                      <div className="staged-info">
                        <strong>📷 Product Photo Ready to Send</strong>
                        <small>{selectedImageFile.name} ({(selectedImageFile.size / 1024).toFixed(1)} KB)</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cancel-staged-btn"
                      onClick={handleCancelImage}
                      title="Remove picture"
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}

                {/* Hidden File Input for Product Photos */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />

                {/* Reply Form */}
                <form className="reply-form" onSubmit={handleSendReply}>
                  <button
                    type="button"
                    className={`attach-photo-btn ${selectedImageFile ? "has-image" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    title="Send a photo of the product/cake to the customer"
                  >
                    📷 <span className="attach-photo-text">Send Photo</span>
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={selectedImageFile ? "Add an optional caption for this photo..." : "Type reply to customer..."}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={sending}
                  />

                  <button type="submit" disabled={(!replyText.trim() && !selectedImageFile) || sending}>
                    {sending ? "Sending..." : "Send Reply"}
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

        {/* Lightbox Modal for High-Resolution Photo Zoom */}
        {zoomedImage && (
          <div className="cake-photo-lightbox-overlay" onClick={() => setZoomedImage(null)}>
            <div className="cake-photo-lightbox-card" onClick={(e) => e.stopPropagation()}>
              <div className="lightbox-top-bar">
                <span>🎂 Cake / Product Preview</span>
                <button
                  type="button"
                  className="close-lightbox-btn"
                  onClick={() => setZoomedImage(null)}
                  title="Close Zoom"
                >
                  ✕
                </button>
              </div>
              <div className="lightbox-img-container">
                <img
                  src={zoomedImage}
                  alt="High-resolution Product View"
                  className="lightbox-full-img"
                  onError={(e) => {
                    if (!zoomedImage.startsWith("http")) {
                      e.target.src = `http://localhost:8000${zoomedImage}`;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Denial Reason & Clarification Dialog Modal */}
        {denyingOrderId && (
          <div className="denial-modal-overlay" onClick={() => setDenyingOrderId(null)}>
            <div className="denial-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="denial-modal-header">
                <h4>❌ Deny Custom Cake Order #{denyingOrderId}</h4>
                <button
                  type="button"
                  className="close-denial-btn"
                  onClick={() => setDenyingOrderId(null)}
                  title="Close Dialog"
                >
                  ✕
                </button>
              </div>

              <div className="denial-modal-body">
                <p className="denial-instruction">
                  Please select or provide a clarification reason. This clarification will immediately be displayed on the customer's chat screen and status banner:
                </p>

                <div className="preset-reasons-list">
                  {PRESET_DENIAL_REASONS.map((preset, pIdx) => (
                    <label key={pIdx} className="preset-reason-item">
                      <input
                        type="radio"
                        name="denialReasonPreset"
                        value={preset}
                        checked={denialPreset === preset}
                        onChange={() => setDenialPreset(preset)}
                      />
                      <span className="preset-text">{preset}</span>
                    </label>
                  ))}
                </div>

                {denialPreset === "Other specific reason..." && (
                  <div className="custom-reason-input-wrap">
                    <label>Specify Custom Clarification:</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. We cannot accommodate custom fondant sculpting on this requested date..."
                      value={customDenialReason}
                      onChange={(e) => setCustomDenialReason(e.target.value)}
                      className="custom-reason-textarea"
                    />
                  </div>
                )}
              </div>

              <div className="denial-modal-actions">
                <button
                  type="button"
                  className="btn-cancel-denial"
                  onClick={() => setDenyingOrderId(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-confirm-denial"
                  onClick={handleConfirmDenial}
                  disabled={denialPreset === "Other specific reason..." && !customDenialReason.trim()}
                >
                  Confirm Denial & Send Clarification
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminCakeChatModal;
