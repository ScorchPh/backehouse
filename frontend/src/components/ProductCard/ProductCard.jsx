/**
 * ============================================================================
 * BAKE HOUSE - Product Card Component
 * ============================================================================
 * Capstone Project Explanation:
 * Displays single product thumbnail, price, description, and live stock badge.
 * ============================================================================
 */

import "./ProductCard.css";

function ProductCard({ product, onViewDetails }) {
  const isOutOfStock = (product.stock !== undefined && product.stock <= 0) || product.status === "Out of Stock";

  return (
    <div className="product-card">
      {isOutOfStock ? (
        <span className="badge out-of-stock-badge">
          Out of Stock
        </span>
      ) : product.bestseller ? (
        <span className="badge">
          ⭐ Best Seller
        </span>
      ) : null}

      <img
        src={product.image || "/uploads/productimg/chocolate_cake.jpg"}
        alt={product.name}
        className="product-image"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500";
        }}
      />

      <div className="product-info">
        <h3>{product.name}</h3>
        <p>{product.description}</p>

        <div className="product-footer">
          <span className="product-price">
            ₱{parseFloat(product.price).toLocaleString()}
          </span>

          <button
            className={`product-btn ${isOutOfStock ? "disabled-btn" : ""}`}
            onClick={() => onViewDetails(product)}
            disabled={isOutOfStock}
          >
            {isOutOfStock ? "Sold Out" : "View Details"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;