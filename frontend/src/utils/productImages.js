/**
 * ============================================================================
 * BAKE HOUSE - Product Image Resolver & Fallback Helper
 * ============================================================================
 * Ensures every product (Spanish Bread, Cheesecake, Pandesal, etc.) always renders
 * its authentic picture instead of mistakenly sharing the generic chocolate cake image.
 * ============================================================================
 */

export const PRODUCT_IMAGE_MAP = {
  "spanish bread": "/uploads/productimg/spanish_bread.jpg",
  "cheesecake": "/uploads/productimg/cheesecake.jpg",
  "chocolate cake": "/uploads/productimg/chocolate_cake.jpg",
  "red velvet": "/uploads/productimg/red_velvet_cake.jpg",
  "butter croissant": "/uploads/productimg/butter_croissant.jpg",
  "croissant": "/uploads/productimg/butter_croissant.jpg",
  "cinnamon roll": "/uploads/productimg/cinnamon_roll.jpg",
  "blueberry muffin": "/uploads/productimg/blueberry_muffin.jpg",
  "muffin": "/uploads/productimg/blueberry_muffin.jpg",
  "cheese bread": "/uploads/productimg/cheese_bread.jpg",
  "pandesal": "/uploads/productimg/pandesal.jpg",
  "ube": "/uploads/productimg/ube_cake.jpg",
};

export const resolveProductImage = (itemOrProduct) => {
  const name = (itemOrProduct?.product_name || itemOrProduct?.name || "").trim().toLowerCase();
  const rawImg = itemOrProduct?.image;

  // If item has a specific non-placeholder, non-generic chocolate cake image
  if (
    rawImg &&
    !rawImg.includes("placeholder") &&
    !rawImg.endsWith("/chocolate_cake.jpg") &&
    rawImg !== "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500"
  ) {
    return rawImg;
  }

  // Exact or keyword match by product name
  for (const [key, path] of Object.entries(PRODUCT_IMAGE_MAP)) {
    if (name.includes(key)) {
      return path;
    }
  }

  if (rawImg && !rawImg.includes("placeholder")) {
    return rawImg;
  }

  if (name.includes("bread") || name.includes("bun") || name.includes("roll")) {
    return "/uploads/productimg/spanish_bread.jpg";
  }
  if (name.includes("cake")) {
    return "/uploads/productimg/cheesecake.jpg";
  }
  return "/uploads/productimg/butter_croissant.jpg";
};

export const getProductFallbackImage = (itemOrProduct) => {
  const name = (itemOrProduct?.product_name || itemOrProduct?.name || "").trim().toLowerCase();
  if (name.includes("bread") || name.includes("pandesal")) {
    return "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500";
  }
  if (name.includes("cheesecake")) {
    return "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500";
  }
  if (name.includes("croissant") || name.includes("pastry") || name.includes("muffin")) {
    return "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500";
  }
  return "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500";
};
