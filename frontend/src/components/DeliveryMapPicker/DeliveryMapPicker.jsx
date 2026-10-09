import { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./DeliveryMapPicker.css";

const STORE_LOCATION = {
  lat: 10.2520,
  lng: 123.9486,
  name: "BAKE HOUSE Main Branch",
  address: "Poblacion, Cordova, Cebu"
};

const POPULAR_AREAS = [
  { name: "Poblacion", lat: 10.2520, lng: 123.9486, city: "Cordova" },
  { name: "Bangbang", lat: 10.2612, lng: 123.9450, city: "Cordova" },
  { name: "Gabi", lat: 10.2705, lng: 123.9575, city: "Cordova" },
  { name: "San Miguel", lat: 10.2555, lng: 123.9422, city: "Cordova" },
  { name: "Day-as", lat: 10.2450, lng: 123.9470, city: "Cordova" },
  { name: "Pilipog", lat: 10.2740, lng: 123.9460, city: "Cordova" },
  { name: "Ibabao", lat: 10.2645, lng: 123.9520, city: "Cordova" },
  { name: "Buagsong", lat: 10.2660, lng: 123.9410, city: "Cordova" },
  { name: "Alegria", lat: 10.2415, lng: 123.9560, city: "Cordova" },
  { name: "Catarman", lat: 10.2485, lng: 123.9580, city: "Cordova" },
  { name: "Marigondon", lat: 10.2750, lng: 123.9780, city: "Lapu-Lapu" },
  { name: "Subabasbas", lat: 10.2820, lng: 123.9620, city: "Lapu-Lapu" }
];

function calculateHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const storeIcon = L.divIcon({
  className: "custom-store-marker",
  html: `<div class="marker-store-pin"><span>🎂</span><div class="marker-label">BAKE HOUSE</div></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 36],
  popupAnchor: [0, -32]
});

const deliveryPinIcon = L.divIcon({
  className: "custom-delivery-marker",
  html: `<div class="marker-delivery-pin"><span>📍</span><div class="marker-pulse"></div></div>`,
  iconSize: [38, 48],
  iconAnchor: [19, 44],
  popupAnchor: [0, -40]
});

function DeliveryMapPicker({ onLocationSelected, initialBarangay = "Poblacion", initialCoordinates = null }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const routeLineRef = useRef(null);

  const [pinPosition, setPinPosition] = useState(() => {
    if (initialCoordinates && initialCoordinates.lat && initialCoordinates.lng) {
      const lat = parseFloat(initialCoordinates.lat);
      const lng = parseFloat(initialCoordinates.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return { lat: 10.2540, lng: 123.9490 };
  });

  const [distanceKm, setDistanceKm] = useState(1.2);
  const [transitMins, setTransitMins] = useState(5);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState("25–35 Minutes");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState("Cordova, Cebu");

  const arrivalWindow = useMemo(() => {
    const now = new Date();
    const minMins = 15 + transitMins;
    const maxMins = 25 + transitMins;

    const minTime = new Date(now.getTime() + minMins * 60000);
    const maxTime = new Date(now.getTime() + maxMins * 60000);

    const formatT = (d) =>
      d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    return `${formatT(minTime)} – ${formatT(maxTime)}`;
  }, [transitMins]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [pinPosition.lat, pinPosition.lng],
      zoom: 14,
      zoomControl: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    const storeMarker = L.marker([STORE_LOCATION.lat, STORE_LOCATION.lng], {
      icon: storeIcon
    }).addTo(map);
    storeMarker.bindPopup("<b>BAKE HOUSE Main Branch</b><br/>Poblacion, Cordova, Cebu");

    const pin = L.marker([pinPosition.lat, pinPosition.lng], {
      icon: deliveryPinIcon,
      draggable: true
    }).addTo(map);

    pin.bindPopup("<b>Your Delivery Pin</b><br/>Drag to your exact subdivision or house gate.");

    pin.on("dragend", (e) => {
      const { lat, lng } = e.target.getLatLng();
      updatePinPosition(lat, lng);
    });

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      pin.setLatLng([lat, lng]);
      updatePinPosition(lat, lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = pin;

    calculateRoute(pinPosition.lat, pinPosition.lng);

    const resizeTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const getNearestNeighborhood = (lat, lng) => {
    let nearest = POPULAR_AREAS[0];
    let minDistance = Infinity;

    for (const area of POPULAR_AREAS) {
      const d = calculateHaversine(lat, lng, area.lat, area.lng);
      if (d < minDistance) {
        minDistance = d;
        nearest = area;
      }
    }
    return nearest;
  };

  const reverseGeocode = async (lat, lng) => {
    const nearestArea = getNearestNeighborhood(lat, lng);

    let parsedStreet = "";
    let parsedBarangay = nearestArea.name;
    let parsedCity = nearestArea.city || "Cordova";
    let parsedProvince = "Cebu";
    let formattedSummary = `${nearestArea.name}, ${parsedCity}`;

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();

      if (data && data.address) {
        const addr = data.address;

        const roadParts = [];
        if (addr.house_number) roadParts.push(addr.house_number);
        if (addr.road) roadParts.push(addr.road);
        else if (addr.residential) roadParts.push(addr.residential);
        else if (addr.subdivision) roadParts.push(addr.subdivision);
        else if (addr.neighbourhood && addr.neighbourhood !== addr.village) roadParts.push(addr.neighbourhood);

        parsedStreet = roadParts.join(" ");

        const rawBarangay =
          addr.village ||
          addr.suburb ||
          addr.quarter ||
          addr.neighbourhood ||
          addr.hamlet ||
          nearestArea.name;

        parsedBarangay = rawBarangay.replace(/^(Barangay|Brgy\.?)\s+/i, "").trim();

        parsedCity =
          addr.municipality ||
          addr.town ||
          addr.city ||
          nearestArea.city ||
          "Cordova";

        parsedProvince = addr.province || addr.state_district || "Cebu";

        const displayParts = data.display_name ? data.display_name.split(",") : [];
        formattedSummary = displayParts.slice(0, 3).join(", ") || `${parsedBarangay}, ${parsedCity}`;
      }
    } catch (e) {
      console.warn("Reverse geocode network issue, using nearest area fallback:", e);
    }

    setDetectedAddress(formattedSummary);

    const addressDetails = {
      street: parsedStreet,
      barangay: parsedBarangay,
      city: parsedCity,
      province: parsedProvince,
      fullFormattedAddress: formattedSummary
    };

    calculateRoute(lat, lng, addressDetails);
  };

  const updatePinPosition = (lat, lng) => {
    setPinPosition({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const calculateRoute = async (destLat, destLng, addressDetails = null) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${STORE_LOCATION.lng},${STORE_LOCATION.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      let roadKm = 1.0;
      let driveMins = 5;

      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        roadKm = Math.round((route.distance / 1000) * 10) / 10;
        driveMins = Math.max(3, Math.round(route.duration / 60));

        if (mapInstanceRef.current) {
          if (routeLineRef.current) {
            mapInstanceRef.current.removeLayer(routeLineRef.current);
          }

          const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          const polyline = L.polyline(coordinates, {
            color: "#8B4513",
            weight: 4,
            opacity: 0.85,
            dashArray: "6, 8"
          }).addTo(mapInstanceRef.current);

          routeLineRef.current = polyline;
        }
      } else {
        const directKm = calculateHaversine(STORE_LOCATION.lat, STORE_LOCATION.lng, destLat, destLng);
        roadKm = Math.round(directKm * 1.35 * 10) / 10;
        driveMins = Math.max(4, Math.round((roadKm / 25) * 60));
      }

      setDistanceKm(roadKm);
      setTransitMins(driveMins);

      const minETA = 15 + driveMins;
      const maxETA = 25 + driveMins;
      const timeStr = `${minETA}–${maxETA} Minutes`;
      setEstimatedDeliveryTime(timeStr);

      if (onLocationSelected) {
        onLocationSelected({
          coordinates: { lat: destLat, lng: destLng },
          distanceKm: roadKm,
          transitMinutes: driveMins,
          estimatedDeliveryTime: timeStr,
          arrivalWindow,
          addressDetails: addressDetails || {
            street: "",
            barangay: getNearestNeighborhood(destLat, destLng).name,
            city: getNearestNeighborhood(destLat, destLng).city || "Cordova",
            province: "Cebu"
          }
        });
      }
    } catch (err) {
      console.warn("OSRM routing unavailable, using local calculation:", err);
      const directKm = calculateHaversine(STORE_LOCATION.lat, STORE_LOCATION.lng, destLat, destLng);
      const roadKm = Math.max(0.8, Math.round(directKm * 1.35 * 10) / 10);
      const driveMins = Math.max(4, Math.round((roadKm / 25) * 60));
      const timeStr = `${15 + driveMins}–${25 + driveMins} Minutes`;

      setDistanceKm(roadKm);
      setTransitMins(driveMins);
      setEstimatedDeliveryTime(timeStr);

      if (onLocationSelected) {
        onLocationSelected({
          coordinates: { lat: destLat, lng: destLng },
          distanceKm: roadKm,
          transitMinutes: driveMins,
          estimatedDeliveryTime: timeStr,
          arrivalWindow,
          addressDetails: addressDetails || {
            street: "",
            barangay: getNearestNeighborhood(destLat, destLng).name,
            city: getNearestNeighborhood(destLat, destLng).city || "Cordova",
            province: "Cebu"
          }
        });
      }
    }
  };

  const handleJumpToArea = (area) => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    mapInstanceRef.current.flyTo([area.lat, area.lng], 16, { duration: 1.2 });
    markerRef.current.setLatLng([area.lat, area.lng]);
    updatePinPosition(area.lat, area.lng);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const query = `${searchQuery.trim()}, Cordova, Cebu, Philippines`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const results = await res.json();

      if (results && results.length > 0) {
        const first = results[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
          markerRef.current.setLatLng([lat, lng]);
          updatePinPosition(lat, lng);
        }
      } else {
        alert(`Could not find "${searchQuery}". Please drag the pin on the map directly to your house or subdivision!`);
      }
    } catch (err) {
      console.warn("Geocoding failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. Please drag the pin on the map.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
          markerRef.current.setLatLng([lat, lng]);
          updatePinPosition(lat, lng);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn("GPS lookup denied or unavailable:", err.message);
        alert("Could not access GPS location. You can easily drag the red pin 📍 on the map to your subdivision!");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="delivery-map-picker-card">
      <div className="map-picker-header">
        <div>
          <h3>📍 Pinpoint Your Delivery Location (Shopee Style)</h3>
          <p>Drag the pin 📍 or tap on the map right at your subdivision, street, or house gate.</p>
        </div>
        <button
          type="button"
          onClick={handleLocateMe}
          className="locate-me-btn"
          disabled={isLocating}
          title="Detect my current location"
        >
          {isLocating ? "⏳ Locating..." : "🎯 Use My Location"}
        </button>
      </div>

      <form onSubmit={handleSearch} className="map-search-form">
        <input
          type="text"
          placeholder="Search subdivision, street, or landmark (e.g. Villa Teresa, Camella, Gabi)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="submit" disabled={isSearching}>
          {isSearching ? "Searching..." : "🔍 Search"}
        </button>
      </form>

      <div className="quick-areas-bar">
        <span>Quick Jump:</span>
        <div className="quick-chips-scroll">
          {POPULAR_AREAS.map((area) => (
            <button
              key={area.name}
              type="button"
              className="area-chip"
              onClick={() => handleJumpToArea(area)}
            >
              {area.name}
            </button>
          ))}
        </div>
      </div>

      <div className="leaflet-map-wrapper">
        <div ref={mapContainerRef} className="leaflet-map-element" />
        <div className="map-instruction-overlay">
          💡 <strong>Tip:</strong> Drag the red pin 📍 to your exact house / gate.
        </div>
      </div>

      <div className="delivery-analytics-banner">
        <div className="analytic-item">
          <span className="analytic-icon">📏</span>
          <div>
            <strong>Road Distance</strong>
            <p>{distanceKm} km from bakery</p>
          </div>
        </div>

        <div className="analytic-item highlight">
          <span className="analytic-icon">⏱️</span>
          <div>
            <strong>Estimated Delivery Time</strong>
            <p className="eta-text">{estimatedDeliveryTime}</p>
          </div>
        </div>

        <div className="analytic-item">
          <span className="analytic-icon">🕒</span>
          <div>
            <strong>Estimated Arrival Window</strong>
            <p>{arrivalWindow}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeliveryMapPicker;
