/**
 * ============================================================================
 * BAKE HOUSE - Cake Customizer Options Manager (Admin Portal)
 * ============================================================================
 * Features:
 * 1. Complete Custom Cake Management:
 *    - 📏 Cake Sizes & Base Pricing rules
 *    - 🍫 Flavors & Extra Flavor Fees
 *    - 📐 Cake Shapes & Multi-tier Options
 *    - 🎨 Frosting Colors (Interactive Color Swatch & Hex Picker)
 *    - 🎉 Occasions & Event Categories
 *    - ⚙️ Base Starting Price & Advance Notice Days
 * 2. Real-Time Interactive Customer Preview:
 *    - Simulates the exact storefront customer builder (/personalize)
 *    - Live price calculation feedback based on active admin configuration
 * 3. Fast Data Synchronization with Backend API
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { customizerService } from "../../../services/customizerService";
import "./CakeCustomizer.css";

const DEFAULT_CONFIG = {
  base_price: 700,
  advance_days: 1,
  sizes: [
    { id: "s1", name: "6 inches", price_modifier: 0, description: "Serves 4–6 persons", active: true },
    { id: "s2", name: "8 inches", price_modifier: 150, description: "Serves 8–12 persons", active: true },
    { id: "s3", name: "10 inches", price_modifier: 300, description: "Serves 15–20 persons", active: true },
    { id: "s4", name: "12 inches", price_modifier: 500, description: "Serves 25–30 persons", active: true },
    { id: "s5", name: "2-Tier (6\" + 8\")", price_modifier: 1200, description: "Serves 30–40 persons", active: true },
  ],
  flavors: [
    { id: "f1", name: "Chocolate", price_modifier: 0, active: true },
    { id: "f2", name: "Vanilla", price_modifier: 0, active: true },
    { id: "f3", name: "Red Velvet", price_modifier: 50, active: true },
    { id: "f4", name: "Ube", price_modifier: 50, active: true },
    { id: "f5", name: "Mocha", price_modifier: 30, active: true },
    { id: "f6", name: "Matcha Green Tea", price_modifier: 80, active: true },
  ],
  shapes: [
    { id: "sh1", name: "Round", price_modifier: 0, active: true },
    { id: "sh2", name: "Square", price_modifier: 50, active: true },
    { id: "sh3", name: "Heart", price_modifier: 100, active: true },
    { id: "sh4", name: "Star", price_modifier: 150, active: true },
  ],
  colors: [
    { id: "c1", name: "White", hex: "#FFFFFF", border: "#CCCCCC", active: true },
    { id: "c2", name: "Pink", hex: "#FF69B4", active: true },
    { id: "c3", name: "Blue", hex: "#3B82F6", active: true },
    { id: "c4", name: "Chocolate", hex: "#54331D", active: true },
    { id: "c5", name: "Lavender", hex: "#C084FC", active: true },
    { id: "c6", name: "Golden Yellow", hex: "#FACC15", active: true },
    { id: "c7", name: "Mint Green", hex: "#86EFAC", active: true },
  ],
  occasions: [
    { id: "o1", name: "Birthday", active: true },
    { id: "o2", name: "Wedding", active: true },
    { id: "o3", name: "Anniversary", active: true },
    { id: "o4", name: "Graduation", active: true },
    { id: "o5", name: "Baby Shower", active: true },
    { id: "o6", name: "Christening", active: true },
    { id: "o7", name: "Corporate Event", active: true },
  ]
};

export default function CakeCustomizer() {
  const [activeTab, setActiveTab] = useState("sizes"); // 'sizes', 'flavors', 'shapes', 'colors', 'occasions', 'general'
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Add Item Modal / Inline state
  const [newSizeName, setNewSizeName] = useState("");
  const [newSizePrice, setNewSizePrice] = useState("");
  const [newSizeDesc, setNewSizeDesc] = useState("");

  const [newFlavorName, setNewFlavorName] = useState("");
  const [newFlavorPrice, setNewFlavorPrice] = useState("");

  const [newShapeName, setNewShapeName] = useState("");
  const [newShapePrice, setNewShapePrice] = useState("");

  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#E69526");

  const [newOccasionName, setNewOccasionName] = useState("");

  // Live Customer Preview interactive selections
  const [previewSize, setPreviewSize] = useState("");
  const [previewFlavor, setPreviewFlavor] = useState("");
  const [previewShape, setPreviewShape] = useState("");
  const [previewColor, setPreviewColor] = useState("");
  const [previewOccasion, setPreviewOccasion] = useState("");
  const [previewMessage, setPreviewMessage] = useState("Happy 18th Birthday!");

  // Load Customizer Config
  useEffect(() => {
    async function loadOptions() {
      try {
        setLoading(true);
        const res = await customizerService.getCustomizerOptions();
        if (res && res.options) {
          setConfig(res.options);
          // Set initial preview selections
          const activeSizes = (res.options.sizes || []).filter(s => s.active);
          const activeFlavors = (res.options.flavors || []).filter(f => f.active);
          const activeShapes = (res.options.shapes || []).filter(s => s.active);
          const activeColors = (res.options.colors || []).filter(c => c.active);
          const activeOccasions = (res.options.occasions || []).filter(o => o.active);

          if (activeSizes.length > 0) setPreviewSize(activeSizes[0].name);
          if (activeFlavors.length > 0) setPreviewFlavor(activeFlavors[0].name);
          if (activeShapes.length > 0) setPreviewShape(activeShapes[0].name);
          if (activeColors.length > 0) setPreviewColor(activeColors[0].name);
          if (activeOccasions.length > 0) setPreviewOccasion(activeOccasions[0].name);
        }
      } catch (err) {
        console.warn("Could not load customizer options:", err);
      } finally {
        setLoading(false);
      }
    }

    loadOptions();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Save changes to backend
  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      const res = await customizerService.saveCustomizerOptions(config);
      if (res && res.success) {
        showToast("✅ Cake Customizer options saved and live on storefront!");
      } else {
        alert(res?.message || "Failed to save options.");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert(err.message || "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  // Reset to default
  const handleResetDefaults = () => {
    if (window.confirm("Are you sure you want to reset all cake builder options to store defaults?")) {
      setConfig(DEFAULT_CONFIG);
      showToast("🔄 Reset to default options. Click 'Save' to apply.");
    }
  };

  // -------------------------------------------------------------
  // SIZES HANDLERS
  // -------------------------------------------------------------
  const handleAddSize = (e) => {
    e.preventDefault();
    if (!newSizeName.trim()) return;
    const newSize = {
      id: "s_" + Date.now(),
      name: newSizeName.trim(),
      price_modifier: parseFloat(newSizePrice) || 0,
      description: newSizeDesc.trim() || "Custom size",
      active: true,
    };
    setConfig(prev => ({ ...prev, sizes: [...prev.sizes, newSize] }));
    setNewSizeName("");
    setNewSizePrice("");
    setNewSizeDesc("");
    showToast(`Added size: "${newSize.name}"`);
  };

  const handleDeleteSize = (id) => {
    setConfig(prev => ({ ...prev, sizes: prev.sizes.filter(s => s.id !== id) }));
  };

  const handleToggleSize = (id) => {
    setConfig(prev => ({
      ...prev,
      sizes: prev.sizes.map(s => s.id === id ? { ...s, active: !s.active } : s)
    }));
  };

  const handleUpdateSizePrice = (id, newPrice) => {
    setConfig(prev => ({
      ...prev,
      sizes: prev.sizes.map(s => s.id === id ? { ...s, price_modifier: parseFloat(newPrice) || 0 } : s)
    }));
  };

  // -------------------------------------------------------------
  // FLAVORS HANDLERS
  // -------------------------------------------------------------
  const handleAddFlavor = (e) => {
    e.preventDefault();
    if (!newFlavorName.trim()) return;
    const newFlavor = {
      id: "f_" + Date.now(),
      name: newFlavorName.trim(),
      price_modifier: parseFloat(newFlavorPrice) || 0,
      active: true,
    };
    setConfig(prev => ({ ...prev, flavors: [...prev.flavors, newFlavor] }));
    setNewFlavorName("");
    setNewFlavorPrice("");
    showToast(`Added flavor: "${newFlavor.name}"`);
  };

  const handleDeleteFlavor = (id) => {
    setConfig(prev => ({ ...prev, flavors: prev.flavors.filter(f => f.id !== id) }));
  };

  const handleToggleFlavor = (id) => {
    setConfig(prev => ({
      ...prev,
      flavors: prev.flavors.map(f => f.id === id ? { ...f, active: !f.active } : f)
    }));
  };

  const handleUpdateFlavorPrice = (id, newPrice) => {
    setConfig(prev => ({
      ...prev,
      flavors: prev.flavors.map(f => f.id === id ? { ...f, price_modifier: parseFloat(newPrice) || 0 } : f)
    }));
  };

  // -------------------------------------------------------------
  // SHAPES HANDLERS
  // -------------------------------------------------------------
  const handleAddShape = (e) => {
    e.preventDefault();
    if (!newShapeName.trim()) return;
    const newShape = {
      id: "sh_" + Date.now(),
      name: newShapeName.trim(),
      price_modifier: parseFloat(newShapePrice) || 0,
      active: true,
    };
    setConfig(prev => ({ ...prev, shapes: [...prev.shapes, newShape] }));
    setNewShapeName("");
    setNewShapePrice("");
    showToast(`Added shape: "${newShape.name}"`);
  };

  const handleDeleteShape = (id) => {
    setConfig(prev => ({ ...prev, shapes: prev.shapes.filter(s => s.id !== id) }));
  };

  const handleToggleShape = (id) => {
    setConfig(prev => ({
      ...prev,
      shapes: prev.shapes.map(s => s.id === id ? { ...s, active: !s.active } : s)
    }));
  };

  const handleUpdateShapePrice = (id, newPrice) => {
    setConfig(prev => ({
      ...prev,
      shapes: prev.shapes.map(s => s.id === id ? { ...s, price_modifier: parseFloat(newPrice) || 0 } : s)
    }));
  };

  // -------------------------------------------------------------
  // COLORS HANDLERS
  // -------------------------------------------------------------
  const handleAddColor = (e) => {
    e.preventDefault();
    if (!newColorName.trim()) return;
    const newColor = {
      id: "c_" + Date.now(),
      name: newColorName.trim(),
      hex: newColorHex,
      border: newColorHex.toLowerCase() === "#ffffff" ? "#CCCCCC" : undefined,
      active: true,
    };
    setConfig(prev => ({ ...prev, colors: [...prev.colors, newColor] }));
    setNewColorName("");
    setNewColorHex("#E69526");
    showToast(`Added color: "${newColor.name}"`);
  };

  const handleDeleteColor = (id) => {
    setConfig(prev => ({ ...prev, colors: prev.colors.filter(c => c.id !== id) }));
  };

  const handleToggleColor = (id) => {
    setConfig(prev => ({
      ...prev,
      colors: prev.colors.map(c => c.id === id ? { ...c, active: !c.active } : c)
    }));
  };

  // -------------------------------------------------------------
  // OCCASIONS HANDLERS
  // -------------------------------------------------------------
  const handleAddOccasion = (e) => {
    e.preventDefault();
    if (!newOccasionName.trim()) return;
    const newOccasion = {
      id: "o_" + Date.now(),
      name: newOccasionName.trim(),
      active: true,
    };
    setConfig(prev => ({ ...prev, occasions: [...prev.occasions, newOccasion] }));
    setNewOccasionName("");
    showToast(`Added occasion: "${newOccasion.name}"`);
  };

  const handleDeleteOccasion = (id) => {
    setConfig(prev => ({ ...prev, occasions: prev.occasions.filter(o => o.id !== id) }));
  };

  const handleToggleOccasion = (id) => {
    setConfig(prev => ({
      ...prev,
      occasions: prev.occasions.map(o => o.id === id ? { ...o, active: !o.active } : o)
    }));
  };

  // -------------------------------------------------------------
  // PREVIEW PRICE CALCULATION
  // -------------------------------------------------------------
  const selectedSizeObj = (config.sizes || []).find(s => s.name === previewSize) || config.sizes?.[0];
  const selectedFlavorObj = (config.flavors || []).find(f => f.name === previewFlavor) || config.flavors?.[0];
  const selectedShapeObj = (config.shapes || []).find(s => s.name === previewShape) || config.shapes?.[0];
  const selectedColorObj = (config.colors || []).find(c => c.name === previewColor) || config.colors?.[0];

  const calculatedPreviewPrice =
    (parseFloat(config.base_price) || 700) +
    (parseFloat(selectedSizeObj?.price_modifier) || 0) +
    (parseFloat(selectedFlavorObj?.price_modifier) || 0) +
    (parseFloat(selectedShapeObj?.price_modifier) || 0);

  return (
    <div className="cake-customizer-page">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="customizer-toast">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="customizer-header">
        <div>
          <div className="customizer-breadcrumb">
            <Link to="/admin">Dashboard</Link> <span>/</span> <strong>Cake Customizer</strong>
          </div>
          <h1>🎂 Cake Customizer Manager</h1>
          <p>Configure what customers can customize when ordering personalized cakes on the storefront.</p>
        </div>

        <div className="customizer-header-actions">
          <Link to="/personalize" target="_blank" className="view-storefront-btn" title="Open storefront builder">
            🌐 Test on Storefront ↗
          </Link>
          <button type="button" className="reset-defaults-btn" onClick={handleResetDefaults}>
            🔄 Reset
          </button>
          <button
            type="button"
            className="save-config-btn"
            onClick={handleSaveConfig}
            disabled={saving}
          >
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </div>

      {/* Main Workspace Split */}
      <div className="customizer-layout-grid">
        {/* ==================================================================
            LEFT COLUMN: TABBED OPTION EDITORS
            ================================================================== */}
        <div className="customizer-editor-card">
          {/* Navigation Category Tabs */}
          <div className="customizer-nav-tabs">
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === "sizes" ? "active" : ""}`}
              onClick={() => setActiveTab("sizes")}
            >
              <span>📏</span>
              <strong>Cake Sizes</strong>
              <small>{(config.sizes || []).filter(s => s.active).length} active</small>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === "flavors" ? "active" : ""}`}
              onClick={() => setActiveTab("flavors")}
            >
              <span>🍫</span>
              <strong>Flavors</strong>
              <small>{(config.flavors || []).filter(f => f.active).length} active</small>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === "shapes" ? "active" : ""}`}
              onClick={() => setActiveTab("shapes")}
            >
              <span>📐</span>
              <strong>Shapes</strong>
              <small>{(config.shapes || []).filter(s => s.active).length} active</small>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === "colors" ? "active" : ""}`}
              onClick={() => setActiveTab("colors")}
            >
              <span>🎨</span>
              <strong>Frosting Colors</strong>
              <small>{(config.colors || []).filter(c => c.active).length} active</small>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === "occasions" ? "active" : ""}`}
              onClick={() => setActiveTab("occasions")}
            >
              <span>🎉</span>
              <strong>Occasions</strong>
              <small>{(config.occasions || []).filter(o => o.active).length} active</small>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === "general" ? "active" : ""}`}
              onClick={() => setActiveTab("general")}
            >
              <span>⚙️</span>
              <strong>Pricing & Rules</strong>
              <small>Base ₱{config.base_price}</small>
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="customizer-tab-body">
            {loading ? (
              <div className="tab-loading-state">
                <div className="tab-spinner"></div>
                <p>Loading customizer options...</p>
              </div>
            ) : (
              <>
                {/* 1. SIZES TAB */}
                {activeTab === "sizes" && (
                  <div className="tab-content-pane">
                    <div className="pane-header">
                      <div>
                        <h3>📏 Cake Sizes & Tier Options</h3>
                        <p>Define size options and their added price modifier over the base cake price.</p>
                      </div>
                    </div>

                    {/* Add Size Form */}
                    <form className="add-option-inline-form" onSubmit={handleAddSize}>
                      <div className="form-row">
                        <div className="form-field flex-2">
                          <label>Size Name / Tiers *</label>
                          <input
                            type="text"
                            placeholder="e.g. 14 inches or 3-Tier Grand"
                            value={newSizeName}
                            onChange={(e) => setNewSizeName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-field flex-1">
                          <label>Price Added (+₱)</label>
                          <input
                            type="number"
                            placeholder="e.g. 250"
                            value={newSizePrice}
                            onChange={(e) => setNewSizePrice(e.target.value)}
                            min="0"
                          />
                        </div>
                        <div className="form-field flex-2">
                          <label>Servings / Note</label>
                          <input
                            type="text"
                            placeholder="e.g. Serves 20–25 persons"
                            value={newSizeDesc}
                            onChange={(e) => setNewSizeDesc(e.target.value)}
                          />
                        </div>
                        <button type="submit" className="add-submit-btn">
                          + Add Size
                        </button>
                      </div>
                    </form>

                    {/* Sizes Table / List */}
                    <div className="options-table-wrapper">
                      <table className="options-data-table">
                        <thead>
                          <tr>
                            <th>Status</th>
                            <th>Size Name</th>
                            <th>Servings / Description</th>
                            <th>Price Modifier</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(config.sizes || []).map((size) => (
                            <tr key={size.id} className={!size.active ? "row-inactive" : ""}>
                              <td>
                                <button
                                  type="button"
                                  className={`toggle-status-pill ${size.active ? "active" : "inactive"}`}
                                  onClick={() => handleToggleSize(size.id)}
                                >
                                  {size.active ? "🟢 Active" : "⚪ Hidden"}
                                </button>
                              </td>
                              <td><strong>{size.name}</strong></td>
                              <td><span className="desc-text">{size.description || "—"}</span></td>
                              <td>
                                <div className="price-input-inline">
                                  <span>+₱</span>
                                  <input
                                    type="number"
                                    value={size.price_modifier}
                                    onChange={(e) => handleUpdateSizePrice(size.id, e.target.value)}
                                    min="0"
                                  />
                                </div>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="delete-item-btn"
                                  onClick={() => handleDeleteSize(size.id)}
                                  title="Delete option"
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. FLAVORS TAB */}
                {activeTab === "flavors" && (
                  <div className="tab-content-pane">
                    <div className="pane-header">
                      <div>
                        <h3>🍫 Cake Flavors</h3>
                        <p>Configure cake sponge & filling flavors. You can set specialty flavors to have an extra charge.</p>
                      </div>
                    </div>

                    {/* Add Flavor Form */}
                    <form className="add-option-inline-form" onSubmit={handleAddFlavor}>
                      <div className="form-row">
                        <div className="form-field flex-3">
                          <label>Flavor Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Mango Graham, Pistachio, Strawberry"
                            value={newFlavorName}
                            onChange={(e) => setNewFlavorName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-field flex-1">
                          <label>Extra Fee (+₱)</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={newFlavorPrice}
                            onChange={(e) => setNewFlavorPrice(e.target.value)}
                            min="0"
                          />
                        </div>
                        <button type="submit" className="add-submit-btn">
                          + Add Flavor
                        </button>
                      </div>
                    </form>

                    <div className="options-table-wrapper">
                      <table className="options-data-table">
                        <thead>
                          <tr>
                            <th>Status</th>
                            <th>Flavor</th>
                            <th>Extra Price</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(config.flavors || []).map((flavor) => (
                            <tr key={flavor.id} className={!flavor.active ? "row-inactive" : ""}>
                              <td>
                                <button
                                  type="button"
                                  className={`toggle-status-pill ${flavor.active ? "active" : "inactive"}`}
                                  onClick={() => handleToggleFlavor(flavor.id)}
                                >
                                  {flavor.active ? "🟢 Active" : "⚪ Hidden"}
                                </button>
                              </td>
                              <td><strong>{flavor.name}</strong></td>
                              <td>
                                <div className="price-input-inline">
                                  <span>+₱</span>
                                  <input
                                    type="number"
                                    value={flavor.price_modifier}
                                    onChange={(e) => handleUpdateFlavorPrice(flavor.id, e.target.value)}
                                    min="0"
                                  />
                                </div>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="delete-item-btn"
                                  onClick={() => handleDeleteFlavor(flavor.id)}
                                  title="Delete flavor"
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. SHAPES TAB */}
                {activeTab === "shapes" && (
                  <div className="tab-content-pane">
                    <div className="pane-header">
                      <div>
                        <h3>📐 Cake Shapes</h3>
                        <p>Offer classic and specialty shaped cakes (e.g. Heart, Hexagon, Star, Sheet).</p>
                      </div>
                    </div>

                    <form className="add-option-inline-form" onSubmit={handleAddShape}>
                      <div className="form-row">
                        <div className="form-field flex-3">
                          <label>Shape Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Hexagon, Butterfly, Diamond"
                            value={newShapeName}
                            onChange={(e) => setNewShapeName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-field flex-1">
                          <label>Extra Fee (+₱)</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={newShapePrice}
                            onChange={(e) => setNewShapePrice(e.target.value)}
                            min="0"
                          />
                        </div>
                        <button type="submit" className="add-submit-btn">
                          + Add Shape
                        </button>
                      </div>
                    </form>

                    <div className="options-table-wrapper">
                      <table className="options-data-table">
                        <thead>
                          <tr>
                            <th>Status</th>
                            <th>Shape Name</th>
                            <th>Extra Price</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(config.shapes || []).map((shape) => (
                            <tr key={shape.id} className={!shape.active ? "row-inactive" : ""}>
                              <td>
                                <button
                                  type="button"
                                  className={`toggle-status-pill ${shape.active ? "active" : "inactive"}`}
                                  onClick={() => handleToggleShape(shape.id)}
                                >
                                  {shape.active ? "🟢 Active" : "⚪ Hidden"}
                                </button>
                              </td>
                              <td><strong>{shape.name}</strong></td>
                              <td>
                                <div className="price-input-inline">
                                  <span>+₱</span>
                                  <input
                                    type="number"
                                    value={shape.price_modifier}
                                    onChange={(e) => handleUpdateShapePrice(shape.id, e.target.value)}
                                    min="0"
                                  />
                                </div>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="delete-item-btn"
                                  onClick={() => handleDeleteShape(shape.id)}
                                  title="Delete shape"
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. FROSTING COLORS TAB */}
                {activeTab === "colors" && (
                  <div className="tab-content-pane">
                    <div className="pane-header">
                      <div>
                        <h3>🎨 Frosting Colors Palette</h3>
                        <p>Manage the visual icing/frosting color palette displayed on the customer builder.</p>
                      </div>
                    </div>

                    <form className="add-option-inline-form" onSubmit={handleAddColor}>
                      <div className="form-row">
                        <div className="form-field flex-2">
                          <label>Color Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Royal Gold, Pastel Lilac, Ruby Red"
                            value={newColorName}
                            onChange={(e) => setNewColorName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-field flex-1">
                          <label>Color Swatch *</label>
                          <div className="color-picker-input-group">
                            <input
                              type="color"
                              value={newColorHex}
                              onChange={(e) => setNewColorHex(e.target.value)}
                              className="color-wheel-input"
                            />
                            <input
                              type="text"
                              value={newColorHex}
                              onChange={(e) => setNewColorHex(e.target.value)}
                              className="hex-text-input"
                            />
                          </div>
                        </div>
                        <button type="submit" className="add-submit-btn">
                          + Add Color
                        </button>
                      </div>
                    </form>

                    {/* Colors Grid Card Display */}
                    <div className="colors-palette-grid">
                      {(config.colors || []).map((color) => (
                        <div key={color.id} className={`color-swatch-card ${!color.active ? "inactive" : ""}`}>
                          <div
                            className="color-preview-circle"
                            style={{
                              backgroundColor: color.hex,
                              border: color.border ? `2px solid ${color.border}` : "1.5px solid rgba(0,0,0,0.15)"
                            }}
                          ></div>
                          <div className="color-card-info">
                            <strong>{color.name}</strong>
                            <code>{color.hex}</code>
                          </div>
                          <div className="color-card-actions">
                            <button
                              type="button"
                              className={`status-dot-btn ${color.active ? "active" : ""}`}
                              onClick={() => handleToggleColor(color.id)}
                              title={color.active ? "Visible to customers" : "Hidden from customers"}
                            >
                              {color.active ? "🟢" : "⚪"}
                            </button>
                            <button
                              type="button"
                              className="delete-icon-btn"
                              onClick={() => handleDeleteColor(color.id)}
                              title="Delete color"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. OCCASIONS TAB */}
                {activeTab === "occasions" && (
                  <div className="tab-content-pane">
                    <div className="pane-header">
                      <div>
                        <h3>🎉 Occasions & Event Categories</h3>
                        <p>List of milestone event categories customers can choose from.</p>
                      </div>
                    </div>

                    <form className="add-option-inline-form" onSubmit={handleAddOccasion}>
                      <div className="form-row">
                        <div className="form-field flex-3">
                          <label>Occasion Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Mother's Day, Valentine's, Retirement, Quinceañera"
                            value={newOccasionName}
                            onChange={(e) => setNewOccasionName(e.target.value)}
                            required
                          />
                        </div>
                        <button type="submit" className="add-submit-btn">
                          + Add Occasion
                        </button>
                      </div>
                    </form>

                    <div className="occasions-chip-grid">
                      {(config.occasions || []).map((occ) => (
                        <div key={occ.id} className={`occasion-chip ${!occ.active ? "inactive" : ""}`}>
                          <span className="occ-name">🎉 {occ.name}</span>
                          <div className="occ-actions">
                            <button
                              type="button"
                              onClick={() => handleToggleOccasion(occ.id)}
                              title="Toggle active"
                            >
                              {occ.active ? "🟢" : "⚪"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOccasion(occ.id)}
                              title="Delete occasion"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. GENERAL PRICING & RULES */}
                {activeTab === "general" && (
                  <div className="tab-content-pane">
                    <div className="pane-header">
                      <div>
                        <h3>⚙️ General Custom Cake Settings</h3>
                        <p>Configure starting base pricing and minimum lead time required for bakery preparation.</p>
                      </div>
                    </div>

                    <div className="general-settings-form">
                      <div className="setting-box-card">
                        <label>
                          <strong>Starting Base Cake Price (₱)</strong>
                          <p>The standard baseline price for custom cakes before adding size or flavor modifiers.</p>
                        </label>
                        <div className="price-input-huge">
                          <span>₱</span>
                          <input
                            type="number"
                            value={config.base_price}
                            onChange={(e) => setConfig({ ...config, base_price: parseFloat(e.target.value) || 0 })}
                            min="0"
                          />
                        </div>
                      </div>

                      <div className="setting-box-card">
                        <label>
                          <strong>Minimum Advance Preparation Notice (Days)</strong>
                          <p>Ensures customers book custom cake dates with enough advance notice for bakery kitchen staff.</p>
                        </label>
                        <div className="number-input-group">
                          <input
                            type="number"
                            value={config.advance_days}
                            onChange={(e) => setConfig({ ...config, advance_days: parseInt(e.target.value) || 1 })}
                            min="1"
                            max="30"
                          />
                          <span>Day(s) in advance</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ==================================================================
            RIGHT COLUMN: LIVE STOREFRONT CUSTOMER PREVIEW
            ================================================================== */}
        <div className="customizer-preview-card">
          <div className="preview-header-bar">
            <div className="preview-indicator">
              <span className="live-dot"></span>
              <strong>Live Customer Store Preview</strong>
            </div>
            <span className="store-pill">/personalize</span>
          </div>

          <div className="preview-card-body">
            {/* Cake Graphic */}
            <div className="preview-visual-box">
              <img
                src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500"
                alt="Cake Preview"
                className="preview-cake-img"
              />
              <div className="preview-visual-summary">
                <span className="summary-badge">{previewSize || "6 inches"}</span>
                <span className="summary-badge">{previewFlavor || "Chocolate"}</span>
                <span className="summary-badge">{previewShape || "Round"}</span>
              </div>
            </div>

            {/* Interactive Preview Controls */}
            <div className="preview-interactive-fields">
              <div className="preview-field-group">
                <label>Cake Size</label>
                <select value={previewSize} onChange={(e) => setPreviewSize(e.target.value)}>
                  {(config.sizes || []).filter(s => s.active).map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} {s.price_modifier > 0 ? `(+₱${s.price_modifier})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="preview-field-group">
                <label>Flavor</label>
                <select value={previewFlavor} onChange={(e) => setPreviewFlavor(e.target.value)}>
                  {(config.flavors || []).filter(f => f.active).map(f => (
                    <option key={f.id} value={f.name}>
                      {f.name} {f.price_modifier > 0 ? `(+₱${f.price_modifier})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="preview-field-group">
                <label>Shape</label>
                <select value={previewShape} onChange={(e) => setPreviewShape(e.target.value)}>
                  {(config.shapes || []).filter(s => s.active).map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} {s.price_modifier > 0 ? `(+₱${s.price_modifier})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Frosting Color Circles */}
              <div className="preview-field-group">
                <label>Frosting Color: <strong>{previewColor}</strong></label>
                <div className="preview-colors-row">
                  {(config.colors || []).filter(c => c.active).map(c => (
                    <div
                      key={c.id}
                      className={`preview-color-bubble ${previewColor === c.name ? "selected" : ""}`}
                      style={{
                        backgroundColor: c.hex,
                        border: c.border ? `2px solid ${c.border}` : "1.5px solid rgba(0,0,0,0.15)"
                      }}
                      onClick={() => setPreviewColor(c.name)}
                      title={c.name}
                    ></div>
                  ))}
                </div>
              </div>

              <div className="preview-field-group">
                <label>Occasion</label>
                <select value={previewOccasion} onChange={(e) => setPreviewOccasion(e.target.value)}>
                  {(config.occasions || []).filter(o => o.active).map(o => (
                    <option key={o.id} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div className="preview-field-group">
                <label>Message on Cake</label>
                <input
                  type="text"
                  value={previewMessage}
                  onChange={(e) => setPreviewMessage(e.target.value)}
                  placeholder="e.g. Happy Birthday!"
                />
              </div>

              {/* Live Price Calculator Banner */}
              <div className="preview-total-banner">
                <div className="price-calc-breakdown">
                  <span>Base: ₱{config.base_price}</span>
                  {selectedSizeObj?.price_modifier > 0 && <span>+ Size: ₱{selectedSizeObj.price_modifier}</span>}
                  {selectedFlavorObj?.price_modifier > 0 && <span>+ Flavor: ₱{selectedFlavorObj.price_modifier}</span>}
                  {selectedShapeObj?.price_modifier > 0 && <span>+ Shape: ₱{selectedShapeObj.price_modifier}</span>}
                </div>
                <div className="price-grand-row">
                  <span>Customer Total:</span>
                  <strong>₱{calculatedPreviewPrice.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
