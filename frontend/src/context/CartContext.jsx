/**
 * ============================================================================
 * BAKE HOUSE - Shopping Cart Context & Client Inventory Bounds
 * ============================================================================
 * Capstone Project Architecture & Flow:
 * 1. INVENTORY TIMING PRINCIPLE:
 *    - Adding an item to the shopping cart DOES NOT deduct stock from the database.
 *      Stock is deducted exclusively when an order is completed at checkout.
 * 2. CLIENT-SIDE STOCK LIMITS:
 *    - When browsing the menu, the frontend prevents a customer from putting
 *      more items in their cart than the product's actual catalog stock.
 *    - Example: If Cheesecake has 1 in stock:
 *      * User adds 1 to cart -> cart quantity = 1.
 *      * User opens modal again -> modal indicates (1 in cart - stock limit reached)
 *        and disables adding more.
 *      * Inside the Cart page -> the "+" increment button is disabled at quantity 1.
 * ============================================================================
 */

import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

const CART_STORAGE_KEY = "bakehouse_cart_items";

export function CartProvider({ children }) {
  // Initialize state from localStorage if available
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Automatically persist cart whenever cartItems changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  }, [cartItems]);

  /**
   * Helper: Get currently carted quantity for a specific catalog product ID
   */
  const getItemInCartQuantity = (productId) => {
    const item = cartItems.find((i) => i.id === productId && !i.customization);
    return item ? item.quantity : 0;
  };

  /**
   * Helper: Get remaining available quantity that can still be added to cart
   */
  const getItemRemainingStock = (product) => {
    if (!product) return 0;
    if (product.customization) return 999; // Custom cakes are made to order
    const totalStock = product.stock !== undefined ? Number(product.stock) : 999;
    const inCart = getItemInCartQuantity(product.id);
    return Math.max(0, totalStock - inCart);
  };

  /**
   * Add a product to the cart while respecting maximum inventory stock limits.
   * Note: This does NOT minus backend stock yet (deduction happens on checkout).
   */
  const addToCart = (product, quantity = 1) => {
    // Custom cake check (unique by custom ID)
    const isCustom = Boolean(product.customization);

    const existingIndex = cartItems.findIndex((item) => {
      if (isCustom && item.customization) {
        return item.id === product.id;
      }
      return item.id === product.id && !item.customization;
    });

    const maxStock = product.stock !== undefined ? Number(product.stock) : 999;

    if (existingIndex > -1) {
      const currentQty = cartItems[existingIndex].quantity;
      const availableToAdd = isCustom ? quantity : Math.max(0, maxStock - currentQty);

      if (availableToAdd <= 0) {
        return {
          success: false,
          reason: "max_reached",
          currentQty,
          maxStock,
        };
      }

      const qtyToAdd = Math.min(quantity, availableToAdd);
      const updated = [...cartItems];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...product, // keep price, image, and stock metadata synchronized
        quantity: currentQty + qtyToAdd,
      };

      setCartItems(updated);
      return {
        success: true,
        added: qtyToAdd,
        totalInCart: currentQty + qtyToAdd,
        maxStock,
      };
    } else {
      const availableToAdd = isCustom ? quantity : Math.max(0, maxStock);

      if (availableToAdd <= 0) {
        return {
          success: false,
          reason: "out_of_stock",
          currentQty: 0,
          maxStock,
        };
      }

      const initialQty = Math.min(quantity, availableToAdd);
      setCartItems([
        ...cartItems,
        {
          ...product,
          quantity: initialQty,
        },
      ]);

      return {
        success: true,
        added: initialQty,
        totalInCart: initialQty,
        maxStock,
      };
    }
  };

  /**
   * Remove item by ID from cart
   */
  const removeFromCart = (id) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  /**
   * Increase item quantity by 1 (bounded by available product stock)
   */
  const increaseQuantity = (id) => {
    setCartItems(
      cartItems.map((item) => {
        if (item.id === id) {
          const maxStock = item.stock !== undefined ? Number(item.stock) : 999;
          // Guard: Do not exceed available inventory
          if (!item.customization && item.quantity >= maxStock) {
            return item;
          }
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      })
    );
  };

  /**
   * Decrease item quantity (minimum 1)
   */
  const decreaseQuantity = (id) => {
    setCartItems(
      cartItems.map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity > 1 ? item.quantity - 1 : 1 }
          : item
      )
    );
  };

  /**
   * Empty the cart (called after successful checkout or manual clear)
   */
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        getItemInCartQuantity,
        getItemRemainingStock,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);