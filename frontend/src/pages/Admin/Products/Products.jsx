/**
 * ============================================================================
 * BAKE HOUSE - Admin Products & Inventory Management Component
 * ============================================================================
 * Features:
 * 1. Full CRUD management with local file upload for photos.
 * 2. Expiration Date tracking with First-Expired, First-Out (FEFO) alerts.
 * 3. Proactive Admin Expiration Notification banner for expired/near-expiry goods.
 * 4. Confirmation modal to confirm expiration and immediately remove expired stock.
 * ============================================================================
 */

import { useState, useEffect, useMemo } from "react";
import "./Products.css";
import { productService } from "../../../services/productService";

function Products() {
  // --------------------------------------------------------------------------
  // 1. STATE VARIABLES
  // --------------------------------------------------------------------------
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ text: "", isError: false });

  // Search, Filter & Sort controls
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("fefo"); // Default to First Expired, First Out

  // Modal Visibility and Edit Mode tracker
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form input states
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Cake");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("20");
  const [formStatus, setFormStatus] = useState("Available");
  const [formExpirationDate, setFormExpirationDate] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBestseller, setFormBestseller] = useState(false);

  // File Upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [existingImage, setExistingImage] = useState("");

  // Confirm Expiration Modal state
  const [productToConfirmExpire, setProductToConfirmExpire] = useState(null);
  const [isConfirmingExpire, setIsConfirmingExpire] = useState(false);

  // --------------------------------------------------------------------------
  // 2. DATA FETCHING (READ OPERATION)
  // --------------------------------------------------------------------------
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productService.getProducts();
      if (res && res.products) {
        setProducts(res.products);
      }
    } catch (err) {
      console.error("Failed to load products from API:", err);
      setFeedback({
        text: "Could not connect to database. Make sure PHP server is running on port 8000.",
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Auto-hide feedback after 5 seconds
  useEffect(() => {
    if (feedback.text) {
      const timer = setTimeout(() => {
        setFeedback({ text: "", isError: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback.text]);

  // --------------------------------------------------------------------------
  // 3. EXCLUSIVITY & EXPIRATION (FEFO) LOGIC
  // --------------------------------------------------------------------------
  const getExpiryInfo = (product) => {
    if (!product.expiration_date) {
      return { status: "no-date", label: "No Date Set", days: null };
    }
    const exp = new Date(product.expiration_date + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - now.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: "expired",
        label: `Expired (${Math.abs(diffDays)}d ago)`,
        days: diffDays,
        isExpired: true,
      };
    }
    if (diffDays === 0) {
      return {
        status: "expires-today",
        label: "Expires Today",
        days: 0,
        isExpiringSoon: true,
      };
    }
    if (diffDays <= 3) {
      return {
        status: "expiring-soon",
        label: `Expires in ${diffDays}d`,
        days: diffDays,
        isExpiringSoon: true,
      };
    }
    return {
      status: "fresh",
      label: `Fresh (${diffDays}d)`,
      days: diffDays,
    };
  };

  // --------------------------------------------------------------------------
  // 4. MODAL & FILE PICKER HANDLERS
  // --------------------------------------------------------------------------
  const openAddModal = () => {
    setEditingProduct(null);
    setFormName("");
    setFormCategory("Cake");
    setFormPrice("");
    setFormStock("20");
    setFormStatus("Available");
    setFormExpirationDate("");
    setFormDescription("");
    setFormBestseller(false);
    setSelectedFile(null);
    setImagePreview("");
    setExistingImage("");
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(product.price.toString());
    setFormStock(product.stock.toString());
    setFormStatus(product.status || "Available");
    setFormExpirationDate(product.expiration_date || "");
    setFormDescription(product.description || "");
    setFormBestseller(Boolean(product.bestseller));
    setSelectedFile(null);
    setExistingImage(product.image || "");
    setImagePreview(product.image || "");
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Selected image is larger than 10MB. Please choose a smaller file.");
        return;
      }
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setSelectedFile(null);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();

    if (!formName.trim() || !formPrice) {
      alert("Please provide a product name and valid price.");
      return;
    }

    try {
      setIsSubmitting(true);
      let finalImagePath = existingImage;

      if (selectedFile) {
        const uploadRes = await productService.uploadProductImage(selectedFile);
        if (uploadRes && uploadRes.image_url) {
          finalImagePath = uploadRes.image_url;
        }
      }

      if (!finalImagePath) {
        finalImagePath = "/uploads/productimg/chocolate_cake.jpg";
      }

      const payload = {
        name: formName.trim(),
        category: formCategory,
        price: parseFloat(formPrice),
        stock: parseInt(formStock || 0),
        status: formStatus,
        expiration_date: formExpirationDate || null,
        description: formDescription.trim(),
        image: finalImagePath,
        bestseller: formBestseller,
      };

      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, payload);
        setFeedback({ text: `Product "${payload.name}" updated successfully!`, isError: false });
      } else {
        await productService.createProduct(payload);
        setFeedback({ text: `Product "${payload.name}" added to catalog!`, isError: false });
      }

      closeModal();
      fetchProducts();
    } catch (err) {
      alert("Error saving product: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // 5. DELETE OPERATION
  // --------------------------------------------------------------------------
  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from the database?`)) {
      try {
        await productService.deleteProduct(id);
        setFeedback({ text: `Product "${name}" deleted from database.`, isError: false });
        fetchProducts();
      } catch (err) {
        alert("Failed to delete product: " + err.message);
      }
    }
  };

  // --------------------------------------------------------------------------
  // 6. CONFIRM EXPIRATION OPERATION (Write-off stock)
  // --------------------------------------------------------------------------
  const handleConfirmExpiration = async () => {
    if (!productToConfirmExpire) return;
    try {
      setIsConfirmingExpire(true);
      const res = await productService.confirmExpired(productToConfirmExpire.id);
      setFeedback({
        text: res?.message || `Expired stock for "${productToConfirmExpire.name}" removed from active inventory.`,
        isError: false,
      });
      setProductToConfirmExpire(null);
      fetchProducts();
    } catch (err) {
      alert("Failed to confirm product expiration: " + err.message);
    } finally {
      setIsConfirmingExpire(false);
    }
  };

  // --------------------------------------------------------------------------
  // 7. FILTER & SORT DATA PIPELINE
  // --------------------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // Search
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm.trim() ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));

      // Category
      const matchesCategory =
        categoryFilter === "all" ||
        p.category.toLowerCase() === categoryFilter.toLowerCase();

      // Status & Expiry Filter
      const expiry = getExpiryInfo(p);
      let matchesStatus = true;
      if (statusFilter === "available") {
        matchesStatus = p.status.toLowerCase() === "available";
      } else if (statusFilter === "low-stock") {
        matchesStatus = p.status.toLowerCase() === "low stock";
      } else if (statusFilter === "out-of-stock") {
        matchesStatus = p.status.toLowerCase() === "out of stock";
      } else if (statusFilter === "expired") {
        matchesStatus = expiry.isExpired || p.status.toLowerCase() === "expired";
      } else if (statusFilter === "expiring-soon") {
        matchesStatus = Boolean(expiry.isExpiringSoon);
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sorting
    if (sortBy === "fefo") {
      // First Expired, First Out
      result.sort((a, b) => {
        if (!a.expiration_date && !b.expiration_date) return a.id - b.id;
        if (!a.expiration_date) return 1;
        if (!b.expiration_date) return -1;
        return new Date(a.expiration_date) - new Date(b.expiration_date);
      });
    } else if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "price-low") {
      result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (sortBy === "stock-low") {
      result.sort((a, b) => a.stock - b.stock);
    }

    return result;
  }, [products, searchTerm, categoryFilter, statusFilter, sortBy]);

  // Metric counts
  const totalProducts = products.length;
  const availableCount = products.filter((p) => p.status && p.status.toLowerCase() === "available").length;
  const lowStockCount = products.filter((p) => p.status && p.status.toLowerCase() === "low stock").length;
  const outOfStockCount = products.filter((p) => p.status && (p.status.toLowerCase() === "out of stock" || p.status.toLowerCase() === "expired")).length;

  // Active items with expiration alert (expired or near expiry with stock > 0)
  const expiredItemsWithStock = products.filter((p) => {
    const expiry = getExpiryInfo(p);
    return expiry.isExpired && p.stock > 0;
  });

  const expiringSoonItemsWithStock = products.filter((p) => {
    const expiry = getExpiryInfo(p);
    return expiry.isExpiringSoon && !expiry.isExpired && p.stock > 0;
  });

  const totalExpirationAlerts = expiredItemsWithStock.length + expiringSoonItemsWithStock.length;

  return (
    <div className="products-page">
      {/* Feedback Toast */}
      {feedback.text && (
        <div className={`feedback-banner ${feedback.isError ? "error" : "success"}`}>
          <span>{feedback.isError ? "⚠️" : "✅"}</span>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback({ text: "", isError: false })}>✕</button>
        </div>
      )}

      {/* Header */}
      <div className="products-header">
        <div>
          <h1>Products &amp; Inventory Management</h1>
          <p>Manage your bakery catalog, prices, live stock, and First-Expired First-Out (FEFO) expiration tracking.</p>
        </div>

        <button className="add-product-btn" onClick={openAddModal}>
          + Add New Product
        </button>
      </div>

      {/* FEFO Expiration Alert Notification Banner for Admin */}
      {totalExpirationAlerts > 0 && (
        <div className="fefo-expiration-alert-banner">
          <div className="alert-left">
            <span className="alert-icon">⚠️</span>
            <div className="alert-text">
              <strong>FEFO Expiration Alert: {expiredItemsWithStock.length > 0 ? `${expiredItemsWithStock.length} product(s) expired` : ""} {expiredItemsWithStock.length > 0 && expiringSoonItemsWithStock.length > 0 ? " and " : ""} {expiringSoonItemsWithStock.length > 0 ? `${expiringSoonItemsWithStock.length} expiring soon` : ""}</strong>
              <p>Items currently in active stock have passed or are nearing their shelf life. Confirm expiration to write off stock and keep store catalog fresh.</p>
            </div>
          </div>
          <button
            type="button"
            className="alert-action-btn"
            onClick={() => setStatusFilter(expiredItemsWithStock.length > 0 ? "expired" : "expiring-soon")}
          >
            Review Expired Items →
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="product-summary">
        <div className="product-summary-card">
          <span>Total Products</span>
          <strong>{totalProducts}</strong>
        </div>

        <div className="product-summary-card">
          <span>Available</span>
          <strong style={{ color: "#10B981" }}>{availableCount}</strong>
        </div>

        <div className="product-summary-card">
          <span>Low Stock</span>
          <strong style={{ color: "#F59E0B" }}>{lowStockCount}</strong>
        </div>

        <div className="product-summary-card">
          <span>Out of Stock</span>
          <strong style={{ color: "#EF4444" }}>{outOfStockCount}</strong>
        </div>

        <div
          className={`product-summary-card expiry-kpi ${totalExpirationAlerts > 0 ? "has-alerts" : ""}`}
          onClick={() => setStatusFilter(expiredItemsWithStock.length > 0 ? "expired" : "expiring-soon")}
          title="Filter products needing expiration review"
        >
          <span>Expired / Near Expiry</span>
          <strong style={{ color: totalExpirationAlerts > 0 ? "#DC2626" : "#6B5E54" }}>
            {totalExpirationAlerts}
          </strong>
        </div>
      </div>

      {/* Main Products Panel */}
      <div className="products-panel">
        {/* Tools */}
        <div className="products-tools">
          <input
            type="text"
            placeholder="Search product name, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="cake">Cakes</option>
            <option value="bread">Breads</option>
            <option value="pastry">Pastries</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
            <option value="expired">🔴 Expired Goods</option>
            <option value="expiring-soon">🟡 Expiring Soon (3d)</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="fefo">⏳ First to Expire (FEFO)</option>
            <option value="name">Name (A-Z)</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="stock-low">Stock Level (Lowest)</option>
          </select>
        </div>

        {/* Products Table */}
        <div className="products-table">
          <div className="products-table-header">
            <span>Product</span>
            <span>Category</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Expiration (FEFO)</span>
            <span>Status</span>
            <span style={{ textAlign: "right" }}>Action</span>
          </div>

          {loading ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#888" }}>
              <h3>Loading bakery products from database...</h3>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#888" }}>
              <h3>No products found matching your search criteria.</h3>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const expiry = getExpiryInfo(product);
              const needsExpirationAction = expiry.isExpired && product.stock > 0;

              return (
                <div className="products-table-row" key={product.id}>
                  {/* 1. Product Picture Thumbnail */}
                  <div className="product-name">
                    <div className="product-image-box">
                      <img
                        src={product.image || "/uploads/productimg/chocolate_cake.jpg"}
                        alt={product.name}
                        className="product-table-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500";
                        }}
                      />
                    </div>

                    <div className="product-name-info">
                      <strong>{product.name}</strong>
                      {product.bestseller && (
                        <span className="bestseller-tag">
                          ⭐ Bestseller
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2. Category */}
                  <span>{product.category}</span>

                  {/* 3. Price */}
                  <span>₱{parseFloat(product.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>

                  {/* 4. Stock */}
                  <span>
                    <strong>{product.stock}</strong>
                  </span>

                  {/* 5. Expiration (FEFO) */}
                  <div className="product-expiry-col">
                    <span className="expiry-date-label">
                      {product.expiration_date || "No Date"}
                    </span>
                    <span className={`expiry-badge ${expiry.status}`}>
                      {expiry.label}
                    </span>
                  </div>

                  {/* 6. Status */}
                  <span>
                    <span className={`product-status ${(product.status || "available").toLowerCase().replace(/\s+/g, "-")}`}>
                      {product.status}
                    </span>
                  </span>

                  {/* 7. Action */}
                  <div className="product-actions" style={{ justifyContent: "flex-end" }}>
                    {needsExpirationAction && (
                      <button
                        type="button"
                        className="discard-expired-btn"
                        onClick={() => setProductToConfirmExpire(product)}
                        title="Confirm expiration and remove stock"
                      >
                        ⚠️ Discard
                      </button>
                    )}

                    <button className="edit-btn" onClick={() => openEditModal(product)}>
                      Edit
                    </button>

                    <button className="delete-btn" onClick={() => handleDeleteProduct(product.id, product.name)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------
          ADD / EDIT MODAL WITH EXPIRATION DATE INPUT
      -------------------------------------------------------------------- */}
      {showModal && (
        <div className="product-modal-backdrop" onClick={closeModal}>
          <div className="product-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="product-modal-header">
              <div>
                <h2>{editingProduct ? "Edit Bakery Product" : "Add New Bakery Product"}</h2>
                <p>Upload a product image, configure pricing, inventory, and FEFO expiration date.</p>
              </div>
              <button className="product-modal-close" onClick={closeModal} title="Close">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="product-modal-form">
              {/* Product Name */}
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Strawberry Shortcake"
                  required
                />
              </div>

              {/* Category & Price */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    <option value="Cake">Cake</option>
                    <option value="Pastry">Pastry</option>
                    <option value="Bread">Bread</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Price (PHP ₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 650.00"
                    required
                  />
                </div>
              </div>

              {/* Stock, Status & Expiration Date */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Initial Stock (Units) *</label>
                  <input
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={(e) => {
                      const val = parseInt(e.target.value || 0);
                      setFormStock(e.target.value);
                      if (val <= 0) setFormStatus("Out of Stock");
                      else if (val <= 5) setFormStatus("Low Stock");
                      else setFormStatus("Available");
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Status *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option value="Available">Available</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
              </div>

              {/* Expiration Date Input (FEFO Tracking) */}
              <div className="form-group">
                <label>Expiration / Best-Before Date (FEFO Tracking)</label>
                <input
                  type="date"
                  value={formExpirationDate}
                  onChange={(e) => setFormExpirationDate(e.target.value)}
                />
                <small style={{ color: "#7A695B", fontSize: "0.82rem", marginTop: "4px", display: "block" }}>
                  Used for FEFO (First-Expired, First-Out) inventory warnings and auto-expiry alerts.
                </small>
              </div>

              {/* File Upload */}
              <div className="form-group">
                <label>Product Image (Upload File)</label>
                <div className="file-upload-box">
                  <input
                    type="file"
                    id="product-file-input"
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/jfif"
                    onChange={handleFileChange}
                    className="file-input-hidden"
                  />
                  <label htmlFor="product-file-input" className="file-upload-btn">
                    📁 Choose Image File
                  </label>

                  <span className="file-name-text">
                    {selectedFile ? selectedFile.name : existingImage ? "Current image active" : "No file chosen (JPG, PNG, WEBP)"}
                  </span>

                  {/* Live Preview Box */}
                  {imagePreview && (
                    <div className="file-preview-thumbnail">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bestseller Checkbox */}
              <div className="form-group-checkbox">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={formBestseller}
                    onChange={(e) => setFormBestseller(e.target.checked)}
                  />
                  <span className="checkbox-label">⭐ Feature as Best Seller on Menu &amp; Home</span>
                </label>
              </div>

              {/* Description */}
              <div className="form-group">
                <label>Product Description</label>
                <textarea
                  rows="3"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the flavors, texture, or ingredients..."
                />
              </div>

              {/* Form Buttons */}
              <div className="product-modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={isSubmitting}>
                  {isSubmitting ? "Saving to Database..." : editingProduct ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          CONFIRM EXPIRATION & DISPOSAL MODAL
      -------------------------------------------------------------------- */}
      {productToConfirmExpire && (
        <div className="product-modal-backdrop" onClick={() => setProductToConfirmExpire(null)}>
          <div className="confirm-expire-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-expire-icon-circle">
              <span style={{ fontSize: "28px" }}>⚠️</span>
            </div>

            <h2>Confirm Product Expiration</h2>
            <p className="confirm-expire-desc">
              Are you sure you want to confirm that <strong>"{productToConfirmExpire.name}"</strong> has expired?
            </p>

            <div className="confirm-expire-item-box">
              <img
                src={productToConfirmExpire.image || "/uploads/productimg/chocolate_cake.jpg"}
                alt={productToConfirmExpire.name}
                className="confirm-expire-thumb"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500";
                }}
              />
              <div className="confirm-expire-info">
                <h3>{productToConfirmExpire.name}</h3>
                <p>Current Active Stock: <strong style={{ color: "#DC2626" }}>{productToConfirmExpire.stock} unit(s)</strong></p>
                <p>Expiration Date: <strong>{productToConfirmExpire.expiration_date || "Past"}</strong></p>
              </div>
            </div>

            <div className="confirm-expire-warning-note">
              🚨 <strong>Action Result:</strong> All <strong>{productToConfirmExpire.stock}</strong> unit(s) will be automatically removed from active inventory (stock set to 0) and the status will be marked as <strong>Expired</strong> so customers cannot purchase spoiled goods.
            </div>

            <div className="confirm-expire-actions">
              <button
                type="button"
                className="btn-cancel-expire"
                onClick={() => setProductToConfirmExpire(null)}
                disabled={isConfirmingExpire}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-confirm-discard"
                onClick={handleConfirmExpiration}
                disabled={isConfirmingExpire}
              >
                {isConfirmingExpire ? "Writing Off Stock..." : "Yes, Confirm Expired & Remove Stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;