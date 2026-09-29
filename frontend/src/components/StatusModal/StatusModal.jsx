/**
 * ============================================================================
 * BAKE HOUSE - Status Modal Component (Error / Success / Warning Alert Dialog)
 * ============================================================================
 * Reusable modal popup to replace flat inline alerts with high-contrast,
 * unmistakable feedback dialogs that guide the user immediately.
 * ============================================================================
 */

import React, { useEffect } from "react";
import "./StatusModal.css";

function StatusModal({
  isOpen,
  type = "error", // 'error' | 'success' | 'warning' | 'info'
  title,
  message,
  primaryText = "Got It",
  secondaryText = null,
  onPrimary,
  onSecondary,
  onClose,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrimaryClick = () => {
    if (onPrimary) {
      onPrimary();
    } else if (onClose) {
      onClose();
    }
  };

  const handleSecondaryClick = () => {
    if (onSecondary) {
      onSecondary();
    } else if (onClose) {
      onClose();
    }
  };

  // Icon and default headers based on type
  const renderIcon = () => {
    switch (type) {
      case "success":
        return (
          <div className="status-modal-icon icon-success" aria-label="Success">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        );
      case "warning":
        return (
          <div className="status-modal-icon icon-warning" aria-label="Warning">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        );
      case "info":
        return (
          <div className="status-modal-icon icon-info" aria-label="Information">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
        );
      case "error":
      default:
        return (
          <div className="status-modal-icon icon-error" aria-label="Error">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        );
    }
  };

  const defaultTitles = {
    error: "Incomplete Information",
    success: "Success!",
    warning: "Notice",
    info: "Information",
  };

  return (
    <div
      className="status-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`status-modal-card type-${type}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button in corner */}
        {onClose && (
          <button
            type="button"
            className="status-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        )}

        {/* Visual Icon Badge */}
        {renderIcon()}

        {/* Modal Title */}
        <h3 className="status-modal-title">
          {title || defaultTitles[type] || "Notice"}
        </h3>

        {/* Modal Description Message */}
        <p className="status-modal-message">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="status-modal-actions">
          {secondaryText && (
            <button
              type="button"
              className="status-btn-secondary"
              onClick={handleSecondaryClick}
            >
              {secondaryText}
            </button>
          )}

          <button
            type="button"
            className={`status-btn-primary btn-${type}`}
            onClick={handlePrimaryClick}
            autoFocus
          >
            {primaryText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default StatusModal;
