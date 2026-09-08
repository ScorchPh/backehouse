import "./Location.css";

function Location() {
  return (
    <section className="location">
      <div className="location-header">
        <h2>Visit Our Bakery</h2>
        <p>
          We'd love to welcome you! Stop by for freshly baked treats or contact
          us for custom cake orders.
        </p>
      </div>

      <div className="location-container">
        <div className="location-info">
          <h3>BAKE HOUSE</h3>

          <p>
            📍 123 Bakery Street, Cebu City, Philippines
          </p>

          <p>
            📞 +63 912 345 6789
          </p>

          <p>
            📧 bakehouse@email.com
          </p>

          <p>
            🕒 Monday - Sunday
            <br />
            7:00 AM - 8:00 PM
          </p>
        </div>

        <div className="location-map">
          <iframe
            title="Bake House Location"
            src="https://www.google.com/maps?q=Cebu%20City&output=embed"
            allowFullScreen=""
            loading="lazy"
          ></iframe>
        </div>
      </div>
    </section>
  );
}

export default Location;