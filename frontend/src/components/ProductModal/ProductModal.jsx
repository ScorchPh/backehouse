/**
 * ============================================================================
 * BAKE HOUSE - Product Details Modal Component
 * ============================================================================
 * Capstone Project Explanation:
 * Displays single product modal with live stock availability, in-cart quantity
 * awareness, quantity selector limits, and Add-to-Cart controls.
 * 
 * Features:
 * 1. Checks catalog stock and currently carted quantity.
 * 2. Bounds quantity selector to remaining inventory.
 * 3. Shows an interactive confirmation modal view with item details and
 *    quick navigation to Checkout or Continue Shopping.
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import "./ProductModal.css";
import { resolveProductImage, getProductFallbackImage } from "../../utils/productImages";

function ProductModal({ product, onClose }) {
  const navigate = useNavigate();
  const { cartItems, addToCart } = useCart();

  // Find if this item is already in the cart (non-customized catalog item)
  const inCartItem = product
    ? cartItems.find((item) => item.id === product.id && !item.customization)
    : null;
  const inCartQuantity = inCartItem ? inCartItem.quantity : 0;

  const totalStock = product && product.stock !== undefined ? Number(product.stock) : 50;
  const remainingStock = Math.max(0, totalStock - inCartQuantity);
  const isOutOfStock = totalStock <= 0 || (product && product.status === "Out of Stock");
  const isMaxInCart = !isOutOfStock && remainingStock <= 0;

  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [addedQuantity, setAddedQuantity] = useState(1);

  // Initialize and bound quantity whenever modal opens or cart changes
  useEffect(() => {
    if (isOutOfStock || isMaxInCart) {
      setQuantity(0);
    } else {
      setQuantity(1);
    }
  }, [product, remainingStock, isOutOfStock, isMaxInCart]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const handleAddToCart = () => {
    if (isOutOfStock || isMaxInCart || quantity <= 0) return;
    addToCart(product, quantity);
    setAddedQuantity(quantity);
    setIsAdded(true);
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  const totalCartAmount = cartItems.reduce(
    (acc, item) => acc + (parseFloat(item.price || 0) * (item.quantity || 1)),
    0
  );

  // ============================================================================
  // Confirmation Modal View (After clicking Add to Cart)
  // ============================================================================
  if (isAdded) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content confirmation-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="close-btn"
            onClick={onClose}
            title="Close modal"
          >
            ✕
          </button>

          <div className="confirm-success-icon-wrap">
            <div className="confirm-icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>

          <h2 className="confirm-title">Added to Cart!</h2>
          <p className="confirm-subtitle">
            Your freshly baked selection has been successfully added to your shopping order.
          </p>

          <div className="confirm-product-card">
            <img
              src={resolveProductImage(product)}
              alt={product.name}
              className="confirm-product-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getProductFallbackImage(product);
              }}
            />
            <div className="confirm-product-info">
              <span className="confirm-product-cat">{product.category || "Artisanal Bakery"}</span>
              <h3 className="confirm-product-name">{product.name}</h3>
              <div className="confirm-qty-price-row">
                <span className="confirm-qty-badge">{addedQuantity}×</span>
                <span className="confirm-unit-price">₱{parseFloat(product.price).toLocaleString()}</span>
                <strong className="confirm-line-total">
                  ₱{(parseFloat(product.price) * addedQuantity).toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          <div className="confirm-cart-status">
            <span>🛒 Cart Summary ({totalCartCount} item{totalCartCount !== 1 ? "s" : ""})</span>
            <strong>₱{totalCartAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
          </div>

          <div className="confirm-actions-row">
            <button
              type="button"
              className="confirm-btn-continue"
              onClick={onClose}
            >
              Continue Shopping
            </button>
            <button
              type="button"
              className="confirm-btn-cart"
              onClick={() => {
                onClose();
                navigate("/cart");
              }}
            >
              View Cart &amp; Checkout →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Standard Product Inspection Modal View
  // ============================================================================
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-btn"
          onClick={onClose}
          title="Close modal"
        >
          ✕
        </button>

        <img
          src={resolveProductImage(product)}
          alt={product.name}
          className="modal-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = getProductFallbackImage(product);
          }}
        />

        <h2>{product.name}</h2>
        <p>{product.description}</p>

        <div className="modal-details">
          <span>
            <strong>Category:</strong> {product.category}
          </span>

          <span>
            <strong>Price:</strong> ₱{parseFloat(product.price).toLocaleString()}
          </span>

          <span>
            <strong>Availability:</strong>{" "}
            <span
              style={{
                color: isOutOfStock
                  ? "#DC2626"
                  : isMaxInCart
                  ? "#D97706"
                  : "#059669",
                fontWeight: "700",
              }}
            >
              {isOutOfStock
                ? "Out of Stock"
                : isMaxInCart
                ? `Max in cart (${totalStock} available)`
                : inCartQuantity > 0
                ? `${remainingStock} more available (${inCartQuantity} in cart)`
                : `${totalStock} available`}
            </span>
          </span>
        </div>

        {/* Notice when maximum available items are already inside cart */}
        {isMaxInCart && (
          <div
            style={{
              background: "#FEF3C7",
              color: "#92400E",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "0.9rem",
              fontWeight: "600",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            ⚠️ You already have the maximum available stock ({inCartQuantity}) in your cart.
          </div>
        )}

        {/* Quantity Controls for available items */}
        {!isOutOfStock && !isMaxInCart && (
          <div className="quantity-section">
            <h3>Quantity</h3>

            <div className="quantity-controls">
              <button
                onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                disabled={quantity <= 1}
                title="Decrease quantity"
              >
                −
              </button>

              <span>{quantity}</span>

              <button
                onClick={() => quantity < remainingStock && setQuantity(quantity + 1)}
                disabled={quantity >= remainingStock}
                title={
                  quantity >= remainingStock
                    ? "Maximum available stock reached"
                    : "Increase quantity"
                }
              >
                +
              </button>
            </div>
            {remainingStock === 1 && (
              <p style={{ color: "#D97706", fontSize: "0.82rem", margin: "6px 0 0", fontWeight: "600" }}>
                Only 1 left in stock!
              </p>
            )}
          </div>
        )}

        <div className="total-price">
          Total: ₱{(parseFloat(product.price) * (quantity || 1)).toLocaleString()}
        </div>

        <button
          className={`add-cart-btn ${isOutOfStock || isMaxInCart ? "disabled-btn" : ""}`}
          onClick={handleAddToCart}
          disabled={isOutOfStock || isMaxInCart}
        >
          {isOutOfStock
            ? "Sold Out"
            : isMaxInCart
            ? `Limit Reached (${inCartQuantity} in Cart)`
            : `Add ${quantity} to Cart`}
        </button>
      </div>
    </div>
  );
}

export default ProductModal;