/**
 * ============================================================================
 * BAKE HOUSE - Product Service
 * ============================================================================
 * Capstone Project Explanation:
 * Manages product catalog, inventory requests, and file uploads:
 * - /api/products/get_products.php (Catalog with filters & search)
 * - /api/products/get_product.php (Single product view)
 * - /api/products/create_product.php (Admin add product)
 * - /api/products/update_product.php (Admin edit product / stock)
 * - /api/products/delete_product.php (Admin delete product)
 * - /api/products/upload_image.php (Multipart file upload to backend/uploads/productimg/)
 * ============================================================================
 */

import { apiRequest } from './apiClient';

export const productService = {
  /**
   * Fetch all products with optional filters
   */
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') {
      query.append('category', params.category);
    }
    if (params.search) {
      query.append('search', params.search);
    }
    if (params.bestseller) {
      query.append('bestseller', '1');
    }

    const qs = query.toString() ? `?${query.toString()}` : '';
    return await apiRequest(`/products/get_products.php${qs}`, { method: 'GET' });
  },

  /**
   * Fetch single product by ID
   */
  async getProductById(id) {
    return await apiRequest(`/products/get_product.php?id=${id}`, { method: 'GET' });
  },

  /**
   * Admin / Staff: Add a new bakery product
   */
  async createProduct(productData) {
    return await apiRequest('/products/create_product.php', {
      method: 'POST',
      body: productData,
    });
  },

  /**
   * Admin / Staff: Update product details, price, or stock
   */
  async updateProduct(id, productData) {
    return await apiRequest('/products/update_product.php', {
      method: 'POST',
      body: { id, ...productData },
    });
  },

  /**
   * Admin: Delete product
   */
  async deleteProduct(id) {
    return await apiRequest('/products/delete_product.php', {
      method: 'POST',
      body: { id },
    });
  },

  /**
   * Upload a product image file directly to backend/uploads/productimg/
   */
  async uploadProductImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://backehouse.onrender.com/api';
    const response = await fetch(`${apiBaseUrl}/products/upload_image.php`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || 'Failed to upload product image file.');
    }
    return data;
  }
};
