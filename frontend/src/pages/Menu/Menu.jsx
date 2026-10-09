/**
 * ============================================================================
 * BAKE HOUSE - Menu / Browse Page Component (Picture 2 Artisanal Collection)
 * ============================================================================
 */

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import "./Menu.css";
import fallbackProducts from "../../data/products";
import { productService } from "../../services/productService";
import ProductCard from "../../components/ProductCard/ProductCard";
import ProductModal from "../../components/ProductModal/ProductModal";

function Menu() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";

  const [productsList, setProductsList] = useState(fallbackProducts);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBestsellerOnly, setFilterBestsellerOnly] = useState(false);
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("recommended");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const ITEMS_PER_PAGE = 8;

  // Sync category param if URL changes
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

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

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
    if (cat === "All") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", cat);
    }
    setSearchParams(searchParams);
  };

  // Filter and sort products
  const processedProducts = useMemo(() => {
    let result = productsList.filter((product) => {
      // Category filter
      const matchesCategory =
        selectedCategory === "All" ||
        (product.category && product.category.toLowerCase() === selectedCategory.toLowerCase());

      // Search keyword
      const matchesSearch =
        !searchTerm.trim() ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // Bestseller preference
      const matchesBestseller = !filterBestsellerOnly || Boolean(product.bestseller);

      // In-stock preference
      const isOutOfStock =
        (product.stock !== undefined && product.stock <= 0) || product.status === "Out of Stock";
      const matchesInStock = !filterInStockOnly || !isOutOfStock;

      return matchesCategory && matchesSearch && matchesBestseller && matchesInStock;
    });

    // Sorting
    if (sortBy === "price-low") {
      result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Recommended: Bestsellers first
      result.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0));
    }

    return result;
  }, [productsList, selectedCategory, searchTerm, filterBestsellerOnly, filterInStockOnly, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(processedProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [processedProducts, currentPage]);

  const categories = ["All", "Bread", "Pastry", "Cake"];

  return (
    <div className="bakesmart-menu-page">
      <div className="menu-inner-container">
        {/* Top Header Row (Picture 2 style) */}
        <div className="menu-header-bar">
          <div className="menu-header-title-box">
            <h1>Artisanal Collection</h1>
            <p>
              Freshly baked daily using heritage-grains and traditional slow-fermentation methods.
            </p>
          </div>

          {/* Top Category Filter Pills (Picture 2 style) */}
          <div className="category-pills-row">
            {categories.map((cat) => {
              const label = cat === "All" ? "All" : cat === "Bread" ? "Sourdough & Breads" : `${cat}s`;
              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  className={`cat-pill-btn ${isActive ? "active" : ""}`}
                  onClick={() => handleSelectCategory(cat)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter & Preference Bar (Picture 2 style) */}
        <div className="menu-filter-controls-row">
          <div className="filter-preferences-left">
            <div className="menu-search-wrapper">
              <span className="search-icon-hint">🔍</span>
              <input
                type="text"
                placeholder="Search flavors, breads..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="menu-search-input"
              />
            </div>

            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={filterBestsellerOnly}
                onChange={(e) => {
                  setFilterBestsellerOnly(e.target.checked);
                  setCurrentPage(1);
                }}
              />
              <span>⭐ Featured Only</span>
            </label>

            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={filterInStockOnly}
                onChange={(e) => {
                  setFilterInStockOnly(e.target.checked);
                  setCurrentPage(1);
                }}
              />
              <span>In Stock Only</span>
            </label>
          </div>

          <div className="filter-sort-right">
            <span className="sort-label">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="menu-sort-select"
            >
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid (Picture 2: 4 columns!) */}
        {loading ? (
          <div className="menu-loading-state">
            <p>Loading freshly baked artisanal delights...</p>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="menu-empty-state">
            <h3>No products found</h3>
            <p>Try clearing your search term or selecting another category.</p>
            <button
              type="button"
              className="reset-filter-btn"
              onClick={() => {
                setSelectedCategory("All");
                setSearchTerm("");
                setFilterBestsellerOnly(false);
                setFilterInStockOnly(false);
                setCurrentPage(1);
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="bakesmart-grid-4col">
            {paginatedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={setSelectedProduct}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls (Picture 2 style) */}
        {totalPages > 1 && (
          <div className="bakesmart-pagination-row">
            <button
              type="button"
              className="page-nav-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`page-num-btn ${currentPage === num ? "active" : ""}`}
                onClick={() => setCurrentPage(num)}
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              className="page-nav-btn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Product Details Modal */}
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