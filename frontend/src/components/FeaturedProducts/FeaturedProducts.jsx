/**
 * ============================================================================
 * BAKE HOUSE - Featured Products Homepage Component (Picture 2 Card Style)
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./FeaturedProducts.css";
import { productService } from "../../services/productService";
import ProductCard from "../ProductCard/ProductCard";
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
    <section className="featured-section">
      <div className="featured-header-row">
        <div>
          <span className="section-label-gold">HANDPICKED FAVORITES</span>
          <h2 className="featured-main-title">Daily Best Sellers</h2>
          <p className="featured-subtitle">
            Freshly baked favorites crafted with organic heritage grains and baked fresh every morning.
          </p>
        </div>
        <Link to="/menu" className="view-all-gold-btn">
          Explore All Products →
        </Link>
      </div>

      {loading ? (
        <div className="featured-loading-box">
          Loading daily favorites...
        </div>
      ) : (
        <div className="bakesmart-products-grid">
          {featuredList.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onViewDetails={setSelectedProduct}
            />
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