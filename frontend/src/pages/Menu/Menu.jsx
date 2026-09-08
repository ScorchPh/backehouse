/**
 * ============================================================================
 * BAKE HOUSE - Menu Page Component
 * ============================================================================
 * Capstone Project Explanation:
 * Displays bakery products fetched dynamically from the PHP REST API.
 * Features:
 * - Live category filtering (Breads, Cakes, Pastries).
 * - Real-time keyword search.
 * - Product Details Modal with Add-to-Cart controls.
 * ============================================================================
 */

import { useState, useEffect } from "react";
import "./Menu.css";
import fallbackProducts from "../../data/products";
import { productService } from "../../services/productService";
import ProductCard from "../../components/ProductCard/ProductCard";
import ProductModal from "../../components/ProductModal/ProductModal";

function Menu() {
  const [productsList, setProductsList] = useState(fallbackProducts);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch catalog from PHP Backend
  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const data = await productService.getProducts();
        if (data && data.products && data.products.length > 0) {
          setProductsList(data.products);
        }
      } catch (err) {
        console.warn("Backend API unavailable, using fallback menu items:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, []);

  const bestSellers = productsList.filter((product) => product.bestseller);

  const filteredProducts = productsList.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" ||
      product.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="menu">
      {/* Hero */}
      <section className="menu-hero">
        <h1>Our Menu</h1>
        <p>
          Discover our freshly baked breads, handcrafted cakes,
          and delicious pastries made with the finest ingredients.
        </p>
      </section>

      {/* Search & Categories */}
      <section className="menu-filter">
        <input
          type="text"
          placeholder="Search products..."
          className="search-bar"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="category-buttons">
          <button
            className={selectedCategory === "All" ? "active" : ""}
            onClick={() => setSelectedCategory("All")}
          >
            All
          </button>

          <button
            className={selectedCategory === "Bread" ? "active" : ""}
            onClick={() => setSelectedCategory("Bread")}
          >
            Breads
          </button>

          <button
            className={selectedCategory === "Cake" ? "active" : ""}
            onClick={() => setSelectedCategory("Cake")}
          >
            Cakes
          </button>

          <button
            className={selectedCategory === "Pastry" ? "active" : ""}
            onClick={() => setSelectedCategory("Pastry")}
          >
            Pastries
          </button>
        </div>
      </section>

      {/* Best Sellers */}
      {selectedCategory === "All" && !searchTerm && bestSellers.length > 0 && (
        <section className="best-sellers">
          <div className="section-title">
            <h2>Best Sellers</h2>
            <p>Our customers' favorite freshly baked treats.</p>
          </div>

          <div className="products-grid">
            {bestSellers.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={setSelectedProduct}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Products */}
      <section className="all-products">
        <div className="section-title">
          <h2>{selectedCategory === "All" ? "All Products" : `${selectedCategory}s`}</h2>
          <p>
            Browse our complete collection of freshly baked delights.
          </p>
        </div>

        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            <h3>No products found matching "{searchTerm}".</h3>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={setSelectedProduct}
              />
            ))}
          </div>
        )}
      </section>

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

export default Menu;