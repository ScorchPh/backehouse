/**
 * ============================================================================
 * BAKE HOUSE - Shopping Cart Page Component
 * ============================================================================
 * Capstone Project Explanation:
 * Displays all active items currently added to the cart, calculates live
 * subtotals and totals, and provides stock-bounded increment/decrement controls.
 * 
 * Key Architectural Rule:
 * 1. Items in cart represent temporary intent; backend inventory is NOT decremented here.
 * 2. Increments (+) are disabled if the quantity equals the product's catalog stock.
 * ============================================================================
 */

import "./Cart.css";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";

function Cart() {
  const {
    cartItems,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

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

          <p>
            Browse our freshly baked products and add your favorites.
          </p>

          <Link to="/menu" className="continue-btn">
            Browse Menu
          </Link>

        </div>

      ) : (

        <>
          <div className="cart-items">

            {cartItems.map((item) => (

              <div className="cart-card" key={item.id}>

                <img
                  src={item.image}
                  alt={item.name}
                />

                <div className="cart-info">

                  <h2>{item.name}</h2>

                  <p>{item.description}</p>

                  {/* Show customization only for personalized cakes */}

                  {item.customization && (

                    <div className="customization-info">

                      <p>
                        <strong>Size:</strong>{" "}
                        {item.customization.size}
                      </p>

                      <p>
                        <strong>Flavor:</strong>{" "}
                        {item.customization.flavor}
                      </p>

                      <p>
                        <strong>Shape:</strong>{" "}
                        {item.customization.shape}
                      </p>

                      <p>
                        <strong>Frosting:</strong>{" "}
                        {item.customization.color}
                      </p>

                      <p>
                        <strong>Occasion:</strong>{" "}
                        {item.customization.occasion}
                      </p>

                      {item.customization.message && (

                        <p>
                          <strong>Message:</strong>{" "}
                          {item.customization.message}
                        </p>

                      )}

                      {item.customization.instructions && (

                        <p>
                          <strong>Instructions:</strong>{" "}
                          {item.customization.instructions}
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

                    {/* Stock limit notice when user cart contains all available store stock */}
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
                    className="remove-btn"
                    onClick={() => removeFromCart(item.id)}
                  >
                    Remove
                  </button>

                </div>

              </div>

            ))}

          </div>

          <div className="cart-summary">

            <h2>Order Summary</h2>

            <p>Total Items: {totalItems}</p>

            <h3>Total: ₱{totalPrice}</h3>

            <Link
              to="/checkout"
              className="checkout-btn"
            >
              Proceed to Checkout
            </Link>

          </div>

        </>

      )}

    </div>
  );
}

export default Cart;