/**
 * ============================================================================
 * BAKE HOUSE - Cashier Counter & POS Dashboard (Mall Style)
 * ============================================================================
 * Features:
 * 1. Rapid Mall-Style Product Catalog:
 *    - Instant category filtering (All, Cakes 🍰, Pastries 🥐, Breads 🍞, Bestsellers ⭐)
 *    - Real-time product search by name or category
 *    - Real-time stock status badges (Available, Low Stock, Out of Stock)
 *    - 1-Click tap to add/increment items to the active bill register
 * 2. Live Register & Bill Panel:
 *    - Itemized cart with quantity steppers (+/-), item removal, and subtotal calculation
 *    - Tax / VAT breakdown and prominent Total Amount Due display
 * 3. Payment & Change Calculator ("Money Given -> Change Due"):
 *    - Payment methods: Cash 💵, GCash 📱, Card 💳
 *    - Large Cash Tendered input with Quick Preset Bills (Exact, +₱50, +₱100, +₱200, +₱500, +₱1,000, +₱2,000)
 *    - Interactive on-screen Touch Numpad for mall touchscreen cashier setups
 *    - Real-time Change calculation with vivid green feedback for sufficient cash & warning for underpayment
 * 4. Official Bakery Thermal Receipt Modal:
 *    - Realistic printable receipt with store header, cashier name, itemized bill, cash tendered, change, and barcode
 *    - Browser Print (@media print) integration + instant "Next Customer" register reset
 * 5. Shift Counter Log:
 *    - Real-time tracking of today's counter sales, revenue, and past receipt reprints
 * ============================================================================
 */

import { useState, useEffect, useRef } from "react";
import { productService } from "../../../services/productService";
import { orderService } from "../../../services/orderService";
import { authService } from "../../../services/authService";
import "./CounterPOS.css";


export default function CounterPOS() {
  const currentUser = authService.getCurrentUser();
  const cashierName = currentUser?.first_name || currentUser?.username || "Cashier Staff";

  // Catalog State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Cart / Bill State
  const [cartItems, setCartItems] = useState([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerContact, setCustomerContact] = useState("");
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState("Cash"); // 'Cash', 'GCash', 'Card'
  const [cashTendered, setCashTendered] = useState("");
  const [showNumpad, setShowNumpad] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refNumber, setRefNumber] = useState("");

  // Parked / Held Tickets
  const [parkedOrders, setParkedOrders] = useState([]);

  // Receipt Modal State
  const [completedOrder, setCompletedOrder] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Shift / Today's Counter Log Drawer
  const [showShiftLog, setShowShiftLog] = useState(false);
  const [counterSalesToday, setCounterSalesToday] = useState([]);

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  const searchInputRef = useRef(null);
  const cashInputRef = useRef(null);

  // Update Clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Products & Today's Counter Orders
  const loadData = async () => {
    try {
      setLoadingProducts(true);
      const res = await productService.getProducts();
      if (res && res.products) {
        setProducts(res.products);
      }
    } catch (err) {
      console.error("Failed to fetch products for POS:", err);
    } finally {
      setLoadingProducts(false);
    }

    try {
      const ordersRes = await orderService.getOrders();
      if (ordersRes && ordersRes.orders) {
        const todayStr = new Date().toISOString().split("T")[0];
        const posOrders = ordersRes.orders.filter((o) => {
          const isPos =
            o.fulfillment_type === "Counter POS" ||
            o.fulfillment_type === "In-Store" ||
            (o.delivery_address && o.delivery_address.toLowerCase().includes("counter"));
          const isToday = (o.created_at || "").startsWith(todayStr);
          return isPos || isToday;
        });
        setCounterSalesToday(posOrders);
      }
    } catch (err) {
      console.warn("Failed to load counter sales log:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Products
  const categories = ["All", "Cake", "Pastry", "Bread", "Bestsellers"];

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "All"
        ? true
        : selectedCategory === "Bestsellers"
        ? Boolean(p.bestseller)
        : p.category?.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      searchQuery.trim() === ""
        ? true
        : p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.category || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Add Item to Bill Register
  const handleAddToCart = (product) => {
    if (product.stock <= 0) return;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Cannot add more. Only ${product.stock} items available in stock.`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          category: product.category,
          price: parseFloat(product.price),
          image: product.image,
          stock: product.stock,
          quantity: 1,
        },
      ];
    });
  };

  // Adjust Item Quantity
  const handleUpdateQty = (id, delta) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock) {
              alert(`Only ${item.stock} in stock.`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  // Remove Item
  const handleRemoveItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear Register
  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    if (window.confirm("Are you sure you want to clear the current bill register?")) {
      setCartItems([]);
      setCashTendered("");
      setCustomerName("Walk-in Customer");
      setCustomerContact("");
    }
  };

  // Park / Hold Order
  const handleParkOrder = () => {
    if (cartItems.length === 0) return;
    const parked = {
      id: "PARK-" + Math.floor(1000 + Math.random() * 9000),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      items: cartItems,
      customerName,
      customerContact,
    };
    setParkedOrders((prev) => [parked, ...prev]);
    setCartItems([]);
    setCashTendered("");
    setCustomerName("Walk-in Customer");
    setCustomerContact("");
    alert(`Order parked successfully as #${parked.id}`);
  };

  // Recall Parked Order
  const handleRecallParked = (parked) => {
    if (cartItems.length > 0) {
      if (!window.confirm("Current bill items will be replaced by the parked order. Proceed?")) {
        return;
      }
    }
    setCartItems(parked.items);
    setCustomerName(parked.customerName);
    setCustomerContact(parked.customerContact);
    setParkedOrders((prev) => prev.filter((p) => p.id !== parked.id));
  };

  // Financial Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalDue = subtotal;
  const vatAmount = (totalDue / 1.12) * 0.12; // 12% VAT standard Philippines retail breakdown
  const vatableSales = totalDue - vatAmount;

  // Cash / Change Calculations
  const parsedCash = parseFloat(cashTendered) || 0;
  const changeDue = parsedCash >= totalDue ? parsedCash - totalDue : 0;
  const isCashSufficient = paymentMethod !== "Cash" || parsedCash >= totalDue;
  const remainingAmount = parsedCash < totalDue ? totalDue - parsedCash : 0;


  // Touch Numpad Actions
  const handleNumpadInput = (digit) => {
    if (digit === "C") {
      setCashTendered("");
    } else if (digit === "DEL") {
      setCashTendered((prev) => prev.slice(0, -1));
    } else if (digit === "00") {
      if (cashTendered && cashTendered !== "0") {
        setCashTendered((prev) => prev + "00");
      }
    } else {
      if (cashTendered === "0") {
        setCashTendered(digit);
      } else {
        setCashTendered((prev) => prev + digit);
      }
    }
  };

  // Process Checkout & Place Counter Order
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      alert("Please add at least one item to the register before paying.");
      return;
    }

    if (paymentMethod === "Cash" && parsedCash < totalDue) {
      alert(`Insufficient cash tendered. Total due is ₱${totalDue.toLocaleString()} but received ₱${parsedCash.toLocaleString()}.`);
      if (cashInputRef.current) cashInputRef.current.focus();
      return;
    }

    try {
      setIsSubmitting(true);

      const orderPayload = {
        user_id: currentUser?.id || null,
        customer_name: customerName.trim() || "Walk-in Customer",
        customer_contact: customerContact.trim() || "N/A (Over-the-Counter)",
        fulfillment_type: "Counter POS",
        is_pos: true,
        delivery_address: "Store Counter (Poblacion, Cordova Branch)",
        delivery_fee: 0,
        payment_method: paymentMethod,
        ref_number: refNumber || null,
        subtotal: subtotal,
        discount_amount: 0,
        discount_type: null,
        cash_tendered: paymentMethod === "Cash" ? parsedCash : totalDue,
        change_amount: paymentMethod === "Cash" ? changeDue : 0,
        cashier_name: cashierName,
        status: "Completed",
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      };

      const res = await orderService.createOrder(orderPayload);

      if (res && res.success) {
        const orderData = res.order || {
          id: "BH-POS-" + Math.floor(10000 + Math.random() * 90000),
          created_at: new Date().toLocaleString(),
          items: cartItems,
          total: totalDue,
        };

        const finalReceipt = {
          ...orderData,
          cashier: cashierName,
          items: cartItems,
          subtotal: subtotal,
          discount_amount: 0,
          discount_type: null,
          total: totalDue,
          vatable_sales: vatableSales,
          vat_amount: vatAmount,
          payment_method: paymentMethod,
          cash_tendered: paymentMethod === "Cash" ? parsedCash : totalDue,
          change_amount: paymentMethod === "Cash" ? changeDue : 0,
          date_time: new Date().toLocaleString(),
          ref_number: refNumber,
        };

        setCompletedOrder(finalReceipt);
        setShowReceiptModal(true);

        // Add to local today's sales log
        setCounterSalesToday((prev) => [finalReceipt, ...prev]);

        // Refresh products catalog to get updated stock counts
        loadData();
      } else {
        alert(res?.message || "Failed to process sale.");
      }
    } catch (err) {
      console.error("POS Checkout error:", err);
      alert(err.message || "An error occurred while processing the checkout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset for Next Customer
  const handleNewSale = () => {
    setShowReceiptModal(false);
    setCompletedOrder(null);
    setCartItems([]);
    setCashTendered("");
    setRefNumber("");
    setCustomerName("Walk-in Customer");
    setCustomerContact("");
    setIsEditingCustomer(false);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // Trigger Receipt Print
  const handlePrintReceipt = () => {
    window.print();
  };

  // Calculate Today's POS Total
  const todayTotalRevenue = counterSalesToday.reduce(
    (sum, o) => sum + parseFloat(o.total || 0),
    0
  );

  return (
    <div className="counter-pos-page">
      {/* 1. TOP CASHIER OPERATIONS BAR */}
      <header className="pos-top-bar">
        <div className="pos-bar-left">
          <div className="pos-register-badge">
            <span className="register-icon">🖥️</span>
            <div>
              <strong>COUNTER 01</strong>
              <small>Cashier: {cashierName}</small>
            </div>
          </div>

          <div className="pos-clock-badge">
            <span>🕒</span>
            <strong>
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </strong>
            <small>{currentTime.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</small>
          </div>
        </div>

        {/* Live Search & Quick Filter */}
        <div className="pos-search-box">
          <span className="search-icon">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search products by name or category (e.g. Chocolate, Croissant)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        <div className="pos-bar-right">
          {parkedOrders.length > 0 && (
            <div className="parked-badge-wrapper">
              <span className="parked-pill">⏸️ {parkedOrders.length} Held</span>
              <div className="parked-dropdown">
                <strong>Held Orders:</strong>
                {parkedOrders.map((p) => (
                  <button key={p.id} onClick={() => handleRecallParked(p)}>
                    <span>{p.id} ({p.time})</span>
                    <strong>{p.items.length} items</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            className="shift-log-toggle-btn"
            onClick={() => setShowShiftLog(true)}
            title="View today's counter transactions"
          >
            📋 Today's Sales (₱{todayTotalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
          </button>

          <button
            type="button"
            className="reset-register-btn"
            onClick={handleClearCart}
            title="Reset active bill"
          >
            🔄 Reset
          </button>
        </div>
      </header>

      {/* 2. MAIN POS WORKSPACE: 2-COLUMN SPLIT */}
      <div className="pos-workspace-grid">
        {/* ====================================================================
            LEFT PANEL: PRODUCT CATALOG SELECTION GRID
            ==================================================================== */}
        <section className="pos-catalog-panel">
          {/* Category Tabs */}
          <div className="pos-category-bar">
            {categories.map((cat) => {
              const count =
                cat === "All"
                  ? products.length
                  : cat === "Bestsellers"
                  ? products.filter((p) => p.bestseller).length
                  : products.filter((p) => p.category?.toLowerCase() === cat.toLowerCase()).length;

              return (
                <button
                  key={cat}
                  type="button"
                  className={`pos-category-tab ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span>
                    {cat === "Cake" ? "🍰" : cat === "Pastry" ? "🥐" : cat === "Bread" ? "🍞" : cat === "Bestsellers" ? "⭐" : "🏷️"}
                  </span>
                  <span className="cat-name">{cat === "All" ? "All Products" : cat}</span>
                  <span className="cat-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Product Cards Grid */}
          <div className="pos-products-scroll-area">
            {loadingProducts ? (
              <div className="pos-loading-state">
                <div className="pos-spinner"></div>
                <p>Loading bakery catalog...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="pos-empty-catalog">
                <span>🧁</span>
                <h3>No items match your search</h3>
                <p>Try searching for a different keyword or category.</p>
                <button onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}>
                  View All Products
                </button>
              </div>
            ) : (
              <div className="pos-products-grid">
                {filteredProducts.map((product) => {
                  const inCartItem = cartItems.find((i) => i.id === product.id);
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock <= 5;

                  return (
                    <div
                      key={product.id}
                      className={`pos-product-card ${isOutOfStock ? "out-of-stock" : ""} ${inCartItem ? "in-cart" : ""}`}
                      onClick={() => !isOutOfStock && handleAddToCart(product)}
                      title={isOutOfStock ? "Out of stock" : `Click to add ${product.name}`}
                    >
                      {/* Cart Quantity Badge */}
                      {inCartItem && (
                        <div className="pos-item-qty-badge">
                          {inCartItem.quantity}×
                        </div>
                      )}

                      {/* Product Thumbnail */}
                      <div className="pos-card-media">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="pos-media-fallback"
                          style={{ display: product.image ? "none" : "flex" }}
                        >
                          {product.category === "Cake" ? "🍰" : product.category === "Pastry" ? "🥐" : "🍞"}
                        </div>

                        {/* Stock Tag */}
                        <span className={`pos-stock-tag ${isOutOfStock ? "stock-out" : isLowStock ? "stock-low" : "stock-ok"}`}>
                          {isOutOfStock ? "Out of Stock" : isLowStock ? `Low: ${product.stock}` : `Stock: ${product.stock}`}
                        </span>
                      </div>

                      {/* Product Details */}
                      <div className="pos-card-info">
                        <span className="pos-card-category">{product.category}</span>
                        <h4 className="pos-card-title">{product.name}</h4>
                        <div className="pos-card-footer">
                          <strong className="pos-card-price">
                            ₱{parseFloat(product.price).toLocaleString()}
                          </strong>
                          <button
                            type="button"
                            className="pos-add-btn"
                            disabled={isOutOfStock}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(product);
                            }}
                          >
                            {isOutOfStock ? "✕" : "+ Add"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ====================================================================
            RIGHT PANEL: ACTIVE BILL REGISTER, CASH & CHANGE CALCULATOR
            ==================================================================== */}
        <section className="pos-register-panel">
          {/* Register Header */}
          <div className="register-header">
            <div className="register-title-row">
              <div className="ticket-title-group">
                <h3>🛒 Order Register</h3>
                <span className="active-ticket-num">
                  Ticket #{Math.floor(100 + cartItems.length * 7)}
                </span>
              </div>

              <div className="register-header-actions">
                <button
                  type="button"
                  className="hold-order-btn"
                  onClick={handleParkOrder}
                  disabled={cartItems.length === 0}
                  title="Hold/Park this ticket"
                >
                  ⏸️ Hold
                </button>
                <button
                  type="button"
                  className="clear-bill-btn"
                  onClick={handleClearCart}
                  disabled={cartItems.length === 0}
                  title="Clear items"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Customer Details Pill / Toggle */}
            <div className="customer-info-strip">
              {!isEditingCustomer ? (
                <div className="customer-summary-row" onClick={() => setIsEditingCustomer(true)}>
                  <span>👤 <strong>{customerName}</strong> {customerContact && `(${customerContact})`}</span>
                  <button type="button" className="edit-cust-btn">✏️ Edit</button>
                </div>
              ) : (
                <div className="customer-edit-form">
                  <input
                    type="text"
                    placeholder="Customer Name (e.g. Maria Santos)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Phone / Notes (optional)"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                  />
                  <button type="button" onClick={() => setIsEditingCustomer(false)}>Done</button>
                </div>
              )}
            </div>
          </div>

          {/* Bill Items List */}
          <div className="register-items-area">
            {cartItems.length === 0 ? (
              <div className="register-empty-state">
                <div className="empty-icon-circle">🛒</div>
                <h4>Register is Empty</h4>
                <p>Tap products from the menu on the left to add items to this customer's bill.</p>
              </div>
            ) : (
              <div className="register-items-list">
                {cartItems.map((item) => (
                  <div key={item.id} className="register-item-row">
                    <div className="item-details-cell">
                      <strong>{item.name}</strong>
                      <span>₱{item.price.toLocaleString()} each</span>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="item-qty-stepper">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        title="Decrease"
                      >
                        –
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        disabled={item.quantity >= item.stock}
                        title="Increase"
                      >
                        +
                      </button>
                    </div>

                    {/* Line Total & Remove */}
                    <div className="item-total-cell">
                      <strong>₱{(item.price * item.quantity).toLocaleString()}</strong>
                      <button
                        type="button"
                        className="remove-line-btn"
                        onClick={() => handleRemoveItem(item.id)}
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bill Totals Summary */}
          <div className="register-totals-box">
            <div className="summary-line">
              <span>Subtotal ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
              <span>₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="summary-line vat-note">
              <span>12% VAT (Inclusive)</span>
              <span>₱{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="summary-line total-highlight">
              <strong>TOTAL DUE</strong>
              <strong className="total-due-amount">
                ₱{totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* ================================================================
              PAYMENT & CHANGE CALCULATOR ("Money Given -> Change Due")
              ================================================================ */}
          <div className="pos-payment-calculator">
            {/* Payment Method Selector */}
            <div className="payment-tabs-row">
              <button
                type="button"
                className={`payment-tab ${paymentMethod === "Cash" ? "active" : ""}`}
                onClick={() => setPaymentMethod("Cash")}
              >
                💵 Cash Payment
              </button>
              <button
                type="button"
                className={`payment-tab ${paymentMethod === "GCash" ? "active" : ""}`}
                onClick={() => { setPaymentMethod("GCash"); setCashTendered(totalDue.toString()); }}
              >
                📱 GCash / E-Wallet
              </button>
              <button
                type="button"
                className={`payment-tab ${paymentMethod === "Card" ? "active" : ""}`}
                onClick={() => { setPaymentMethod("Card"); setCashTendered(totalDue.toString()); }}
              >
                💳 Debit / Credit Card
              </button>
            </div>

            {paymentMethod === "Cash" ? (
              <div className="cash-tendered-block">
                <div className="cash-input-row">
                  <div className="cash-label-group">
                    <label>💵 Money Given by Customer:</label>
                    <button
                      type="button"
                      className="numpad-toggle-btn"
                      onClick={() => setShowNumpad(!showNumpad)}
                    >
                      {showNumpad ? "Hide Numpad ⌨️" : "Touch Numpad 🔢"}
                    </button>
                  </div>

                  <div className="cash-input-wrapper">
                    <span className="currency-prefix">₱</span>
                    <input
                      ref={cashInputRef}
                      type="number"
                      placeholder="0.00"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="cash-input-field"
                      min="0"
                    />
                  </div>
                </div>


                {/* Collapsible Touch Numpad */}
                {showNumpad && (
                  <div className="pos-touch-numpad">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "00", "DEL"].map((key) => (
                      <button
                        key={key}
                        type="button"
                        className={`numpad-key ${key === "C" ? "key-clear" : key === "DEL" ? "key-del" : ""}`}
                        onClick={() => handleNumpadInput(key)}
                      >
                        {key === "DEL" ? "⌫" : key}
                      </button>
                    ))}
                  </div>
                )}

                {/* LIVE REAL-TIME CHANGE DISPLAY */}
                <div className={`change-display-card ${parsedCash >= totalDue && totalDue > 0 ? "change-ok" : parsedCash > 0 ? "change-short" : "change-idle"}`}>
                  {parsedCash >= totalDue && totalDue > 0 ? (
                    <>
                      <div className="change-icon-circle">✅</div>
                      <div className="change-text-group">
                        <span className="change-label">CHANGE TO RETURN:</span>
                        <strong className="change-amount">
                          ₱{changeDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </>
                  ) : parsedCash > 0 && remainingAmount > 0 ? (
                    <>
                      <div className="change-icon-circle short">⚠️</div>
                      <div className="change-text-group">
                        <span className="change-label">REMAINING BALANCE DUE:</span>
                        <strong className="change-amount short">
                          ₱{remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <div className="change-text-group idle">
                      <span>Enter cash received from customer above</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="non-cash-block">
                <label>
                  {paymentMethod === "GCash" ? "📱 GCash Reference / Trace Number:" : "💳 Card Approval / Trace Code:"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1029384756"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="ref-input-field"
                />
                <div className="change-display-card change-ok">
                  <div className="change-icon-circle">✅</div>
                  <div className="change-text-group">
                    <span className="change-label">AMOUNT TO CHARGE:</span>
                    <strong className="change-amount">
                      ₱{totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* CHECKOUT ACTION BUTTON */}
            <button
              type="button"
              className="pos-complete-sale-btn"
              disabled={cartItems.length === 0 || isSubmitting || !isCashSufficient}
              onClick={handleCheckout}
            >
              {isSubmitting ? (
                <>
                  <span className="btn-spinner"></span> Processing Sale...
                </>
              ) : (
                <>
                  <span>⚡ COMPLETE SALE (₱{totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                  <span className="btn-sub-hint">Generate Receipt & Deduct Stock</span>
                </>
              )}
            </button>
          </div>
        </section>
      </div>

      {/* ====================================================================
          3. OFFICIAL THERMAL RECEIPT MODAL
          ==================================================================== */}
      {showReceiptModal && completedOrder && (
        <div className="receipt-modal-backdrop" onClick={handleNewSale}>
          <div className="receipt-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-modal-actions no-print">
              <button type="button" className="print-receipt-btn" onClick={handlePrintReceipt}>
                🖨️ Print Receipt
              </button>
              <button type="button" className="new-sale-btn" onClick={handleNewSale}>
                ✨ Next Customer / New Sale
              </button>
              <button type="button" className="close-receipt-btn" onClick={handleNewSale}>
                ✕
              </button>
            </div>

            {/* Thermal Receipt Paper Layout */}
            <div className="printable-receipt-paper" id="printableReceipt">
              {/* Bakery Branding Header */}
              <div className="receipt-header">
                <h2>BAKE HOUSE</h2>
                <p className="receipt-sub">Artisan Bakery & Cake Boutique</p>
                <p>Poblacion, Cordova, Cebu 6017</p>
                <p>Tel: +63 (032) 496-8888</p>
                <p>VAT Reg TIN: 000-847-293-000</p>
                <div className="receipt-divider">================================</div>
                <h3 className="receipt-doc-title">OFFICIAL SALES INVOICE</h3>
                <div className="receipt-meta-grid">
                  <span>OR #: {completedOrder.id}</span>
                  <span>Date: {completedOrder.date_time || completedOrder.created_at}</span>
                  <span>Cashier: {completedOrder.cashier || cashierName}</span>
                  <span>Customer: {completedOrder.customer_name || "Walk-in"}</span>
                  <span>Type: In-Store Counter Sale</span>
                </div>
                <div className="receipt-divider">--------------------------------</div>
              </div>

              {/* Items Table */}
              <table className="receipt-items-table">
                <thead>
                  <tr>
                    <th className="th-qty">QTY</th>
                    <th className="th-desc">ITEM</th>
                    <th className="th-price">PRICE</th>
                    <th className="th-amount">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {(completedOrder.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="td-qty">{it.quantity}</td>
                      <td className="td-desc">{it.name || it.product_name}</td>
                      <td className="td-price">{parseFloat(it.price).toFixed(2)}</td>
                      <td className="td-amount">{(parseFloat(it.price) * parseInt(it.quantity)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="receipt-divider">--------------------------------</div>

              {/* Totals & Tax Calculation */}
              <div className="receipt-totals-table">
                <div className="receipt-line">
                  <span>SUBTOTAL:</span>
                  <span>₱{parseFloat(completedOrder.subtotal || 0).toFixed(2)}</span>
                </div>

                <div className="receipt-line grand-total">
                  <strong>TOTAL AMOUNT DUE:</strong>
                  <strong>₱{parseFloat(completedOrder.total || 0).toFixed(2)}</strong>
                </div>

                <div className="receipt-divider">--------------------------------</div>

                <div className="receipt-line">
                  <span>PAYMENT METHOD:</span>
                  <span>{completedOrder.payment_method?.toUpperCase()}</span>
                </div>

                {completedOrder.ref_number && (
                  <div className="receipt-line">
                    <span>REF / TRACE #:</span>
                    <span>{completedOrder.ref_number}</span>
                  </div>
                )}

                <div className="receipt-line highlight">
                  <span>CASH TENDERED:</span>
                  <span>₱{parseFloat(completedOrder.cash_tendered || 0).toFixed(2)}</span>
                </div>

                <div className="receipt-line highlight">
                  <strong>CHANGE DUE:</strong>
                  <strong>₱{parseFloat(completedOrder.change_amount || 0).toFixed(2)}</strong>
                </div>

                <div className="receipt-divider">--------------------------------</div>

                <div className="receipt-line small">
                  <span>VATable Sales:</span>
                  <span>₱{parseFloat(completedOrder.vatable_sales || (completedOrder.total / 1.12)).toFixed(2)}</span>
                </div>
                <div className="receipt-line small">
                  <span>12% VAT:</span>
                  <span>₱{parseFloat(completedOrder.vat_amount || ((completedOrder.total / 1.12) * 0.12)).toFixed(2)}</span>
                </div>
              </div>

              {/* Footer & Barcode Simulation */}
              <div className="receipt-footer">
                <div className="barcode-simulation">
                  |||||| |||| |||||||| |||||| ||||| |||||||
                </div>
                <p className="barcode-number">*{completedOrder.id}*</p>
                <p className="thank-you-msg">THANK YOU FOR BAKING YOUR DAY WITH US!</p>
                <p className="receipt-footnote">This serves as your Official Sales Invoice.</p>
                <p className="receipt-footnote">Please keep for warranty & store inquiries.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          4. TODAY'S SHIFT / COUNTER SALES LOG DRAWER
          ==================================================================== */}
      {showShiftLog && (
        <div className="shift-drawer-backdrop" onClick={() => setShowShiftLog(false)}>
          <div className="shift-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="shift-drawer-header">
              <div>
                <h2>📋 Today's Counter Sales Log</h2>
                <p>All Over-The-Counter POS transactions completed today</p>
              </div>
              <button className="close-drawer-btn" onClick={() => setShowShiftLog(false)}>
                ✕
              </button>
            </div>

            {/* Shift KPI Summary */}
            <div className="shift-kpi-cards">
              <div className="kpi-card">
                <span>Total Counter Revenue</span>
                <strong>₱{todayTotalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <div className="kpi-card">
                <span>Completed Tickets</span>
                <strong>{counterSalesToday.length}</strong>
              </div>
            </div>

            {/* Past Counter Transactions List */}
            <div className="shift-orders-list">
              {counterSalesToday.length === 0 ? (
                <div className="shift-empty-state">
                  <span>🧾</span>
                  <p>No counter transactions recorded yet today.</p>
                </div>
              ) : (
                counterSalesToday.map((order, idx) => (
                  <div key={order.id || idx} className="shift-order-card">
                    <div className="shift-order-top">
                      <div>
                        <strong>#{order.id}</strong>
                        <span className="shift-order-time">🕒 {order.created_at || order.date_time}</span>
                      </div>
                      <span className="shift-order-price">₱{parseFloat(order.total || 0).toLocaleString()}</span>
                    </div>

                    <p className="shift-order-items-summary">
                      👤 {order.customer_name || "Walk-in"} • 💳 {order.payment_method || "Cash"}
                    </p>

                    <div className="shift-order-bottom">
                      <span className="shift-order-cash-info">
                        Cash: ₱{parseFloat(order.cash_tendered || order.total).toLocaleString()} | Change: ₱{parseFloat(order.change_amount || 0).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        className="reprint-btn"
                        onClick={() => {
                          setCompletedOrder(order);
                          setShowReceiptModal(true);
                        }}
                      >
                        🧾 View Receipt
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
