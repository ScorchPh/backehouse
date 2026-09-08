/**
 * ============================================================================
 * BAKE HOUSE - Admin Products & Inventory Management Component
 * ============================================================================
 * Capstone Project Explanation:
 * This component provides full CRUD (Create, Read, Update, Delete) management
 * with local file uploading for product photos:
 * 
 * 1. File Uploading: Allows choosing image files from the computer directly,
 *    uploading them to backend/uploads/productimg/ via /api/products/upload_image.php.
 * 2. Instant Image Preview: Uses URL.createObjectURL() for immediate local feedback.
 * 3. Database Sync: Stores clean relative paths (/uploads/productimg/filename.jpg)
 *    in the backend database.
 * ============================================================================
 */

import { useState, useEffect } from "react";
import "./Products.css";
import { productService } from "../../../services/productService";

function Products() {
  // --------------------------------------------------------------------------
  // 1. STATE VARIABLES
  // --------------------------------------------------------------------------
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ text: "", isError: false });

  // Search & Filter controls
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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
  const [formDescription, setFormDescription] = useState("");
  const [formBestseller, setFormBestseller] = useState(false);

  // File Upload states
  const [selectedFile, setSelectedFile] = useState(null); // Newly selected File object
  const [imagePreview, setImagePreview] = useState("");   // Preview URL
  const [existingImage, setExistingImage] = useState(""); // Current image path for edit mode

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

  // --------------------------------------------------------------------------
  // AUTO-HIDE NOTIFICATION TIMER (5 SECONDS)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (feedback.text) {
      const timer = setTimeout(() => {
        setFeedback({ text: "", isError: false });
      }, 5000);
      return () => clearTimeout(timer); // Clear timeout if new feedback arrives
    }
  }, [feedback.text]);

  // --------------------------------------------------------------------------
  // 3. MODAL & FILE PICKER HANDLERS
  // --------------------------------------------------------------------------
  /**
   * Opens the modal in "Add Product" mode
   */
  const openAddModal = () => {
    setEditingProduct(null);
    setFormName("");
    setFormCategory("Cake");
    setFormPrice("");
    setFormStock("20");
    setFormStatus("Available");
    setFormDescription("");
    setFormBestseller(false);
    setSelectedFile(null);
    setImagePreview("");
    setExistingImage("");
    setFeedback({ text: "", isError: false });
    setShowModal(true);
  };

  /**
   * Opens the modal in "Edit Product" mode pre-filled with data
   */
  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(product.price.toString());
    setFormStock(product.stock.toString());
    setFormStatus(product.status || "Available");
    setFormDescription(product.description || "");
    setFormBestseller(Boolean(product.bestseller));
    setSelectedFile(null);
    setExistingImage(product.image || "");
    setImagePreview(product.image || "");
    setFeedback({ text: "", isError: false });
    setShowModal(true);
  };

  /**
   * Handles user selecting a file from their local computer
   */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert("Selected image is larger than 10MB. Please choose a smaller file.");
        return;
      }
      setSelectedFile(file);
      // Create local object URL for instant preview without uploading yet
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setSelectedFile(null);
  };

  /**
   * Handles saving the product:
   * 1. Uploads file to backend/uploads/productimg/ if a new file was chosen.
   * 2. Saves or updates the product record in the database.
   */
  const handleSaveProduct = async (e) => {
    e.preventDefault();

    if (!formName.trim() || !formPrice) {
      alert("Please provide a product name and valid price.");
      return;
    }

    try {
      setIsSubmitting(true);
      let finalImagePath = existingImage;

      // If user selected a new image file, upload it first to the backend
      if (selectedFile) {
        const uploadRes = await productService.uploadProductImage(selectedFile);
        if (uploadRes && uploadRes.image_url) {
          finalImagePath = uploadRes.image_url;
        }
      }

      // Default placeholder if none exists
      if (!finalImagePath) {
        finalImagePath = "/uploads/productimg/chocolate_cake.jpg";
      }

      const payload = {
        name: formName.trim(),
        category: formCategory,
        price: parseFloat(formPrice),
        stock: parseInt(formStock || 0),
        status: formStatus,
        description: formDescription.trim(),
        image: finalImagePath,
        bestseller: formBestseller,
      };

      if (editingProduct) {
        // UPDATE API call
        await productService.updateProduct(editingProduct.id, payload);
        setFeedback({ text: `Product "${payload.name}" updated successfully!`, isError: false });
      } else {
        // CREATE API call
        await productService.createProduct(payload);
        setFeedback({ text: `Product "${payload.name}" added to catalog!`, isError: false });
      }

      closeModal();
      fetchProducts(); // Refresh the table
    } catch (err) {
      alert("Error saving product: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // 4. DELETE OPERATION
  // --------------------------------------------------------------------------
  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from the database?`)) {
      try {
        await productService.deleteProduct(id);
        setFeedback({ text: `Product "${name}" deleted.`, isError: false });
        fetchProducts();
      } catch (err) {
        alert("Failed to delete product: " + err.message);
      }
    }
  };

  // --------------------------------------------------------------------------
  // 5. FILTERING & SEARCH LOGIC
  // --------------------------------------------------------------------------
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      categoryFilter === "all" || p.category.toLowerCase() === categoryFilter.toLowerCase();

    const matchesStatus =
      statusFilter === "all" ||
      p.status.toLowerCase().replace(" ", "-") === statusFilter.toLowerCase().replace(" ", "-");

    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  const totalCount = products.length;
  const availableCount = products.filter((p) => (p.status || "").toLowerCase() === "available" && p.stock > 5).length;
  const lowStockCount = products.filter((p) => (p.status || "").toLowerCase() === "low stock" || (p.stock > 0 && p.stock <= 5)).length;
  const outOfStockCount = products.filter((p) => (p.status || "").toLowerCase() === "out of stock" || p.stock <= 0).length;

  return (
    <div className="products-page">
      {/* Header */}
      <div className="products-header">
        <div>
          <h1>Products & Inventory Management</h1>
          <p>Manage your bakery catalog, prices, and live stock inventory.</p>
        </div>

        <button className="add-product-btn" onClick={openAddModal}>
          + Add New Product
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback.text && (
        <div className="products-toast-feedback">
          <span>{feedback.isError ? "⚠️ " : "✅ "} {feedback.text}</span>
          <button onClick={() => setFeedback({ text: "", isError: false })}>✕</button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="product-summary">
        <div className="product-summary-card">
          <span>Total Products</span>
          <strong>{totalCount}</strong>
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
          </select>
        </div>

        {/* Products Table */}
        <div className="products-table">
          <div className="products-table-header">
            <span>Product</span>
            <span>Category</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Status</span>
            <span>Action</span>
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
            filteredProducts.map((product) => (
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
                <span><strong>{product.stock}</strong></span>

                {/* 5. Status */}
                <span>
                  <span className={`product-status ${product.status.toLowerCase().replace(" ", "-")}`}>
                    {product.status}
                  </span>
                </span>

                {/* 6. Action */}
                <div className="product-actions">
                  <button className="edit-btn" onClick={() => openEditModal(product)}>
                    Edit
                  </button>

                  <button className="delete-btn" onClick={() => handleDeleteProduct(product.id, product.name)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------
          MODAL WITH FILE UPLOAD ("CHOOSE FILE")
      -------------------------------------------------------------------- */}
      {showModal && (
        <div className="product-modal-backdrop" onClick={closeModal}>
          <div className="product-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="product-modal-header">
              <div>
                <h2>{editingProduct ? "Edit Bakery Product" : "Add New Bakery Product"}</h2>
                <p>Upload a product image and configure pricing & inventory.</p>
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
                  <label>Price (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 650.00"
                    required
                  />
                </div>
              </div>

              {/* Stock Quantity & Status */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Stock Quantity *</label>
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
                  </select>
                </div>
              </div>

              {/* File Upload ("Choose File" with live preview) */}
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
                  <span className="checkbox-label">⭐ Feature as Best Seller on Menu & Home</span>
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
                ></textarea>
              </div>

              {/* Actions */}
              <div className="modal-actions-row">
                <button type="button" className="modal-cancel-btn" onClick={closeModal}>
                  Cancel
                </button>

                <button type="submit" className="modal-submit-btn" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Uploading & Saving..."
                    : editingProduct
                    ? "Save Changes"
                    : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;