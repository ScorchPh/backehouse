import { useState, useEffect, useMemo, useRef } from "react";
import { orderService } from "../../../services/orderService";
import { printerService } from "../../../services/printerService";
import "./SalesHistory.css";

export default function SalesHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // 'all' | 'day' | 'month' | 'year' | 'custom'
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Modal & Toast states
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
        // Exclude Denied and Cancelled orders completely from Sales History
        const validSales = res.orders.filter((o) => {
          const s = String(o.status || "").toLowerCase().trim();
          return s !== "denied" && s !== "cancelled";
        });
        setOrders(validSales);
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

  // Compute available recorded years from orders
  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear()]);
    orders.forEach((o) => {
      if (o.created_at) {
        const d = new Date(o.created_at.replace(/-/g, "/"));
        if (!isNaN(d.getFullYear())) {
          years.add(d.getFullYear());
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  const formatCurrency = (amount) => {
    return "₱" + parseFloat(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return { date: "N/A", time: "" };
    const d = new Date(dateString.replace(/-/g, "/"));
    if (isNaN(d.getTime())) return { date: dateString, time: "" };

    const date = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return { date, time };
  };

  // Filtered orders logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search filter
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

      // Exclude Denied and Cancelled orders
      const s = String(order.status || "").toLowerCase().trim();
      if (s === "denied" || s === "cancelled") return false;

      // 2. Channel filter
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

      // 3. Date filter (All / Day / Month / Year / Custom)
      if (dateFilter !== "all" && order.created_at) {
        const orderDate = new Date(order.created_at.replace(/-/g, "/"));
        if (isNaN(orderDate.getTime())) return true;

        if (dateFilter === "day") {
          if (selectedDay) {
            const [y, m, d] = selectedDay.split("-").map(Number);
            if (
              orderDate.getFullYear() !== y ||
              orderDate.getMonth() + 1 !== m ||
              orderDate.getDate() !== d
            ) {
              return false;
            }
          }
        } else if (dateFilter === "month") {
          if (selectedMonth) {
            const [y, m] = selectedMonth.split("-").map(Number);
            if (
              orderDate.getFullYear() !== y ||
              orderDate.getMonth() + 1 !== m
            ) {
              return false;
            }
          }
        } else if (dateFilter === "year") {
          if (selectedYear) {
            const y = Number(selectedYear);
            if (orderDate.getFullYear() !== y) {
              return false;
            }
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
  }, [
    orders,
    searchTerm,
    channelFilter,
    paymentFilter,
    dateFilter,
    selectedDay,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate,
  ]);

  // Metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalUnitsSold = 0;

    filteredOrders.forEach((o) => {
      const orderTotal = parseFloat(o.total || 0);
      totalRevenue += orderTotal;

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
      totalUnitsSold,
      averageOrder,
    };
  }, [filteredOrders]);

  // Receipt Reprinting
  const handlePrintReceipt = async (order, paperSize = null) => {
    try {
      setPrintingOrderId(order.id);

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

  // Print Sales Summary Report via clean isolated iframe
  const handlePrintSummary = () => {
    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      let filterLabel = "All Time";
      if (dateFilter === "day") {
        filterLabel = `Specific Date: ${selectedDay}`;
      } else if (dateFilter === "month") {
        filterLabel = `Month: ${selectedMonth}`;
      } else if (dateFilter === "year") {
        filterLabel = `Year: ${selectedYear}`;
      } else if (dateFilter === "custom") {
        filterLabel = `Range: ${customStartDate || "Start"} to ${customEndDate || "End"}`;
      }

      const rowsHtml = filteredOrders
        .map((o) => {
          const dt = formatDateTime(o.created_at);
          const itemsText = (o.items || [])
            .map((it) => `${it.quantity || 1}x ${it.product_name || it.name || "Item"}`)
            .join(", ");
          return `
            <tr>
              <td style="font-family: monospace; font-weight: bold; white-space: nowrap;">${o.id}</td>
              <td style="white-space: nowrap;">${dt.date}<br><small style="color: #666;">${dt.time}</small></td>
              <td><strong>${o.customer_name || "Walk-in Guest"}</strong><br><small style="color: #666;">${o.customer_contact || ""}</small></td>
              <td>${itemsText || "Bakery Items"}</td>
              <td>${o.payment_method || "Cash"}</td>
              <td style="text-align: right; font-weight: bold; white-space: nowrap;">${formatCurrency(o.total)}</td>
            </tr>
          `;
        })
        .join("");

      const reportHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>BAKE HOUSE - Sales Summary Report</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #2D2016;
              margin: 0;
              padding: 0;
              font-size: 10pt;
              line-height: 1.4;
              background: #FFF;
            }
            .report-header {
              border-bottom: 2px solid #54331D;
              padding-bottom: 12px;
              margin-bottom: 16px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .brand h1 {
              margin: 0;
              font-size: 20pt;
              color: #54331D;
              letter-spacing: -0.5px;
            }
            .brand p {
              margin: 3px 0 0;
              font-size: 10pt;
              color: #7A695B;
            }
            .meta-info {
              text-align: right;
              font-size: 9pt;
              color: #555;
            }
            .meta-info strong {
              color: #2D2016;
            }
            .kpi-row {
              display: flex;
              gap: 12px;
              margin-bottom: 18px;
            }
            .kpi-box {
              flex: 1;
              background: #FAF6F0;
              border: 1px solid #EADBCE;
              border-radius: 8px;
              padding: 10px 14px;
            }
            .kpi-title {
              font-size: 8pt;
              font-weight: 800;
              color: #8C7B70;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .kpi-val {
              font-size: 14pt;
              font-weight: 800;
              color: #54331D;
              margin: 4px 0 0;
            }
            .kpi-sub {
              font-size: 8pt;
              color: #7A695B;
              margin-top: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 9pt;
            }
            th {
              background: #54331D;
              color: #FFF;
              text-align: left;
              padding: 8px 10px;
              font-size: 8pt;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            th:last-child {
              text-align: right;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #EADBCE;
              vertical-align: top;
            }
            tr:nth-child(even) td {
              background: #FCFAF7;
            }
            .report-footer {
              margin-top: 25px;
              padding-top: 12px;
              border-top: 1px dashed #CCC;
              display: flex;
              justify-content: space-between;
              font-size: 8.5pt;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="brand">
              <h1>BAKE HOUSE</h1>
              <p>Official Sales &amp; Revenue Summary Report</p>
            </div>
            <div class="meta-info">
              <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
              <div><strong>Date Scope:</strong> ${filterLabel}</div>
              <div><strong>Transactions:</strong> ${filteredOrders.length} orders</div>
            </div>
          </div>

          <div class="kpi-row">
            <div class="kpi-box">
              <div class="kpi-title">Total Gross Sales</div>
              <div class="kpi-val">${formatCurrency(metrics.totalRevenue)}</div>
              <div class="kpi-sub">${metrics.totalOrders} recorded orders</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Items Sold</div>
              <div class="kpi-val">${metrics.totalUnitsSold.toLocaleString()}</div>
              <div class="kpi-sub">Total bakery units</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Average Order Value</div>
              <div class="kpi-val">${formatCurrency(metrics.averageOrder)}</div>
              <div class="kpi-sub">Per transaction</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 16%;">ORDER ID</th>
                <th style="width: 16%;">DATE &amp; TIME</th>
                <th style="width: 20%;">CUSTOMER</th>
                <th style="width: 28%;">ITEMS PURCHASED</th>
                <th style="width: 10%;">PAYMENT</th>
                <th style="width: 10%;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 20px;">No sales transactions found.</td></tr>'}
            </tbody>
          </table>

          <div class="report-footer">
            <div>BAKE HOUSE Artisan Bakery Management System</div>
            <div>Authorized Signature: ___________________________</div>
          </div>
        </body>
        </html>
      `;

      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(reportHtml);
      iframe.contentWindow.document.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          console.error("Print error:", err);
          showToast("⚠️ Could not open printer dialog.");
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }
      }, 300);
    } catch (err) {
      console.error("Print summary error:", err);
      showToast("⚠️ Could not generate print summary.");
    }
  };

  const getStatusBadgeClass = (status) => {
    const s = String(status || "").toLowerCase().trim();
    if (s === "completed") return "status-completed";
    if (s === "pending") return "status-pending";
    if (s.includes("prep") || s.includes("confirm")) return "status-preparing";
    if (s.includes("delivery") || s.includes("ready")) return "status-delivery";
    if (s === "denied" || s === "cancelled") return "status-denied";
    return "status-default";
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
        <div className="header-text-block">
          <h1>Sales History &amp; Receipts</h1>
          <p>
            Complete historical audit ledger of all counter POS transactions and online orders. Inspect individual line items, customer details, and reprint official receipts.
          </p>
        </div>

        <div className="header-actions-block">
          <button
            type="button"
            className="sales-btn btn-refresh"
            onClick={fetchSales}
            disabled={loading}
            title="Refresh latest sales records"
          >
            <span className={loading ? "spin-icon" : ""}>🔄</span> Refresh
          </button>
          <button
            type="button"
            className="sales-btn btn-print-summary"
            onClick={handlePrintSummary}
            title="Print entire sales report summary"
          >
            🖨️ Print Summary
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="sales-kpi-grid">
        <div className="sales-kpi-card">
          <div className="kpi-icon-box gold">💰</div>
          <div className="kpi-details">
            <span className="kpi-title">TOTAL GROSS SALES</span>
            <strong className="kpi-value">{formatCurrency(metrics.totalRevenue)}</strong>
            <span className="kpi-hint">{metrics.totalOrders} total recorded orders</span>
          </div>
        </div>

        <div className="sales-kpi-card">
          <div className="kpi-icon-box blue">🥖</div>
          <div className="kpi-details">
            <span className="kpi-title">ITEMS SOLD</span>
            <strong className="kpi-value">{metrics.totalUnitsSold.toLocaleString()}</strong>
            <span className="kpi-hint">Total bakery units purchased</span>
          </div>
        </div>

        <div className="sales-kpi-card">
          <div className="kpi-icon-box brown">📊</div>
          <div className="kpi-details">
            <span className="kpi-title">AVERAGE ORDER VALUE</span>
            <strong className="kpi-value">{formatCurrency(metrics.averageOrder)}</strong>
            <span className="kpi-hint">Average ticket size</span>
          </div>
        </div>
      </div>

      {/* Main Ledger Panel */}
      <div className="sales-ledger-panel">
        {/* Filters Bar */}
        <div className="sales-filters-bar">
          <div className="sales-search-wrapper">
            <span className="search-symbol">🔍</span>
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

          <div className="sales-dropdown-group">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="sales-styled-select"
            >
              <option value="all">📅 All Time</option>
              <option value="day">☀️ By Day</option>
              <option value="month">🗓️ By Month</option>
              <option value="year">📆 By Year</option>
              <option value="custom">⏱️ Custom Range</option>
            </select>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="sales-styled-select"
            >
              <option value="all">Fulfillment: All</option>
              <option value="pos">🏪 In-store POS (Pickup)</option>
              <option value="delivery">🚚 Online Delivery</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="sales-styled-select"
            >
              <option value="all">Payment: All</option>
              <option value="cash">💵 Cash / COD</option>
              <option value="gcash">📱 GCash</option>
              <option value="card">💳 Card</option>
            </select>
          </div>
        </div>

        {/* Sub-selector for Day Filter */}
        {dateFilter === "day" && (
          <div className="sales-custom-date-box">
            <div className="date-field">
              <label>Select Date:</label>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="date-preset-btn"
              onClick={() => {
                const d = new Date();
                setSelectedDay(
                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                );
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="date-preset-btn"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                setSelectedDay(
                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                );
              }}
            >
              Yesterday
            </button>
          </div>
        )}

        {/* Sub-selector for Month Filter */}
        {dateFilter === "month" && (
          <div className="sales-custom-date-box">
            <div className="date-field">
              <label>Select Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="date-preset-btn"
              onClick={() => {
                const d = new Date();
                setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
              }}
            >
              This Month
            </button>
          </div>
        )}

        {/* Sub-selector for Year Filter */}
        {dateFilter === "year" && (
          <div className="sales-custom-date-box">
            <div className="date-field">
              <label>Select Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="date-preset-btn"
              onClick={() => setSelectedYear(String(new Date().getFullYear()))}
            >
              Current Year
            </button>
          </div>
        )}

        {/* Sub-selector for Custom Range */}
        {dateFilter === "custom" && (
          <div className="sales-custom-date-box">
            <div className="date-field">
              <label>From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div className="date-field">
              <label>To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="sales-results-indicator">
          Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> recorded sales transactions
        </div>

        {/* Master Ledger Grid Table */}
        <div className="sales-table-scroll-container">
          {/* Header Row */}
          <div className="sales-grid-header">
            <span>ORDER ID</span>
            <span>DATE &amp; TIME</span>
            <span>CUSTOMER</span>
            <span>PRODUCTS SOLD</span>
            <span>PAYMENT</span>
            <span>STATUS</span>
            <span>AMOUNT</span>
            <span style={{ textAlign: "right" }}>ACTIONS</span>
          </div>

          {/* Table Body Content */}
          {loading ? (
            <div className="sales-table-loading">
              <div className="sales-spinner"></div>
              <p>Loading sales records from bakery database...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="sales-table-empty">
              <span className="empty-symbol">🍰</span>
              <h4>No Sales Transactions Found</h4>
              <p>No transactions match your current search terms and filter criteria.</p>
              <button
                type="button"
                className="sales-reset-btn"
                onClick={() => {
                  setSearchTerm("");
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
            <div className="sales-grid-body">
              {filteredOrders.map((order) => {
                const items = Array.isArray(order.items) ? order.items : [];
                const totalUnits = items.reduce((sum, it) => sum + parseInt(it.quantity || 1, 10), 0);
                const dt = formatDateTime(order.created_at);

                return (
                  <div key={order.id} className="sales-grid-row">
                    {/* 1. ORDER ID */}
                    <div className="col-cell col-id">
                      <strong className="order-id-num">{order.id}</strong>
                    </div>

                    {/* 2. DATE & TIME */}
                    <div className="col-cell col-date">
                      <strong className="date-text">{dt.date}</strong>
                      <span className="time-sub">{dt.time}</span>
                    </div>

                    {/* 3. CUSTOMER */}
                    <div className="col-cell col-cust">
                      <strong className="customer-full-name">
                        {order.customer_name || "Walk-in Guest"}
                      </strong>
                      <span className="customer-phone">
                        {order.customer_contact ? `📞 ${order.customer_contact}` : "Walk-in Counter"}
                      </span>
                    </div>

                    {/* 4. PRODUCTS SOLD */}
                    <div className="col-cell col-items">
                      {items.length === 0 ? (
                        <span className="no-items">General Bakery Item</span>
                      ) : (
                        <div className="items-chip-list">
                          {items.slice(0, 2).map((it, idx) => (
                            <div key={idx} className="item-chip-row">
                              <span className="item-qty-tag">{it.quantity}×</span>
                              <span className="item-label" title={it.product_name || it.name}>
                                {it.product_name || it.name}
                              </span>
                              {it.customization && (
                                <span className="custom-indicator" title="Custom Cake Configuration">🎂</span>
                              )}
                            </div>
                          ))}
                          {items.length > 2 && (
                            <span className="more-items-chip">
                              +{items.length - 2} more ({totalUnits} total units)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 5. PAYMENT */}
                    <div className="col-cell col-pay">
                      <span className="payment-pill">
                        {order.payment_method || "Cash"}
                      </span>
                    </div>

                    {/* 6. STATUS */}
                    <div className="col-cell col-status">
                      <span className={`status-pill ${getStatusBadgeClass(order.status)}`}>
                        ● {order.status || "Pending"}
                      </span>
                    </div>

                    {/* 7. AMOUNT */}
                    <div className="col-cell col-amount">
                      <strong className="amount-gold">{formatCurrency(order.total)}</strong>
                      {parseFloat(order.delivery_fee || 0) > 0 && (
                        <small className="fee-text">incl. fee {formatCurrency(order.delivery_fee)}</small>
                      )}
                    </div>

                    {/* 8. ACTIONS */}
                    <div className="col-cell col-actions">
                      <button
                        type="button"
                        className="btn-action-print"
                        onClick={() => handlePrintReceipt(order)}
                        disabled={printingOrderId === order.id}
                        title="Instant Thermal Print Receipt"
                      >
                        <span className={printingOrderId === order.id ? "spin-icon" : ""}>🖨️</span>
                        <span>{printingOrderId === order.id ? "Printing..." : "Print"}</span>
                      </button>

                      <button
                        type="button"
                        className="btn-action-view"
                        onClick={() => setSelectedOrder(order)}
                        title="View Official Receipt"
                      >
                        👁️ View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DETAIL & RECEIPT MODAL */}
      {selectedOrder && (
        <div className="sales-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="sales-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="modal-top-bar">
              <div>
                <span className="receipt-subtitle">OFFICIAL RECEIPT ARCHIVE</span>
                <h2>Order #{selectedOrder.id}</h2>
              </div>
              <button
                type="button"
                className="modal-x-btn"
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>

            {/* Receipt Body */}
            <div className="modal-receipt-scroll">
              <div className="paper-receipt-container">
                <div className="paper-receipt-header">
                  <h3>BAKE HOUSE</h3>
                  <p>Artisan Bakery &amp; Boutique</p>
                  <p>Poblacion, Cordova, Cebu, Philippines</p>
                  <p>Tel: +63 (032) 496-8888 | TIN: 000-847-293-000</p>
                  <div className="receipt-divider dashed"></div>
                  <div className="receipt-meta-lines">
                    <div className="meta-line">
                      <span>Date:</span>
                      <strong>{formatDateTime(selectedOrder.created_at).date} {formatDateTime(selectedOrder.created_at).time}</strong>
                    </div>
                    <div className="meta-line">
                      <span>Channel:</span>
                      <strong>{selectedOrder.fulfillment_type || "Store POS"}</strong>
                    </div>
                    <div className="meta-line">
                      <span>Customer:</span>
                      <strong>{selectedOrder.customer_name || "Walk-in Guest"}</strong>
                    </div>
                    <div className="meta-line">
                      <span>Contact:</span>
                      <strong>{selectedOrder.customer_contact || "N/A"}</strong>
                    </div>
                    {selectedOrder.delivery_address && (
                      <div className="meta-line full">
                        <span>Address:</span>
                        <strong>{selectedOrder.delivery_address}</strong>
                      </div>
                    )}
                  </div>
                  <div className="receipt-divider dashed"></div>
                </div>

                {/* Items in receipt */}
                <div className="paper-receipt-items">
                  <div className="items-head-row">
                    <span style={{ flex: 1 }}>Item</span>
                    <span style={{ width: "45px", textAlign: "center" }}>Qty</span>
                    <span style={{ width: "70px", textAlign: "right" }}>Price</span>
                    <span style={{ width: "75px", textAlign: "right" }}>Total</span>
                  </div>
                  {(selectedOrder.items || []).map((it, idx) => {
                    const qty = parseInt(it.quantity || 1, 10);
                    const unitPrice = parseFloat(it.price || 0);
                    const lineTotal = qty * unitPrice;

                    return (
                      <div key={idx} className="items-body-row">
                        <div className="item-name-col">
                          <strong>{it.product_name || it.name}</strong>
                          {it.customization && (
                            <div className="item-specs">
                              {it.customization.size && <span>Size: {it.customization.size} | </span>}
                              {it.customization.flavor && <span>Flavor: {it.customization.flavor} | </span>}
                              {it.customization.color && <span>Frosting: {it.customization.color}</span>}
                              {it.customization.message && (
                                <div className="item-custom-msg">
                                  <em>"{it.customization.message}"</em>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <span style={{ width: "45px", textAlign: "center" }}>{qty}</span>
                        <span style={{ width: "70px", textAlign: "right" }}>{formatCurrency(unitPrice)}</span>
                        <span style={{ width: "75px", textAlign: "right" }}>{formatCurrency(lineTotal)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="receipt-divider dashed"></div>

                {/* Totals */}
                <div className="paper-receipt-totals">
                  <div className="totals-line">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedOrder.subtotal || selectedOrder.total)}</span>
                  </div>
                  {parseFloat(selectedOrder.delivery_fee || 0) > 0 && (
                    <div className="totals-line">
                      <span>Delivery / Fulfillment Fee:</span>
                      <span>{formatCurrency(selectedOrder.delivery_fee)}</span>
                    </div>
                  )}
                  <div className="totals-line">
                    <span>12% VAT (Included):</span>
                    <span>
                      {formatCurrency(
                        (parseFloat(selectedOrder.total || 0) * 0.12) / 1.12
                      )}
                    </span>
                  </div>
                  <div className="receipt-divider double"></div>
                  <div className="totals-line grand">
                    <span>TOTAL AMOUNT DUE:</span>
                    <span>{formatCurrency(selectedOrder.total)}</span>
                  </div>
                  <div className="receipt-divider double"></div>
                  <div className="totals-line">
                    <span>Payment Method:</span>
                    <strong>{selectedOrder.payment_method || "Cash"}</strong>
                  </div>
                  <div className="totals-line">
                    <span>Status:</span>
                    <strong className={`status-pill ${getStatusBadgeClass(selectedOrder.status)}`}>
                      ● {selectedOrder.status || "Completed"}
                    </strong>
                  </div>
                </div>

                <div className="paper-receipt-footer">
                  <p>Maraming Salamat po sa inyong pagtangkilik!</p>
                  <p>Thank you for choosing BAKE HOUSE!</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-bottom-actions">
              <div className="print-btns-wrapper">
                <button
                  type="button"
                  className="modal-btn-print 58"
                  onClick={() => handlePrintReceipt(selectedOrder, "58mm")}
                  disabled={printingOrderId === selectedOrder.id}
                >
                  🖨️ Print 58mm Thermal
                </button>
                <button
                  type="button"
                  className="modal-btn-print 80"
                  onClick={() => handlePrintReceipt(selectedOrder, "80mm")}
                  disabled={printingOrderId === selectedOrder.id}
                >
                  📄 Print 80mm / Invoice
                </button>
              </div>

              <button
                type="button"
                className="modal-btn-close"
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
