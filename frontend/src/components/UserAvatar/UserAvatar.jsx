import { useState } from "react";
import "./UserAvatar.css";

/**
 * Returns initials from first_name and last_name, or from name/username.
 * Examples:
 * - John Ong -> "JO"
 * - Store Administrator -> "SA"
 * - Juan Dela Cruz -> "JD"
 */
export function getUserInitials(user) {
  if (!user) return "U";
  const first = (user.first_name || "").trim();
  const last = (user.last_name || "").trim();

  if (first && last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }

  const fullName = (user.name || first || last || user.username || "").trim();
  if (!fullName) return "U";

  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

/**
 * Checks if the user signed in with Google and has a valid Google profile picture.
 */
export function isGoogleUserWithPhoto(user) {
  if (!user) return false;
  const avatar = typeof user.avatar === "string" ? user.avatar.trim() : "";
  if (!avatar) return false;

  // Filter out any unsplash placeholder images
  if (avatar.includes("unsplash.com")) return false;

  // Check for google_id or googleusercontent avatar domain
  const isGoogle = Boolean(
    user.google_id ||
    user.auth_provider === "google" ||
    avatar.includes("googleusercontent.com") ||
    avatar.includes("google.com")
  );

  return isGoogle;
}

export default function UserAvatar({
  user,
  className = "",
  size,
  style = {},
  alt = "Profile Avatar",
}) {
  const [imageError, setImageError] = useState(false);

  const showGoogleImage = !imageError && isGoogleUserWithPhoto(user);
  const initials = getUserInitials(user);

  const inlineSizeStyle = size
    ? {
        width: typeof size === "number" ? `${size}px` : size,
        height: typeof size === "number" ? `${size}px` : size,
      }
    : {};

  if (showGoogleImage) {
    return (
      <img
        src={user.avatar}
        alt={alt}
        className={`user-avatar-image ${className}`.trim()}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
        style={{ ...inlineSizeStyle, ...style }}
      />
    );
  }

  return (
    <div
      className={`user-avatar-initials ${className}`.trim()}
      title={
        user?.first_name
          ? `${user.first_name} ${user.last_name || ""}`.trim()
          : user?.username || "User Profile"
      }
      style={{ ...inlineSizeStyle, ...style }}
    >
      <span className="user-avatar-initials-text">{initials}</span>
    </div>
  );
}
