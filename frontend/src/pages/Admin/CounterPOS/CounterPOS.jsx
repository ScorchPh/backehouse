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
import { thermalPrinterService } from "../../../services/printerService";
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

  // Printer Hardware & Setting State (GOOJPRT PT-210, Bluetooth, Serial, Paper Size)
  const [printerConfig, setPrinterConfig] = useState(() => thermalPrinterService.getConfig());
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);
  const [isTestingPrint, setIsTestingPrint] = useState(false);

  // Online Order QR Scanner & Pickup Claim States
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalTab, setQrModalTab] = useState("input"); // 'input', 'camera', 'list'
  const [qrInputCode, setQrInputCode] = useState("");
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [qrScanError, setQrScanError] = useState("");
  const [onlinePickupOrders, setOnlinePickupOrders] = useState([]);
  const [claimedOnlineOrder, setClaimedOnlineOrder] = useState(null);
  const [isCameraScanning, setIsCameraScanning] = useState(false);

  const videoRef = useRef(null);
  const qrInputRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const handleUpdatePrinterConfig = (updated) => {
    const next = thermalPrinterService.saveConfig(updated);
    setPrinterConfig(next);
  };

  const handleConnectBluetooth = async () => {
    try {
      setIsConnectingPrinter(true);
      const res = await thermalPrinterService.connectBluetooth();
      setPrinterConfig(thermalPrinterService.getConfig());
      alert(`✅ Connected to Bluetooth Printer: ${res.name}\nYou can now print directly without print dialogs!`);
    } catch (err) {
      alert(`⚠️ Bluetooth connection failed: ${err.message}\n\nTip: If you're on Windows, you can also use USB Cable or the standard Windows Print Driver.`);
    } finally {
      setIsConnectingPrinter(false);
    }
  };

  const handleConnectSerial = async () => {
    try {
      setIsConnectingPrinter(true);
      const res = await thermalPrinterService.connectSerial();
      setPrinterConfig(thermalPrinterService.getConfig());
      alert(`✅ Connected to USB Serial Printer: ${res.name}`);
    } catch (err) {
      alert(`⚠️ USB connection failed: ${err.message}`);
    } finally {
      setIsConnectingPrinter(false);
    }
  };

  const handleTestPrint = async () => {
    try {
      setIsTestingPrint(true);
      const res = await thermalPrinterService.testPrint(printerConfig.paperSize);
      if (res && res.error) {
        console.warn("Test print fallback:", res.error);
      }
    } catch (err) {
      alert(`⚠️ Test print error: ${err.message}`);
    } finally {
      setIsTestingPrint(false);
    }
  };

  // ============================================================================
  // QR SCANNER & ONLINE PICKUP CLAIM LOGIC
  // ============================================================================
  const handleOpenQRModal = async () => {
    setShowQRModal(true);
    setQrScanError("");
    setQrInputCode("");
    setQrModalTab("input");
    setTimeout(() => {
      if (qrInputRef.current) qrInputRef.current.focus();
    }, 200);

    try {
      const res = await orderService.getOrders();
      if (res && res.orders) {
        const pickupList = res.orders.filter((o) => {
          const isPickup =
            (o.fulfillment_type && o.fulfillment_type.toLowerCase() === "pickup") ||
            (o.delivery_address && o.delivery_address.toLowerCase().includes("pickup"));
          const isPendingOrReady =
            o.status === "Ready for Pickup" ||
            o.status === "Confirmed" ||
            o.status === "Pending" ||
            o.status === "Preparing";
          return isPickup && isPendingOrReady;
        });
        setOnlinePickupOrders(pickupList);
      }
    } catch (err) {
      console.warn("Failed to fetch pickup orders for QR modal:", err);
    }
  };

  const handleCloseQRModal = () => {
    stopCameraStream();
    setShowQRModal(false);
    setQrScanError("");
  };

  const stopCameraStream = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraScanning(false);
  };

  const handleStartCamera = async () => {
    setQrScanError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraScanning(true);

      if ("BarcodeDetector" in window) {
        const barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code", "code_128", "ean_13"] });
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const detectedVal = barcodes[0].rawValue;
                handleProcessQRCode(detectedVal);
              }
            } catch (err) {
              console.warn("Frame scan error:", err);
            }
          }
        }, 300);
      }
    } catch (err) {
      setQrScanError("Camera access: " + (err.message || "Permission required") + ". Tip: Use Handheld 2D Scanner or ID Input tab.");
      setIsCameraScanning(false);
    }
  };

  const extractOrderId = (rawString) => {
    if (!rawString) return "";
    const str = rawString.trim();
    if (str.includes("id=")) {
      const match = str.match(/[?&]id=([^&]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]);
    }
    if (str.startsWith("#")) {
      return str.substring(1).trim();
    }
    return str;
  };

  const handleProcessQRCode = async (rawString) => {
    const cleanId = extractOrderId(rawString);
    if (!cleanId) {
      setQrScanError("Please enter or scan a valid Order ID or QR URL.");
      return;
    }

    try {
      setIsProcessingQR(true);
      setQrScanError("");
      const res = await orderService.getOrderDetails(cleanId);
      if (res && res.success && res.order) {
        loadOnlineOrderToRegister(res.order);
        handleCloseQRModal();
      } else {
        setQrScanError(`Order #${cleanId} not found in the system. Please verify.`);
      }
    } catch (err) {
      setQrScanError(`Failed to load Order #${cleanId}: ${err.message || "Order not found."}`);
    } finally {
      setIsProcessingQR(false);
    }
  };

  const loadOnlineOrderToRegister = (order) => {
    const formatted = (order.items || []).map((it, idx) => ({
      id: it.product_id || it.id || idx + 1,
      name: it.product_name || it.name || "Bakery Item",
      category: it.category || "Online Reserved",
      price: parseFloat(it.price || 0),
      image: it.image || null,
      stock: 999, // Already reserved from catalog stock at checkout
      quantity: parseInt(it.quantity || 1, 10),
      customization: it.customization || null,
      isOnlineReserved: true,
    }));

    setCartItems(formatted);
    setCustomerName(order.customer_name || "Online Customer");
    setCustomerContact(order.customer_contact || "");
    setClaimedOnlineOrder(order);

    const isAlreadyPaid =
      order.payment_method?.toLowerCase().includes("gcash") ||
      order.payment_method?.toLowerCase().includes("card") ||
      order.payment_status === "Paid";

    if (isAlreadyPaid) {
      setPaymentMethod(order.payment_method || "GCash");
      setCashTendered(String(order.total || 0));
    } else {
      setPaymentMethod("Cash");
      setCashTendered("");
    }
  };

  const handleCancelOnlineClaim = () => {
    if (window.confirm("Detach online order reservation from register?")) {
      setClaimedOnlineOrder(null);
      setCartItems([]);
      setCashTendered("");
      setCustomerName("Walk-in Customer");
      setCustomerContact("");
    }
  };

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

  // Process Checkout & Place Counter Order (Walk-in or Online Pickup Claim)
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

      if (claimedOnlineOrder) {
        // ====================================================================
        // ONLINE PICKUP ORDER CLAIM FULFILLMENT
        // ====================================================================
        // Stock was already reserved/deducted at checkout; update online order to Completed
        const updateRes = await orderService.updateOrderStatus(claimedOnlineOrder.id, "Completed");

        const finalReceipt = {
          id: claimedOnlineOrder.id,
          created_at: claimedOnlineOrder.created_at || new Date().toLocaleString(),
          cashier: cashierName,
          customer_name: customerName,
          customer_contact: customerContact,
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
          ref_number: refNumber || claimedOnlineOrder.id,
          is_online_pickup: true,
          fulfillment_type: "Store Pickup Claim",
        };

        setCompletedOrder(finalReceipt);
        setShowReceiptModal(true);
        setCounterSalesToday((prev) => [finalReceipt, ...prev]);
        setClaimedOnlineOrder(null);
        loadData();
      } else {
        // ====================================================================
        // STANDARD WALK-IN OVER-THE-COUNTER SALE
        // ====================================================================
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
    setClaimedOnlineOrder(null);
    setCartItems([]);
    setCashTendered("");
    setRefNumber("");
    setCustomerName("Walk-in Customer");
    setCustomerContact("");
    setIsEditingCustomer(false);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // Trigger Receipt Print (Direct ESC/POS or 58mm/80mm clean print)
  const handlePrintReceipt = async (order = completedOrder) => {
    if (!order) return;
    try {
      await thermalPrinterService.printReceipt(order, printerConfig.paperSize);
    } catch (err) {
      console.warn("Print receipt error:", err);
      // Fallback
      window.print();
    }
  };

  // Auto-print receipt on sale completion if autoPrint is enabled
  useEffect(() => {
    if (showReceiptModal && completedOrder && printerConfig.autoPrint) {
      const timer = setTimeout(() => {
        handlePrintReceipt(completedOrder);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [showReceiptModal, completedOrder, printerConfig.autoPrint, printerConfig.paperSize, printerConfig.mode]);

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
          {/* Scan QR / Online Pickup Button */}
          <button
            type="button"
            className="pos-qr-scan-btn"
            onClick={handleOpenQRModal}
            title="Scan customer QR code or lookup online pickup order"
          >
            <span className="qr-scan-icon">📱</span>
            <span>Scan QR / Pickup</span>
            {onlinePickupOrders.length > 0 && (
              <span className="qr-pickup-count-badge">{onlinePickupOrders.length}</span>
            )}
          </button>

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
            className={`pos-printer-setup-btn ${printerConfig.mode === "bluetooth" && thermalPrinterService.isConnected() ? "bt-connected" : ""}`}
            onClick={() => setShowPrinterModal(true)}
            title="Configure Thermal Printer (GOOJPRT PT-210, Bluetooth, USB, Paper Size)"
          >
            <span className="printer-status-dot"></span>
            🖨️ {printerConfig.paperSize} {printerConfig.mode === "bluetooth" ? "• Bluetooth" : printerConfig.mode === "serial" ? "• USB" : "• Printer Setup"}
          </button>

          <button
            type="button"
            className={`pos-autoprint-btn ${printerConfig.autoPrint ? "active" : ""}`}
            onClick={() => handleUpdatePrinterConfig({ autoPrint: !printerConfig.autoPrint })}
            title={printerConfig.autoPrint ? "Auto-Print is ON: Receipt will print automatically after each completed sale" : "Auto-Print is OFF: Click to enable auto printing"}
          >
            <span className="autoprint-indicator"></span>
            ⚡ Auto-Print: <strong>{printerConfig.autoPrint ? "ON" : "OFF"}</strong>
          </button>

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

            {/* Online Pickup Reservation Badge Banner */}
            {claimedOnlineOrder && (
              <div className="pos-online-claim-banner">
                <div className="claim-banner-main">
                  <span className="claim-banner-icon">📦</span>
                  <div className="claim-banner-text">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong>ONLINE PICKUP RESERVATION</strong>
                      <span className="claim-status-badge">● {claimedOnlineOrder.status}</span>
                    </div>
                    <small>Order #{claimedOnlineOrder.id} • Customer: {claimedOnlineOrder.customer_name}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="cancel-claim-btn"
                  onClick={handleCancelOnlineClaim}
                  title="Detach online reservation"
                >
                  ✕ Release
                </button>
              </div>
            )}
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
              className={`pos-complete-sale-btn ${claimedOnlineOrder ? "online-claim-checkout" : ""}`}
              disabled={cartItems.length === 0 || isSubmitting || !isCashSufficient}
              onClick={handleCheckout}
            >
              {isSubmitting ? (
                <>
                  <span className="btn-spinner"></span> {claimedOnlineOrder ? "Fulfilling Online Pickup..." : "Processing Sale..."}
                </>
              ) : claimedOnlineOrder ? (
                <>
                  <span>✅ COMPLETE PICKUP CLAIM (₱{totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                  <span className="btn-sub-hint">Fulfill Reserved Order #{claimedOnlineOrder.id} & Print Receipt</span>
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
              <button
                type="button"
                className="print-receipt-btn"
                onClick={() => handlePrintReceipt(completedOrder)}
                title={`Print using ${printerConfig.paperSize} (${printerConfig.mode.toUpperCase()} mode)`}
              >
                🖨️ Print Receipt ({printerConfig.paperSize})
              </button>
              <button type="button" className="new-sale-btn" onClick={handleNewSale}>
                ✨ Next Customer / New Sale
              </button>
              <button
                type="button"
                className="receipt-setup-btn"
                onClick={() => setShowPrinterModal(true)}
                title="Configure GOOJPRT PT-210 or POS Thermal Printer"
              >
                ⚙️ Printer Setup
              </button>
              <button
                type="button"
                className={`receipt-autoprint-pill ${printerConfig.autoPrint ? "active" : ""}`}
                onClick={() => handleUpdatePrinterConfig({ autoPrint: !printerConfig.autoPrint })}
                title="Toggle automatic printing on checkout"
              >
                {printerConfig.autoPrint ? "✓ Auto-Print ON" : "✕ Auto-Print OFF"}
              </button>
              <button type="button" className="close-receipt-btn" onClick={handleNewSale} title="Close">
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
      {/* ====================================================================
          5. THERMAL PRINTER SETUP MODAL (GOOJPRT PT-210 / BLUETOOTH / USB / 58MM)
          ==================================================================== */}
      {showPrinterModal && (
        <div className="printer-modal-backdrop" onClick={() => setShowPrinterModal(false)}>
          <div className="printer-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="printer-modal-header">
              <div className="printer-modal-title">
                <span className="printer-modal-icon">🖨️</span>
                <div>
                  <h3>Thermal Receipt Printer Setup</h3>
                  <p>Configure GOOJPRT PT-210, MPT-II, POS-58, or standard POS thermal printer</p>
                </div>
              </div>
              <button className="close-printer-modal-btn" onClick={() => setShowPrinterModal(false)}>
                ✕
              </button>
            </div>

            <div className="printer-modal-body">
              {/* Paper Size Selection */}
              <div className="printer-setting-section">
                <label className="printer-setting-label">1. Paper Roll Size / Printer Model:</label>
                <div className="paper-size-grid">
                  <div
                    className={`paper-size-option ${printerConfig.paperSize === "58mm" ? "selected" : ""}`}
                    onClick={() => handleUpdatePrinterConfig({ paperSize: "58mm", printerName: "GOOJPRT PT-210 (58mm)" })}
                  >
                    <div className="option-header">
                      <strong>58mm Mini Thermal (GOOJPRT PT-210)</strong>
                      <span className="rec-tag">Recommended for PT-210</span>
                    </div>
                    <p>48mm printable width, 32 characters per line. Perfectly formatted for portable mini Bluetooth/USB printers without clipping.</p>
                  </div>

                  <div
                    className={`paper-size-option ${printerConfig.paperSize === "80mm" ? "selected" : ""}`}
                    onClick={() => handleUpdatePrinterConfig({ paperSize: "80mm", printerName: "Standard 80mm POS" })}
                  >
                    <div className="option-header">
                      <strong>80mm Full POS Thermal</strong>
                    </div>
                    <p>72mm printable width, 48 characters per line. For standard countertop thermal printers (Epson, Xprinter, Sunmi).</p>
                  </div>
                </div>
              </div>

              {/* Connection Mode */}
              <div className="printer-setting-section">
                <label className="printer-setting-label">2. Connection Method:</label>
                <div className="connection-mode-list">
                  {/* Bluetooth Direct */}
                  <div className={`conn-mode-card ${printerConfig.mode === "bluetooth" ? "active" : ""}`}>
                    <div className="conn-mode-top">
                      <span className="conn-icon">🔵</span>
                      <div className="conn-info">
                        <strong>Web Bluetooth Direct (Wireless PT-210)</strong>
                        <p>Send raw ESC/POS commands directly to PT-210 over Bluetooth. Fast, clean & driverless!</p>
                      </div>
                      <button
                        type="button"
                        className="conn-action-btn bt-btn"
                        disabled={isConnectingPrinter}
                        onClick={handleConnectBluetooth}
                      >
                        {isConnectingPrinter ? "Connecting..." : "Pair / Connect PT-210"}
                      </button>
                    </div>
                    {printerConfig.mode === "bluetooth" && (
                      <div className="conn-active-tag">
                        ✓ Active Mode: {printerConfig.printerName || "GOOJPRT PT-210 (Bluetooth)"}
                      </div>
                    )}
                  </div>

                  {/* USB Cable Direct */}
                  <div className={`conn-mode-card ${printerConfig.mode === "serial" ? "active" : ""}`}>
                    <div className="conn-mode-top">
                      <span className="conn-icon">🔌</span>
                      <div className="conn-info">
                        <strong>USB Cable Direct (Web Serial / COM Port)</strong>
                        <p>Connect PT-210 with USB cable directly to PC USB port without spooler.</p>
                      </div>
                      <button
                        type="button"
                        className="conn-action-btn serial-btn"
                        disabled={isConnectingPrinter}
                        onClick={handleConnectSerial}
                      >
                        {isConnectingPrinter ? "Selecting..." : "Select USB Port"}
                      </button>
                    </div>
                    {printerConfig.mode === "serial" && (
                      <div className="conn-active-tag">
                        ✓ Active Mode: USB Serial
                      </div>
                    )}
                  </div>

                  {/* Browser Print Driver */}
                  <div className={`conn-mode-card ${printerConfig.mode === "browser" ? "active" : ""}`}>
                    <div className="conn-mode-top">
                      <span className="conn-icon">🖨️</span>
                      <div className="conn-info">
                        <strong>Windows Print Driver (POS-58 Driver)</strong>
                        <p>Uses Windows system printing with dedicated 58mm / 80mm layout.</p>
                      </div>
                      <button
                        type="button"
                        className="conn-action-btn browser-btn"
                        onClick={() => handleUpdatePrinterConfig({ mode: "browser" })}
                      >
                        Use Driver
                      </button>
                    </div>
                    {printerConfig.mode === "browser" && (
                      <div className="conn-active-tag">
                        ✓ Active Mode: 58mm Clean System Print
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Auto Print Setting */}
              <div className="printer-setting-section">
                <div className="printer-toggle-row">
                  <div>
                    <strong>Automatic Printing on Sale Completion</strong>
                    <p>Immediately trigger printer when "Complete Sale" is processed</p>
                  </div>
                  <label className="printer-switch">
                    <input
                      type="checkbox"
                      checked={printerConfig.autoPrint}
                      onChange={(e) => handleUpdatePrinterConfig({ autoPrint: e.target.checked })}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              {/* Quick PT-210 Guide */}
              <div className="pt210-guide-box">
                <strong>💡 GOOJPRT PT-210 Quick Checklist:</strong>
                <ul>
                  <li><strong>Power On:</strong> Hold Power button for 2 seconds until the green LED turns on.</li>
                  <li><strong>Paper Roll:</strong> Ensure thermal paper is 58mm with the smooth thermal side facing up toward the heating element.</li>
                  <li><strong>Bluetooth Pairing:</strong> If connecting via Windows Bluetooth, pair device named "PT-210" or "POS-58" (Default PIN: <code>0000</code> or <code>1234</code>).</li>
                </ul>
              </div>
            </div>

            <div className="printer-modal-footer">
              <button
                type="button"
                className="test-print-btn"
                disabled={isTestingPrint}
                onClick={handleTestPrint}
              >
                {isTestingPrint ? "Testing..." : "📄 Print Test Receipt to PT-210"}
              </button>
              <button
                type="button"
                className="save-printer-btn"
                onClick={() => setShowPrinterModal(false)}
              >
                ✓ Done & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          6. QR CODE SCANNER & ONLINE PICKUP CLAIM MODAL
          ==================================================================== */}
      {showQRModal && (
        <div className="pos-modal-backdrop" onClick={handleCloseQRModal}>
          <div className="pos-qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pos-qr-modal-header">
              <div className="qr-title-group">
                <span className="qr-header-icon">📱</span>
                <div>
                  <h3>Scan QR / Claim Online Order</h3>
                  <p>Scan the customer's QR code or select an active online pickup reservation</p>
                </div>
              </div>
              <button type="button" className="close-qr-modal-btn" onClick={handleCloseQRModal}>✕</button>
            </div>

            {/* Mode Tabs */}
            <div className="pos-qr-tabs">
              <button
                type="button"
                className={`pos-qr-tab ${qrModalTab === "input" ? "active" : ""}`}
                onClick={() => {
                  stopCameraStream();
                  setQrModalTab("input");
                  setTimeout(() => qrInputRef.current?.focus(), 150);
                }}
              >
                <span>⌨️ Barcode Gun / ID Input</span>
              </button>
              <button
                type="button"
                className={`pos-qr-tab ${qrModalTab === "camera" ? "active" : ""}`}
                onClick={() => {
                  setQrModalTab("camera");
                  handleStartCamera();
                }}
              >
                <span>📷 Camera Viewfinder</span>
              </button>
              <button
                type="button"
                className={`pos-qr-tab ${qrModalTab === "list" ? "active" : ""}`}
                onClick={() => {
                  stopCameraStream();
                  setQrModalTab("list");
                }}
              >
                <span>📋 Active Pickups ({onlinePickupOrders.length})</span>
              </button>
            </div>

            {/* Tab 1: Fast Barcode Gun / Manual ID Input */}
            {qrModalTab === "input" && (
              <form
                className="pos-qr-input-pane"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessQRCode(qrInputCode);
                }}
              >
                <div className="gun-instructions">
                  <span className="gun-icon">🔫</span>
                  <p>
                    <strong>2D Barcode / QR Scanner Gun Ready!</strong> Point your handheld scanner at the customer's phone QR code, or type/paste the Order Number below:
                  </p>
                </div>

                <div className="qr-input-row">
                  <input
                    ref={qrInputRef}
                    type="text"
                    placeholder="e.g. #BH-6AA532B666 or paste QR URL..."
                    value={qrInputCode}
                    onChange={(e) => setQrInputCode(e.target.value)}
                    className="pos-qr-text-input"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="pos-qr-submit-btn"
                    disabled={!qrInputCode.trim() || isProcessingQR}
                  >
                    {isProcessingQR ? "Searching..." : "⚡ Load Order"}
                  </button>
                </div>

                {qrScanError && (
                  <div className="pos-qr-error-box">
                    ⚠️ {qrScanError}
                  </div>
                )}

                {/* Quick Clickable Suggestions from Recent Pickups */}
                {onlinePickupOrders.length > 0 && (
                  <div className="qr-quick-suggestions">
                    <span className="suggestions-label">Ready for Pickup Right Now:</span>
                    <div className="suggestion-chips">
                      {onlinePickupOrders.slice(0, 4).map((ord) => (
                        <button
                          key={ord.id}
                          type="button"
                          className="suggestion-chip"
                          onClick={() => handleProcessQRCode(ord.id)}
                        >
                          <span>#{ord.id}</span>
                          <small>{ord.customer_name} (₱{parseFloat(ord.total || 0).toLocaleString()})</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* Tab 2: Live Camera Viewfinder */}
            {qrModalTab === "camera" && (
              <div className="pos-qr-camera-pane">
                <div className="camera-viewfinder-wrapper">
                  <video ref={videoRef} className="camera-video" playsInline muted></video>
                  <div className="viewfinder-reticle">
                    <div className="reticle-corner top-left"></div>
                    <div className="reticle-corner top-right"></div>
                    <div className="reticle-corner bottom-left"></div>
                    <div className="reticle-corner bottom-right"></div>
                    <div className="scanning-laser-line"></div>
                  </div>
                </div>
                <p className="camera-hint">
                  Align customer's QR code within the scanning square.
                </p>
                {qrScanError && <div className="pos-qr-error-box">⚠️ {qrScanError}</div>}
              </div>
            )}

            {/* Tab 3: Active Pickups List */}
            {qrModalTab === "list" && (
              <div className="pos-qr-list-pane">
                {onlinePickupOrders.length === 0 ? (
                  <div className="no-pickups-msg">
                    <span>🎉</span>
                    <p>No active online pickup orders waiting right now.</p>
                  </div>
                ) : (
                  <div className="pickup-orders-scroll-list">
                    {onlinePickupOrders.map((ord) => (
                      <div key={ord.id} className="pickup-order-item">
                        <div className="pickup-item-info">
                          <div className="pickup-id-row">
                            <strong>#{ord.id}</strong>
                            <span className={`pickup-status-pill ${ord.status === "Ready for Pickup" ? "ready" : "pending"}`}>
                              ● {ord.status}
                            </span>
                          </div>
                          <span className="pickup-cust">👤 {ord.customer_name} • 📞 {ord.customer_contact}</span>
                          <small className="pickup-items-summary">
                            {(ord.items || []).map((i) => `${i.quantity}x ${i.product_name || i.name}`).join(", ")}
                          </small>
                        </div>

                        <div className="pickup-item-action">
                          <strong className="pickup-price">₱{parseFloat(ord.total || 0).toLocaleString()}</strong>
                          <button
                            type="button"
                            className="load-pickup-to-pos-btn"
                            onClick={() => {
                              loadOnlineOrderToRegister(ord);
                              handleCloseQRModal();
                            }}
                          >
                            📥 Load to POS
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
