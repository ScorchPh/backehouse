/**
 * ============================================================================
 * BAKE HOUSE - Personalize Your Cake (Dynamic Builder)
 * ============================================================================
 * Features:
 * 1. Fully dynamic customizer options synced with Admin Cake Customizer settings:
 *    - Sizes & Pricing modifiers
 *    - Flavors & Specialty fees
 *    - Shapes
 *    - Dynamic Frosting Palette with hex swatches
 *    - Occasions & Themes
 * 2. Real-time dynamic price calculation
 * 3. Event Scheduling with minimum advance booking notice
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { customizerService } from "../../services/customizerService";
import "./Personalize.css";

import placeholder from "../../assets/images/placeholder.jfif";

function Personalize() {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  // Customizer Configuration loaded from backend
  const [options, setOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Selected State
  const [size, setSize] = useState("6 inches");
  const [flavor, setFlavor] = useState("Chocolate");
  const [shape, setShape] = useState("Round");
  const [occasion, setOccasion] = useState("Birthday");
  const [color, setColor] = useState("White");
  const [message, setMessage] = useState("");
  const [instructions, setInstructions] = useState("");

  // Default advance date calculation based on admin advance_days
  const getMinDate = (days = 1) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const [scheduleDate, setScheduleDate] = useState(getMinDate(1));
  const [scheduleTime, setScheduleTime] = useState("Afternoon (1:00 PM - 5:00 PM)");

  // Load Dynamic Options from API
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoadingOptions(true);
        const res = await customizerService.getCustomizerOptions();
        if (res && res.options) {
          setOptions(res.options);

          // Initialize defaults from active options
          const activeSizes = (res.options.sizes || []).filter((s) => s.active);
          const activeFlavors = (res.options.flavors || []).filter((f) => f.active);
          const activeShapes = (res.options.shapes || []).filter((s) => s.active);
          const activeColors = (res.options.colors || []).filter((c) => c.active);
          const activeOccasions = (res.options.occasions || []).filter((o) => o.active);

          if (activeSizes.length > 0) setSize(activeSizes[0].name);
          if (activeFlavors.length > 0) setFlavor(activeFlavors[0].name);
          if (activeShapes.length > 0) setShape(activeShapes[0].name);
          if (activeColors.length > 0) setColor(activeColors[0].name);
          if (activeOccasions.length > 0) setOccasion(activeOccasions[0].name);

          const advDays = res.options.advance_days || 1;
          setScheduleDate(getMinDate(advDays));
        }
      } catch (err) {
        console.warn("Could not load dynamic cake customizer options:", err);
      } finally {
        setLoadingOptions(false);
      }
    }

    loadConfig();
  }, []);

  // Filter Active Options
  const activeSizes = (options?.sizes || []).filter((s) => s.active);
  const activeFlavors = (options?.flavors || []).filter((f) => f.active);
  const activeShapes = (options?.shapes || []).filter((s) => s.active);
  const activeColors = (options?.colors || []).filter((c) => c.active);
  const activeOccasions = (options?.occasions || []).filter((o) => o.active);

  // Dynamic Price Calculation
  const basePrice = options?.base_price !== undefined ? parseFloat(options.base_price) : 700;
  const selectedSizeObj = activeSizes.find((s) => s.name === size) || activeSizes[0];
  const selectedFlavorObj = activeFlavors.find((f) => f.name === flavor) || activeFlavors[0];
  const selectedShapeObj = activeShapes.find((s) => s.name === shape) || activeShapes[0];

  const sizePriceModifier = parseFloat(selectedSizeObj?.price_modifier || 0);
  const flavorPriceModifier = parseFloat(selectedFlavorObj?.price_modifier || 0);
  const shapePriceModifier = parseFloat(selectedShapeObj?.price_modifier || 0);

  const totalPrice = basePrice + sizePriceModifier + flavorPriceModifier + shapePriceModifier;

  const handleAddToCart = () => {
    const customCake = {
      id: Date.now(),
      name: `${occasion} Custom Cake`,
      description: `${size} • ${flavor} • ${shape} • Frosting: ${color} • Needed: ${scheduleDate}`,
      price: totalPrice,
      image: placeholder,
      scheduled_date: scheduleDate,
      scheduled_time: scheduleTime,
      is_scheduled: true,
      customization: {
        size,
        flavor,
        shape,
        color,
        occasion,
        message,
        instructions,
        scheduled_date: scheduleDate,
        scheduled_time: scheduleTime,
        is_scheduled: true,
      },
    };

    addToCart(customCake, 1);
    navigate("/cart");
  };

  return (
    <div className="personalize-page">
      <h1>🎂 Personalize Your Cake</h1>
      <p>Create your dream cake just the way you like it!</p>

      {loadingOptions ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#8C7F72" }}>
          <p>Loading cake customizer options...</p>
        </div>
      ) : (
        <div className="personalize-container">
          {/* Preview Section */}
          <div className="preview-section">
            <img
              src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500"
              alt="Cake Preview"
            />

            <div className="preview-info">
              <h3>Your Cake</h3>
              <p><strong>Size:</strong> {size}</p>
              <p><strong>Flavor:</strong> {flavor}</p>
              <p><strong>Shape:</strong> {shape}</p>
              <p><strong>Frosting:</strong> {color}</p>
              <p><strong>Occasion:</strong> {occasion}</p>
              <p><strong>Message:</strong> {message || "No message yet"}</p>

              <div
                style={{
                  marginTop: "15px",
                  paddingTop: "12px",
                  borderTop: "1.5px dashed #E0D3C3",
                  background: "#FAF6F0",
                  padding: "10px",
                  borderRadius: "10px",
                }}
              >
                <p style={{ margin: "4px 0", color: "#8B4513" }}>
                  <strong>📅 Event / Needed Date:</strong>
                </p>
                <span style={{ fontWeight: "700", color: "#3D2314" }}>{scheduleDate}</span>
                <p style={{ margin: "6px 0 2px", color: "#8B4513" }}>
                  <strong>🕒 Preferred Time:</strong>
                </p>
                <span style={{ fontSize: "0.85rem", color: "#54331D" }}>{scheduleTime}</span>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="form-section">
            {/* Cake Size */}
            <label>Cake Size</label>
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              {activeSizes.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} {s.price_modifier > 0 ? `(+₱${s.price_modifier})` : ""} {s.description ? `— ${s.description}` : ""}
                </option>
              ))}
            </select>

            {/* Flavor */}
            <label>Flavor</label>
            <select value={flavor} onChange={(e) => setFlavor(e.target.value)}>
              {activeFlavors.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name} {f.price_modifier > 0 ? `(+₱${f.price_modifier})` : ""}
                </option>
              ))}
            </select>

            {/* Shape */}
            <label>Shape</label>
            <select value={shape} onChange={(e) => setShape(e.target.value)}>
              {activeShapes.map((sh) => (
                <option key={sh.id} value={sh.name}>
                  {sh.name} {sh.price_modifier > 0 ? `(+₱${sh.price_modifier})` : ""}
                </option>
              ))}
            </select>

            {/* Frosting Color Swatches */}
            <label>Frosting Color</label>
            <div className="color-picker" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {activeColors.map((c) => (
                <div
                  key={c.id}
                  className={`color-bubble-item ${color === c.name ? "active" : ""}`}
                  style={{
                    backgroundColor: c.hex,
                    border: c.border ? `2px solid ${c.border}` : "1.5px solid rgba(0,0,0,0.15)",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    boxShadow: color === c.name ? "0 0 0 3px #54331D" : "0 2px 5px rgba(0,0,0,0.1)",
                    transform: color === c.name ? "scale(1.15)" : "scale(1)",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => setColor(c.name)}
                  title={c.name}
                ></div>
              ))}
            </div>

            <p style={{ marginTop: "8px" }}>
              <strong>Selected Color:</strong> {color}
            </p>

            {/* Occasion */}
            <label>Occasion</label>
            <select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
              {activeOccasions.map((o) => (
                <option key={o.id} value={o.name}>
                  {o.name}
                </option>
              ))}
            </select>

            {/* Schedule Date & Time Picker */}
            <div
              style={{
                background: "#FFFBF5",
                border: "1.5px solid #EADBCE",
                borderRadius: "12px",
                padding: "16px",
                marginTop: "16px",
                marginBottom: "16px",
              }}
            >
              <h4
                style={{
                  margin: "0 0 10px",
                  color: "#6B4226",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>📅</span> Schedule Custom Cake Delivery / Pickup
              </h4>
              <p style={{ margin: "0 0 12px", fontSize: "0.84rem", color: "#7A695B" }}>
                Select the event date when you want your custom cake prepared and delivered.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ margin: "0 0 4px", fontSize: "0.85rem" }}>
                    Event / Needed Date *
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    min={getMinDate(options?.advance_days || 1)}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    required
                    style={{ background: "#FFF" }}
                  />
                </div>

                <div>
                  <label style={{ margin: "0 0 4px", fontSize: "0.85rem" }}>
                    Preferred Time Slot *
                  </label>
                  <select
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    style={{ background: "#FFF" }}
                  >
                    <option>Morning (9:00 AM - 12:00 PM)</option>
                    <option>Afternoon (1:00 PM - 5:00 PM)</option>
                    <option>Evening (5:00 PM - 7:00 PM)</option>
                    <option>Specific Event Time</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Message on Cake */}
            <label>Message on Cake</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Happy 18th Birthday Maria!"
            />

            {/* Special Instructions */}
            <label>Special Instructions</label>
            <textarea
              rows="3"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Write your specific cake theme, design requests, or allergy notes..."
            ></textarea>

            {/* Total Price Banner */}
            <h2 style={{ color: "#54331D", fontWeight: "900", margin: "16px 0 8px" }}>
              Total Price: ₱{totalPrice.toLocaleString()}
            </h2>

            <button onClick={handleAddToCart}>Add Scheduled Cake to Cart</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Personalize;