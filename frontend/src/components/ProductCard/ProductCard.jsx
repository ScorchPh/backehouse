/**
 * ============================================================================
 * BAKE HOUSE - Product Card Component (Artisanal BakeSmart Design)
 * ============================================================================
 */

import "./ProductCard.css";

function ProductCard({ product, onViewDetails }) {
  const isOutOfStock =
    (product.stock !== undefined && product.stock <= 0) ||
    product.status === "Out of Stock";

  return (
    <div
      className={`bakesmart-product-card ${isOutOfStock ? "is-sold-out" : ""}`}
      onClick={() => onViewDetails(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onViewDetails(product);
        }
      }}
      title={`Click to view details for ${product.name}`}
    >
      <div className="card-image-box">
        {isOutOfStock ? (
          <span className="card-badge badge-sold-out">Sold Out</span>
        ) : product.bestseller ? (
          <span className="card-badge badge-gold">★ Best Seller</span>
        ) : (
          <span className="card-badge badge-neutral">{product.category || "Artisanal"}</span>
        )}

        <img
          src={product.image || "/uploads/productimg/chocolate_cake.jpg"}
          alt={product.name}
          className="card-main-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500";
          }}
        />

        <div className="card-hover-action-pill">
          <span>{isOutOfStock ? "Out of Stock" : "Quick View ↗"}</span>
        </div>
      </div>

      <div className="card-details-box">
        <div className="card-header-row">
          <h3 className="card-name-title">{product.name}</h3>
          <span className="card-price-text">
            ₱{parseFloat(product.price).toLocaleString()}
          </span>
        </div>

        <p className="card-description-snippet">
          {product.description ||
            "Freshly baked daily using heritage techniques and traditional slow fermentation."}
        </p>
      </div>
    </div>
  );
}

export default ProductCard;