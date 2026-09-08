/**
 * ============================================================================
 * BAKE HOUSE - Featured Products Homepage Component
 * ============================================================================
 * Capstone Project Explanation:
 * Dynamically fetches live best-selling bakery products from the PHP backend API
 * (/api/products/get_products.php?bestseller=1) instead of hardcoded data.
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./FeaturedProducts.css";
import { productService } from "../../services/productService";
import ProductModal from "../ProductModal/ProductModal";

function FeaturedProducts() {
  const [featuredList, setFeaturedList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatured() {
      try {
        setLoading(true);
        const data = await productService.getProducts({ bestseller: true });
        if (data && data.products && data.products.length > 0) {
          setFeaturedList(data.products.slice(0, 4));
        } else {
          // Fallback to all products if no explicit bestsellers flagged
          const allData = await productService.getProducts();
          if (allData && allData.products) {
            setFeaturedList(allData.products.slice(0, 4));
          }
        }
      } catch (err) {
        console.warn("Could not load featured products from backend:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFeatured();
  }, []);

  return (
    <section className="featured">
      <div className="featured-title">
        <h2>Featured Delights</h2>
        <p>
          Freshly baked favorites crafted with premium ingredients and made
          with love every single morning.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
          Loading daily favorites...
        </div>
      ) : (
        <div className="product-grid">
          {featuredList.map((product) => (
            <div className="product-card" key={product.id}>
              <img
                src={product.image || "/uploads/productimg/chocolate_cake.jpg"}
                alt={product.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500";
                }}
              />

              <div className="product-info">
                <h3>{product.name}</h3>
                <p>{product.description}</p>

                <div className="product-bottom">
                  <span>₱{parseFloat(product.price).toLocaleString()}</span>
                  <button onClick={() => setSelectedProduct(product)}>
                    {product.stock <= 0 ? "Out of Stock" : "Order Now"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </section>
  );
}

export default FeaturedProducts;