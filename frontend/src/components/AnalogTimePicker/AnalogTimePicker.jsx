/**
 * ============================================================================
 * BAKE HOUSE - Interactive Analog Time Picker Component
 * ============================================================================
 * Allows customers to select their preferred cake preparation/delivery time
 * using an interactive analog clock dial with hour & minute modes and AM/PM toggle.
 * ============================================================================
 */

import { useState, useRef, useEffect } from "react";
import "./AnalogTimePicker.css";

function AnalogTimePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("hours"); // 'hours' | 'minutes'

  // Parse initial value (e.g. "02:30 PM" or "2:30 PM")
  const parseTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") {
      return { hour: 2, minute: 30, period: "PM" };
    }
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      let m = parseInt(match[2], 10);
      let p = match[3] ? match[3].toUpperCase() : "PM";
      if (h > 12) {
        h = h - 12;
        p = "PM";
      }
      if (h === 0) h = 12;
      return { hour: h, minute: m, period: p };
    }
    return { hour: 2, minute: 30, period: "PM" };
  };

  const parsed = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(parsed.hour);
  const [selectedMinute, setSelectedMinute] = useState(parsed.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(parsed.period);

  const clockRef = useRef(null);

  // Sync state if external value changes
  useEffect(() => {
    const p = parseTime(value);
    setSelectedHour(p.hour);
    setSelectedMinute(p.minute);
    setSelectedPeriod(p.period);
  }, [value]);

  // Format time output string
  const formatTimeString = (h, m, p) => {
    const hStr = String(h).padStart(2, "0");
    const mStr = String(m).padStart(2, "0");
    return `${hStr}:${mStr} ${p}`;
  };

  // Confirm selection
  const handleConfirm = () => {
    const formatted = formatTimeString(selectedHour, selectedMinute, selectedPeriod);
    onChange(formatted);
    setIsOpen(false);
    setMode("hours");
  };

  // Clock Hand Angles
  const hourAngle = (selectedHour % 12) * 30; // 30 deg per hour
  const minuteAngle = selectedMinute * 6; // 6 deg per minute
  const handAngle = mode === "hours" ? hourAngle : minuteAngle;

  // Handle click on clock face (calculating angle)
  const handleClockClick = (e) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;

    // Angle in degrees from 12 o'clock (0 deg at top)
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    if (mode === "hours") {
      let h = Math.round(deg / 30);
      if (h === 0) h = 12;
      setSelectedHour(h);
      setMode("minutes");
    } else {
      let m = Math.round(deg / 6);
      if (m === 60) m = 0;
      setSelectedMinute(m);
    }
  };

  // Quick preset helper
  const handlePreset = (h, m, p) => {
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedPeriod(p);
  };

  // Display value
  const displayValue = value && value.includes(":") ? value : "02:30 PM";

  return (
    <div className="analog-picker-wrapper">
      {/* Clickable Display Input */}
      <button
        type="button"
        className="analog-picker-trigger"
        onClick={() => setIsOpen(true)}
      >
        <span className="trigger-clock-icon">🕒</span>
        <span className="trigger-time-text">{displayValue}</span>
        <span className="trigger-edit-tag">Change</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="analog-picker-overlay" onClick={() => setIsOpen(false)}>
          <div className="analog-picker-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Header: Digital Readout & Mode Switcher */}
            <div className="analog-header">
              <span className="header-subtitle">Select Preferred Time</span>
              <div className="time-display-row">
                <div className="time-digits">
                  <button
                    type="button"
                    className={`digit-btn ${mode === "hours" ? "active" : ""}`}
                    onClick={() => setMode("hours")}
                  >
                    {String(selectedHour).padStart(2, "0")}
                  </button>
                  <span className="digit-separator">:</span>
                  <button
                    type="button"
                    className={`digit-btn ${mode === "minutes" ? "active" : ""}`}
                    onClick={() => setMode("minutes")}
                  >
                    {String(selectedMinute).padStart(2, "0")}
                  </button>
                </div>

                {/* AM / PM Toggle */}
                <div className="ampm-toggle">
                  <button
                    type="button"
                    className={`ampm-btn ${selectedPeriod === "AM" ? "active" : ""}`}
                    onClick={() => setSelectedPeriod("AM")}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    className={`ampm-btn ${selectedPeriod === "PM" ? "active" : ""}`}
                    onClick={() => setSelectedPeriod("PM")}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* Mode Indicator Prompt */}
            <div className="clock-mode-label">
              {mode === "hours" ? "👉 Tap an hour (1–12)" : "👉 Tap minutes (00–55)"}
            </div>

            {/* Analog Clock Face */}
            <div className="clock-face-container">
              <div
                className="analog-clock-face"
                ref={clockRef}
                onClick={handleClockClick}
              >
                {/* Center Pivot */}
                <div className="clock-center-dot"></div>

                {/* Rotating Clock Hand */}
                <div
                  className="clock-hand"
                  style={{
                    transform: `rotate(${handAngle}deg)`,
                  }}
                >
                  <div className="clock-hand-line"></div>
                  <div className="clock-hand-head"></div>
                </div>

                {/* Numbers Layout */}
                {mode === "hours" ? (
                  // Hours 1 to 12
                  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
                    const angle = h * 30 - 90;
                    const rad = (angle * Math.PI) / 180;
                    const radius = 86; // px from center
                    const x = Math.round(radius * Math.cos(rad));
                    const y = Math.round(radius * Math.sin(rad));
                    const isSelected = selectedHour === h;

                    return (
                      <button
                        key={h}
                        type="button"
                        className={`clock-number ${isSelected ? "selected" : ""}`}
                        style={{
                          transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHour(h);
                          setTimeout(() => setMode("minutes"), 250);
                        }}
                      >
                        {h}
                      </button>
                    );
                  })
                ) : (
                  // Minutes (00, 05, 10, ..., 55)
                  [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
                    const angle = (m / 60) * 360 - 90;
                    const rad = (angle * Math.PI) / 180;
                    const radius = 86;
                    const x = Math.round(radius * Math.cos(rad));
                    const y = Math.round(radius * Math.sin(rad));
                    const isSelected = selectedMinute === m;

                    return (
                      <button
                        key={m}
                        type="button"
                        className={`clock-number minute-number ${isSelected ? "selected" : ""}`}
                        style={{
                          transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMinute(m);
                        }}
                      >
                        {String(m).padStart(2, "0")}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="analog-presets">
              <span className="presets-label">Popular times:</span>
              <button type="button" onClick={() => handlePreset(10, 0, "AM")}>
                10:00 AM
              </button>
              <button type="button" onClick={() => handlePreset(2, 30, "PM")}>
                02:30 PM
              </button>
              <button type="button" onClick={() => handlePreset(5, 0, "PM")}>
                05:00 PM
              </button>
              <button type="button" onClick={() => handlePreset(7, 0, "PM")}>
                07:00 PM
              </button>
            </div>

            {/* Actions: Cancel / Set Time */}
            <div className="analog-actions">
              <button
                type="button"
                className="action-cancel"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="action-confirm"
                onClick={handleConfirm}
              >
                Set Time ({formatTimeString(selectedHour, selectedMinute, selectedPeriod)})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalogTimePicker;
