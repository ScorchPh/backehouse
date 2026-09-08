/**
 * ============================================================================
 * BAKE HOUSE - My Orders Page Component
 * ============================================================================
 * Capstone Project Explanation:
 * Allows customers to track and monitor all their placed bakery orders in real time.
 * Synchronizes with /api/orders/get_orders.php and provides fallback to OrderContext.
 * ============================================================================
 */

import { useState, useEffect } from "react";
import "./MyOrders.css";
import { Link } from "react-router-dom";
import { orderService } from "../../services/orderService";
import { authService } from "../../services/authService";
import { useOrders } from "../../context/OrderContext";

function MyOrders() {
  const [currentUser] = useState(() => authService.getCurrentUser());
  const { orders: contextOrders } = useOrders();
  const [ordersList, setOrdersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCustomerOrders() {
      try {
        setLoading(true);
        const params = {};
        if (currentUser && currentUser.id) {
          params.userId = currentUser.id;
        }

        const res = await orderService.getOrders(params);

        if (isMounted) {
          if (res && res.orders && res.orders.length > 0) {
            setOrdersList(res.orders);
          } else if (contextOrders && contextOrders.length > 0) {
            // Fallback to local session orders if API has no orders for this session
            setOrdersList(contextOrders);
          } else {
            setOrdersList([]);
          }
        }
      } catch (err) {
        console.warn("Could not fetch orders from API, using local context:", err);
        if (isMounted) {
          setOrdersList(contextOrders || []);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCustomerOrders();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, contextOrders]);

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1>My Orders</h1>
        <p>View and track all your bakery orders in real time.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#6B5747" }}>
          <div style={{ fontSize: "28px", marginBottom: "12px" }}>⏳</div>
          <h3 style={{ margin: 0, fontWeight: "600" }}>Loading your orders...</h3>
        </div>
      ) : ordersList.length === 0 ? (
        <div className="empty-orders">
          <h2>No orders yet.</h2>
          <p>You haven't placed any bakery orders yet. Explore our delicious menu today!</p>
          <Link to="/menu" className="details-btn">
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {ordersList.map((order) => {
            const statusKey = (order.status || 'pending').toLowerCase().replace(/\s+/g, '-');
            const formattedTotal = parseFloat(order.total || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });

            const isPickup = (order.fulfillment_type && order.fulfillment_type.toLowerCase() === 'pickup') ||
                             (order.delivery_address && order.delivery_address.toLowerCase().includes('pickup'));

            return (
              <div className="order-card" key={order.id}>
                <div className="order-info">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <h2>#{order.id}</h2>
                    <span style={{
                      background: isPickup ? "#FEF3C7" : "#EFF6FF",
                      color: isPickup ? "#B45309" : "#1D4ED8",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "800"
                    }}>
                      {isPickup ? "🏪 PICKUP" : "🚚 DELIVERY"}
                    </span>
                  </div>
                  <p className="order-date">
                    📅 {order.formatted_date || order.created_at || order.date || 'Recent Order'}
                  </p>
                  <p className="order-items-count">
                    🍰 {order.items ? `${order.items.length} item(s)` : (order.items_summary || '1 Item')}
                  </p>
                </div>

                <div className="order-status">
                  <span className={`status ${statusKey}`}>
                    {order.status || 'Pending'}
                  </span>
                </div>

                <div className="order-total">
                  <h3>₱{formattedTotal}</h3>
                </div>

                <div className="order-action">
                  <Link
                    to="/order-details"
                    state={{ order }}
                    className="details-btn"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyOrders;