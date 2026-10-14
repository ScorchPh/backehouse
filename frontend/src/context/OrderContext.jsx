/**
 * ============================================================================
 * BAKE HOUSE - Order Context
 * ============================================================================
 * Capstone Project Explanation:
 * Manages order state across the application and communicates with the PHP API.
 * - Stores placed orders and fetches live order lists from backend.
 * - Supports real-time status updates for My Orders and Admin panel.
 * ============================================================================
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { orderService } from "../services/orderService";
import { authService } from "../services/authService";

const OrderContext = createContext();

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch orders for current active user or store
   */
  const refreshOrders = useCallback(async (isBackground = false) => {
    const user = authService.getCurrentUser();
    try {
      if (!isBackground && orders.length === 0) {
        setLoading(true);
      }
      const params = {};
      if (user && user.role === 'customer') {
        params.userId = user.id;
      }
      const data = await orderService.getOrders(params);
      if (data && data.orders) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.warn("Could not fetch orders from API, using cached state.", e);
    } finally {
      setLoading(false);
    }
  }, [orders.length]);

  // Fetch orders on initial load, auth changes, order updates, and periodic sync
  useEffect(() => {
    refreshOrders(orders.length > 0);

    const handleAuthChange = () => {
      refreshOrders(false);
    };

    const handleOrdersUpdate = () => {
      refreshOrders(true);
    };

    window.addEventListener("authChange", handleAuthChange);
    window.addEventListener("ordersUpdated", handleOrdersUpdate);

    // Auto-refresh periodically (every 45s) for live order updates smoothly in background
    const timer = setInterval(() => {
      refreshOrders(true);
    }, 45000);

    return () => {
      window.removeEventListener("authChange", handleAuthChange);
      window.removeEventListener("ordersUpdated", handleOrdersUpdate);
      clearInterval(timer);
    };
  }, [refreshOrders, orders.length]);

  /**
   * Add a locally placed order or update state after API submission
   */
  const addOrder = (order) => {
    setOrders((prev) => [order, ...prev]);
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        refreshOrders,
        addOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export const useOrders = () => useContext(OrderContext);