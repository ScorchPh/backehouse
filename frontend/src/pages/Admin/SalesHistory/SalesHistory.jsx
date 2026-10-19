import { useState, useEffect, useMemo, useRef } from "react";
import { orderService } from "../../../services/orderService";
import { printerService } from "../../../services/printerService";
import "./SalesHistory.css";

export default function SalesHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [printingOrderId, setPrintingOrderId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await orderService.getOrders();
      if (res && res.orders) {
        setOrders(res.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Failed to fetch sales history:", err);
      showToast("⚠️ Could not load sales records from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
    const handleUpdate = () => fetchSales();
    window.addEventListener("ordersUpdated", handleUpdate);
    return () => window.removeEventListener("ordersUpdated", handleUpdate);
  }, []);

  // Format Helper
  const formatCurrency = (amount) => {
    return "₱" + parseFloat(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString.replace(/-/g, "/"));
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Filtered orders logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search filter (ID, Customer name, phone, item names)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesId = String(order.id || "").toLowerCase().includes(query);
        const matchesName = String(order.customer_name || "").toLowerCase().includes(query);
        const matchesPhone = String(order.customer_contact || "").toLowerCase().includes(query);
        const matchesItems = (order.items || []).some((item) =>
          String(item.product_name || item.name || "").toLowerCase().includes(query)
        );
        if (!matchesId && !matchesName && !matchesPhone && !matchesItems) return false;
      }

      // 2. Status filter
      if (statusFilter !== "all") {
        const s = String(order.status || "").toLowerCase().trim();
        if (statusFilter === "completed" && s !== "completed") return false;
        if (statusFilter === "pending" && s !== "pending") return false;
        if (statusFilter === "preparation" && !s.includes("prep") && !s.includes("confirm")) return false;
        if (statusFilter === "delivery" && !s.includes("delivery") && !s.includes("ready")) return false;
        if (statusFilter === "cancelled" && s !== "denied" && s !== "cancelled") return false;
      }

      // 3. Channel filter
      if (channelFilter !== "all") {
        const fulfillment = String(order.fulfillment_type || "").toLowerCase();
        if (channelFilter === "pos" && !fulfillment.includes("pickup") && !fulfillment.includes("pos") && !fulfillment.includes("counter")) {
          return false;
        }
        if (channelFilter === "delivery" && !fulfillment.includes("delivery")) {
          return false;
        }
      }

      // 4. Payment filter
      if (paymentFilter !== "all") {
        const pMethod = String(order.payment_method || "").toLowerCase();
        if (paymentFilter === "cash" && !pMethod.includes("cash") && !pMethod.includes("cod")) return false;
        if (paymentFilter === "gcash" && !pMethod.includes("gcash")) return false;
        if (paymentFilter === "card" && !pMethod.includes("card") && !pMethod.includes("stripe")) return false;
      }

      // 5. Date filter
      if (dateFilter !== "all" && order.created_at) {
        const orderDate = new Date(order.created_at.replace(/-/g, "/"));
        const now = new Date();

        if (dateFilter === "today") {
          if (
            orderDate.getFullYear() !== now.getFullYear() ||
            orderDate.getMonth() !== now.getMonth() ||
            orderDate.getDate() !== now.getDate()
          ) {
            return false;
          }
        } else if (dateFilter === "yesterday") {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          if (
            orderDate.getFullYear() !== yesterday.getFullYear() ||
            orderDate.getMonth() !== yesterday.getMonth() ||
            orderDate.getDate() !== yesterday.getDate()
          ) {
            return false;
          }
        } else if (dateFilter === "week") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (orderDate < sevenDaysAgo) return false;
        } else if (dateFilter === "month") {
          if (
            orderDate.getFullYear() !== now.getFullYear() ||
            orderDate.getMonth() !== now.getMonth()
          ) {
            return false;
          }
        } else if (dateFilter === "custom") {
          if (customStartDate) {
            const start = new Date(customStartDate + "T00:00:00");
            if (orderDate < start) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate + "T23:59:59");
            if (orderDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [orders, searchTerm, statusFilter, channelFilter, paymentFilter, dateFilter, customStartDate, customEndDate]);

  // Aggregate stats
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let completedCount = 0;
    let totalUnitsSold = 0;

    filteredOrders.forEach((o) => {
      const isCompleted = String(o.status || "").toLowerCase() === "completed";
      const orderTotal = parseFloat(o.total || 0);

      // We include all non-cancelled orders in revenue or completed specifically
      if (String(o.status || "").toLowerCase() !== "denied" && String(o.status || "").toLowerCase() !== "cancelled") {
        totalRevenue += orderTotal;
      }
      if (isCompleted) {
        completedCount++;
      }

      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          totalUnitsSold += parseInt(it.quantity || 1, 10);
        });
      }
    });

    const averageOrder = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

    return {
      totalRevenue,
      totalOrders: filteredOrders.length,
      completedCount,
      totalUnitsSold,
      averageOrder,
    };
  }, [filteredOrders]);

  // Handle Receipt Reprinting
  const handlePrintReceipt = async (order, paperSize = null) => {
    try {
      setPrintingOrderId(order.id);

      // Normalize order items for printer service
      const normalizedItems = (order.items || []).map((it) => ({
        id: it.product_id || it.id,
        name: it.product_name || it.name || "Bakery Item",
        product_name: it.product_name || it.name || "Bakery Item",
        price: parseFloat(it.price || 0),
        quantity: parseInt(it.quantity || 1, 10),
        customization: it.customization || null,
      }));

      const printableOrder = {
        ...order,
        id: order.id,
        customer_name: order.customer_name || "Walk-in Guest",
        customer_contact: order.customer_contact || "",
        delivery_address: order.delivery_address || "",
        payment_method: order.payment_method || "Cash",
        subtotal: parseFloat(order.subtotal || order.total || 0),
        delivery_fee: parseFloat(order.delivery_fee || 0),
        total: parseFloat(order.total || 0),
        items: normalizedItems,
        created_at: order.created_at || new Date().toISOString(),
        cashier: "BAKE HOUSE Register",
      };

      const result = await printerService.printReceipt(printableOrder, paperSize);
      if (result && result.success) {
        showToast(`🖨️ Receipt for ${order.id} sent to printer successfully!`);
      } else {
        showToast(`🖨️ Receipt sent using standard print preview.`);
      }
    } catch (err) {
      console.error("Print error:", err);
      showToast("⚠️ Could not open printer dialog. Please verify printer connection.");
    } finally {
      setPrintingOrderId(null);
    }
  };

  // Helper badge class
  const getStatusBadgeClass = (status) => {
    const s = String(status || "").toLowerCase().trim();
    if (s === "completed") return "badge-completed";
    if (s === "pending") return "badge-pending";
    if (s.includes("prep") || s.includes("confirm")) return "badge-preparing";
    if (s.includes("delivery") || s.includes("ready")) return "badge-delivery";
    if (s === "denied" || s === "cancelled") return "badge-cancelled";
    return "badge-default";
  };

  return (
    <div className="sales-history-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="sales-toast" role="alert">
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <div className="sales-history-header">
        <div className="header-text">
          <div className="header-badge">
            <span>🧾 POS &amp; STORE ARCHIVE</span>
          </div>
          <h1>Sales History &amp; Receipts</h1>
          <p>
            Complete historical audit ledger of all counter POS transactions and online orders. Inspect individual line items, customer details, and reprint receipts instantly.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="action-btn btn-secondary"
            onClick={fetchSales}
            disabled={loading}
            title="Refresh latest sales records"
          >
            <span className={loading ? "spin-icon" : ""}>🔄</span> Refresh
          </button>
          <button
            type="button"
            className="action-btn btn-primary"
            onClick={() => window.print()}
            title="Print entire sales report summary"
          >
            🖨️ Print Summary
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="sales-metrics-grid">
        <div className="metric-card gold">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <span className="metric-label">Total Gross Sales</span>
            <strong className="metric-value">{formatCurrency(metrics.totalRevenue)}</strong>
            <span className="metric-sub">{metrics.totalOrders} total recorded orders</span>
          </div>
        </div>

        <div className="metric-card green">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <span className="metric-label">Completed Sales</span>
            <strong className="metric-value">{metrics.completedCount}</strong>
            <span className="metric-sub">
              {metrics.totalOrders > 0
                ? `${((metrics.completedCount / metrics.totalOrders) * 100).toFixed(1)}% fulfillment rate`
                : "0% fulfillment"}
            </span>
          </div>
        </div>

        <div className="metric-card blue">
          <div className="metric-icon">🥖</div>
          <div className="metric-content">
            <span className="metric-label">Items Sold</span>
            <strong className="metric-value">{metrics.totalUnitsSold.toLocaleString()}</strong>
            <span className="metric-sub">Total bakery units purchased</span>
          </div>
        </div>

        <div className="metric-card brown">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <span className="metric-label">Average Order Value</span>
            <strong className="metric-value">{formatCurrency(metrics.averageOrder)}</strong>
            <span className="metric-sub">Average ticket size</span>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="sales-filter-card">
        <div className="filter-row top-filter-row">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by Order ID, customer, phone, product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchTerm("")}
              >
                ✕
              </button>
            )}
          </div>

          <div className="date-pill-group">
            <button
              type="button"
              className={`date-pill ${dateFilter === "all" ? "active" : ""}`}
              onClick={() => setDateFilter("all")}
            >
              All Time
            </button>
            <button
              type="button"
              className={`date-pill ${dateFilter === "today" ? "active" : ""}`}
              onClick={() => setDateFilter("today")}
            >
              Today
            </button>
            <button
              type="button"
              className={`date-pill ${dateFilter === "yesterday" ? "active" : ""}`}
              onClick={() => setDateFilter("yesterday")}
            >
              Yesterday
            </button>
            <button
              type="button"
              className={`date-pill ${dateFilter === "week" ? "active" : ""}`}
              onClick={() => setDateFilter("week")}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              className={`date-pill ${dateFilter === "month" ? "active" : ""}`}
              onClick={() => setDateFilter("month")}
            >
              This Month
            </button>
            <button
              type="button"
              className={`date-pill ${dateFilter === "custom" ? "active" : ""}`}
              onClick={() => setDateFilter("custom")}
            >
              Custom Date
            </button>
          </div>
        </div>

        {dateFilter === "custom" && (
          <div className="custom-date-row">
            <div className="date-input-group">
              <label>From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div className="date-input-group">
              <label>To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="filter-row dropdown-filter-row">
          <div className="filter-select-item">
            <label>Fulfillment Channel:</label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option value="all">All Channels</option>
              <option value="pos">🏪 In-store POS / Walk-in Pickup</option>
              <option value="delivery">🚚 Online Delivery</option>
            </select>
          </div>

          <div className="filter-select-item">
            <label>Order Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="preparation">In Preparation</option>
              <option value="delivery">For Delivery / Ready</option>
              <option value="cancelled">Cancelled / Denied</option>
            </select>
          </div>

          <div className="filter-select-item">
            <label>Payment Method:</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">💵 Cash / COD</option>
              <option value="gcash">📱 GCash</option>
              <option value="card">💳 Credit / Debit Card</option>
            </select>
          </div>

          <div className="results-counter">
            Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> sales transactions
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="sales-table-container">
        {loading ? (
          <div className="sales-loading-state">
            <div className="loading-spinner"></div>
            <p>Loading sales history and transactions archive...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="sales-empty-state">
            <div className="empty-icon">📂</div>
            <h3>No Sales Records Found</h3>
            <p>No transactions match your current search terms and filter criteria.</p>
            <button
              type="button"
              className="reset-filters-btn"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setChannelFilter("all");
                setPaymentFilter("all");
                setDateFilter("all");
                setCustomStartDate("");
                setCustomEndDate("");
              }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date &amp; Time</th>
                  <th>Customer</th>
                  <th>Products Sold</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const items = Array.isArray(order.items) ? order.items : [];
                  const totalItemsCount = items.reduce((sum, it) => sum + parseInt(it.quantity || 1, 10), 0);
                  const isPickup = String(order.fulfillment_type || "").toLowerCase().includes("pickup");

                  return (
                    <tr key={order.id} className="sales-row">
                      {/* 1. Order ID & Channel */}
                      <td className="cell-order-id">
                        <div className="order-id-group">
                          <strong className="id-text">{order.id}</strong>
                          <span className={`channel-pill ${isPickup ? "pickup" : "delivery"}`}>
                            {isPickup ? "🏪 In-Store POS" : "🚚 Delivery"}
                          </span>
                        </div>
                      </td>

                      {/* 2. Date & Time */}
                      <td className="cell-date">
                        <div className="date-group">
                          <span className="date-main">{formatDateTime(order.created_at)}</span>
                          <span className="date-raw">{order.formatted_date || ""}</span>
                        </div>
                      </td>

                      {/* 3. Customer */}
                      <td className="cell-customer">
                        <div className="customer-group">
                          <span className="customer-name">
                            {order.customer_name || "Walk-in Guest"}
                          </span>
                          {order.customer_contact ? (
                            <span className="customer-contact">📞 {order.customer_contact}</span>
                          ) : (
                            <span className="customer-contact faint">Counter Order</span>
                          )}
                        </div>
                      </td>

                      {/* 4. Products */}
                      <td className="cell-products">
                        <div className="products-summary-box">
                          {items.length === 0 ? (
                            <span className="no-items-text">General Bakery Item</span>
                          ) : (
                            <ul className="items-mini-list">
                              {items.slice(0, 2).map((item, idx) => (
                                <li key={idx} className="item-mini-row">
                                  <span className="qty-tag">{item.quantity}×</span>
                                  <span className="item-name" title={item.product_name || item.name}>
                                    {item.product_name || item.name}
                                  </span>
                                  {item.customization && (
                                    <span className="custom-indicator" title="Custom Cake Specification">🎂</span>
                                  )}
                                </li>
                              ))}
                              {items.length > 2 && (
                                <li className="items-more-tag">
                                  +{items.length - 2} more item{items.length - 2 > 1 ? "s" : ""} ({totalItemsCount} total)
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      </td>

                      {/* 5. Payment Method */}
                      <td className="cell-payment">
                        <span className="payment-method-tag">
                          {order.payment_method || "Cash"}
                        </span>
                      </td>

                      {/* 6. Status */}
                      <td className="cell-status">
                        <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                          {order.status || "Pending"}
                        </span>
                      </td>

                      {/* 7. Total Amount */}
                      <td className="cell-amount">
                        <div className="amount-group">
                          <strong className="total-amount">{formatCurrency(order.total)}</strong>
                          {parseFloat(order.delivery_fee || 0) > 0 && (
                            <small className="fee-sub">incl. fee {formatCurrency(order.delivery_fee)}</small>
                          )}
                        </div>
                      </td>

                      {/* 8. Actions */}
                      <td className="cell-actions" style={{ textAlign: "right" }}>
                        <div className="table-action-buttons">
                          <button
                            type="button"
                            className="btn-print-receipt"
                            onClick={() => handlePrintReceipt(order)}
                            disabled={printingOrderId === order.id}
                            title="Print / Reprint receipt directly"
                          >
                            <span className={printingOrderId === order.id ? "spin-icon" : ""}>🖨️</span>
                            <span>{printingOrderId === order.id ? "Printing..." : "Print Receipt"}</span>
                          </button>

                          <button
                            type="button"
                            className="btn-view-details"
                            onClick={() => setSelectedOrder(order)}
                            title="Inspect full details & receipt preview"
                          >
                            👁️ View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL & RECEIPT MODAL */}
      {selectedOrder && (
        <div className="sales-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="sales-modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sales-modal-header">
              <div className="modal-title-area">
                <span className="modal-subtitle">Official Transaction Receipt</span>
                <h2>Order #{selectedOrder.id}</h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Thermal Receipt Style */}
            <div className="sales-modal-body">
              <div className="receipt-paper-card">
                {/* Serrated edge styling in CSS */}
                <div className="receipt-brand-header">
                  <h3>BAKE HOUSE</h3>
                  <p>Artisan Bakery &amp; Boutique</p>
                  <p>Poblacion, Cordova, Cebu, Philippines</p>
                  <p>Tel: +63 (032) 496-8888 | TIN: 000-847-293-000</p>
                  <div className="receipt-divider dashed"></div>
                  <div className="receipt-meta-grid">
                    <div>
                      <strong>Date:</strong> {formatDateTime(selectedOrder.created_at)}
                    </div>
                    <div>
                      <strong>Channel:</strong> {selectedOrder.fulfillment_type || "Store POS"}
                    </div>
                    <div>
                      <strong>Customer:</strong> {selectedOrder.customer_name || "Walk-in Guest"}
                    </div>
                    <div>
                      <strong>Contact:</strong> {selectedOrder.customer_contact || "N/A"}
                    </div>
                    {selectedOrder.delivery_address && (
                      <div className="full-width-meta">
                        <strong>Address:</strong> {selectedOrder.delivery_address}
                      </div>
                    )}
                  </div>
                  <div className="receipt-divider dashed"></div>
                </div>

                {/* Items Table in Receipt */}
                <table className="receipt-items-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Item &amp; Details</th>
                      <th style={{ textAlign: "center" }}>Qty</th>
                      <th style={{ textAlign: "right" }}>Price</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((it, idx) => {
                      const qty = parseInt(it.quantity || 1, 10);
                      const unitPrice = parseFloat(it.price || 0);
                      const lineTotal = qty * unitPrice;

                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: "left" }}>
                            <strong>{it.product_name || it.name}</strong>
                            {it.customization && (
                              <div className="receipt-custom-spec">
                                {it.customization.size && <span>Size: {it.customization.size} | </span>}
                                {it.customization.flavor && <span>Flavor: {it.customization.flavor} | </span>}
                                {it.customization.color && <span>Frosting: {it.customization.color}</span>}
                                {it.customization.message && (
                                  <div className="receipt-custom-msg">
                                    <em>"{it.customization.message}"</em>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>{qty}</td>
                          <td style={{ textAlign: "right" }}>{formatCurrency(unitPrice)}</td>
                          <td style={{ textAlign: "right" }}>{formatCurrency(lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="receipt-divider dashed"></div>

                {/* Totals Breakdown */}
                <div className="receipt-totals-list">
                  <div className="receipt-total-line">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedOrder.subtotal || selectedOrder.total)}</span>
                  </div>
                  {parseFloat(selectedOrder.delivery_fee || 0) > 0 && (
                    <div className="receipt-total-line">
                      <span>Delivery / Fulfillment Fee:</span>
                      <span>{formatCurrency(selectedOrder.delivery_fee)}</span>
                    </div>
                  )}
                  <div className="receipt-total-line">
                    <span>12% VAT (Included):</span>
                    <span>
                      {formatCurrency(
                        (parseFloat(selectedOrder.total || 0) * 0.12) / 1.12
                      )}
                    </span>
                  </div>
                  <div className="receipt-divider double"></div>
                  <div className="receipt-total-line grand-total">
                    <span>TOTAL AMOUNT DUE:</span>
                    <span>{formatCurrency(selectedOrder.total)}</span>
                  </div>
                  <div className="receipt-divider double"></div>
                  <div className="receipt-total-line">
                    <span>Payment Method:</span>
                    <strong>{selectedOrder.payment_method || "Cash"}</strong>
                  </div>
                  <div className="receipt-total-line">
                    <span>Fulfillment Status:</span>
                    <strong className={`status-text ${getStatusBadgeClass(selectedOrder.status)}`}>
                      {selectedOrder.status || "Completed"}
                    </strong>
                  </div>
                </div>

                <div className="receipt-footer-notes">
                  <p>Maraming Salamat po sa inyong pagtangkilik!</p>
                  <p>Thank you for choosing BAKE HOUSE!</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="sales-modal-footer">
              <div className="print-options-group">
                <button
                  type="button"
                  className="modal-print-btn btn-pos-58"
                  onClick={() => handlePrintReceipt(selectedOrder, "58mm")}
                  disabled={printingOrderId === selectedOrder.id}
                >
                  🖨️ Print 58mm Thermal Receipt
                </button>
                <button
                  type="button"
                  className="modal-print-btn btn-pos-80"
                  onClick={() => handlePrintReceipt(selectedOrder, "80mm")}
                  disabled={printingOrderId === selectedOrder.id}
                >
                  📄 Print 80mm / Invoice
                </button>
              </div>

              <button
                type="button"
                className="modal-close-action"
                onClick={() => setSelectedOrder(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
