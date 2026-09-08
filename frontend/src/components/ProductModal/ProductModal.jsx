/**
 * ============================================================================
 * BAKE HOUSE - Product Details Modal Component
 * ============================================================================
 * Capstone Project Explanation:
 * Displays single product modal with live stock availability, in-cart quantity
 * awareness, quantity selector limits, and Add-to-Cart controls.
 * 
 * Stock & Cart Logic:
 * 1. Checks both catalog total stock and current quantity in the user's cart.
 * 2. remainingStock = Math.max(0, totalStock - inCartQuantity).
 * 3. Prevents user from selecting or adding more than remaining available stock.
 * 4. Shows clear visual feedback if all available items are already in the cart.
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { useCart } from "../../context/CartContext";
import "./ProductModal.css";

function ProductModal({ product, onClose }) {
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

  // Initialize and bound quantity whenever modal opens or cart changes
  useEffect(() => {
    if (isOutOfStock || isMaxInCart) {
      setQuantity(0);
    } else {
      setQuantity(1);
    }
  }, [product, remainingStock, isOutOfStock, isMaxInCart]);

  if (!product) return null;

  const handleAddToCart = () => {
    if (isOutOfStock || isMaxInCart || quantity <= 0) return;
    addToCart(product, quantity);
    onClose();
  };

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
          src={product.image || "/uploads/productimg/chocolate_cake.jpg"}
          alt={product.name}
          className="modal-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500";
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