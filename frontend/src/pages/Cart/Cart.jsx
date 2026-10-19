import { useState, useEffect } from "react";
import "./Cart.css";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { authService } from "../../services/authService";
import { resolveProductImage, getProductFallbackImage } from "../../utils/productImages";

function Cart() {
  const navigate = useNavigate();
  const {
    cartItems,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

  const [itemToRemove, setItemToRemove] = useState(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setItemToRemove(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const totalPrice = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const totalItems = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return (
    <div className="cart-page">
      <h1>Shopping Cart</h1>

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <h2>Your cart is empty.</h2>
          <p>Browse our freshly baked products and add your favorites.</p>
          <Link to="/menu" className="continue-btn">
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cartItems.map((item) => (
              <div className="cart-card" key={item.id}>
                <img
                  src={resolveProductImage(item)}
                  alt={item.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getProductFallbackImage(item);
                  }}
                />

                <div className="cart-info">
                  <h2>{item.name}</h2>
                  <p>{item.description}</p>

                  {item.customization && (
                    <div className="customization-info">
                      <p>
                        <strong>Size:</strong> {item.customization.size}
                      </p>
                      <p>
                        <strong>Flavor:</strong> {item.customization.flavor}
                      </p>
                      <p>
                        <strong>Shape:</strong> {item.customization.shape}
                      </p>
                      <p>
                        <strong>Frosting:</strong> {item.customization.color}
                      </p>
                      <p>
                        <strong>Occasion:</strong> {item.customization.occasion}
                      </p>
                      {item.customization.message && (
                        <p>
                          <strong>Message:</strong> {item.customization.message}
                        </p>
                      )}
                      {item.customization.instructions && (
                        <p>
                          <strong>Instructions:</strong> {item.customization.instructions}
                        </p>
                      )}
                    </div>
                  )}

                  <h3>₱{item.price}</h3>

                  <div className="quantity-controls">
                    <button
                      onClick={() => decreaseQuantity(item.id)}
                      title="Decrease quantity"
                    >
                      −
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      onClick={() => increaseQuantity(item.id)}
                      disabled={!item.customization && item.stock !== undefined && item.quantity >= item.stock}
                      title={
                        !item.customization && item.stock !== undefined && item.quantity >= item.stock
                          ? `Maximum available stock (${item.stock}) reached`
                          : "Increase quantity"
                      }
                    >
                      +
                    </button>

                    {!item.customization && item.stock !== undefined && item.quantity >= item.stock && (
                      <span className="stock-limit-badge">
                        Max Stock ({item.stock} available)
                      </span>
                    )}
                  </div>

                  <p className="subtotal">
                    Subtotal: ₱{(item.price * item.quantity).toLocaleString()}
                  </p>

                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => setItemToRemove(item)}
                    title={`Remove ${item.name} from cart`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary-wrapper">
            <div className="cart-summary">
              <h2>Order Summary</h2>
              <p>Total Items: {totalItems}</p>
              <h3>Total: ₱{Number(totalPrice).toLocaleString()}</h3>
              {authService.getCurrentUser() ? (
                <Link
                  to="/checkout"
                  className="checkout-btn"
                >
                  Proceed to Checkout
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    className="checkout-btn"
                    onClick={() => navigate("/account?redirect=/checkout", {
                      state: { message: "Please sign in or create an account to proceed to checkout." }
                    })}
                  >
                    🔐 Sign In to Checkout
                  </button>
                  <p style={{ fontSize: "0.82rem", color: "#8C6A4F", textAlign: "center", marginTop: "10px", lineHeight: "1.4" }}>
                    An account is required to place and track bakery orders.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Removing Product */}
      {itemToRemove && (
        <div className="cart-modal-backdrop" onClick={() => setItemToRemove(null)}>
          <div className="cart-remove-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="cart-modal-close-btn"
              onClick={() => setItemToRemove(null)}
              title="Close modal"
            >
              ✕
            </button>

            <div className="cart-remove-icon-wrap">
              <div className="cart-remove-icon-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </div>
            </div>

            <h2 className="cart-modal-title">Remove from Cart?</h2>
            <p className="cart-modal-desc">
              Are you sure you want to remove <strong>"{itemToRemove.name}"</strong> from your shopping cart?
            </p>

            <div className="cart-remove-preview-box">
              <img
                src={resolveProductImage(itemToRemove)}
                alt={itemToRemove.name}
                className="remove-preview-img"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = getProductFallbackImage(itemToRemove);
                }}
              />
              <div className="remove-preview-details">
                <span className="remove-preview-cat">{itemToRemove.category || "Bakery Item"}</span>
                <h3 className="remove-preview-name">{itemToRemove.name}</h3>
                <div className="remove-preview-calc">
                  <span className="remove-qty-pill">{itemToRemove.quantity}×</span>
                  <span className="remove-unit-price">₱{parseFloat(itemToRemove.price).toLocaleString()}</span>
                  <strong className="remove-subtotal-price">
                    ₱{(parseFloat(itemToRemove.price) * itemToRemove.quantity).toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>

            <div className="cart-modal-actions">
              <button
                type="button"
                className="cart-btn-keep"
                onClick={() => setItemToRemove(null)}
              >
                Keep in Cart
              </button>
              <button
                type="button"
                className="cart-btn-confirm-remove"
                onClick={() => {
                  removeFromCart(itemToRemove.id);
                  setItemToRemove(null);
                }}
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;