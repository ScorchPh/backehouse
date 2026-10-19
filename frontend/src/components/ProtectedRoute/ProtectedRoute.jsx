import { Navigate, useLocation } from "react-router-dom";
import { authService } from "../../services/authService";

/**
 * Route protection guard for sensitive administrative and staff views.
 * 
 * Behavior:
 * 1. If not authenticated -> redirects to /account with state preserving destination URL.
 * 2. If authenticated as customer -> shows access denied screen with quick action back to store.
 * 3. If authenticated as admin or staff -> renders the protected child views.
 */
export default function ProtectedRoute({ allowedRoles = ["admin", "staff"], children }) {
  const location = useLocation();
  const currentUser = authService.getCurrentUser();

  // 1. Not logged in -> Redirect to sign-in page
  if (!currentUser) {
    return (
      <Navigate
        to="/account"
        replace
        state={{
          redirect: location.pathname + location.search,
          message: "Please sign in with an Administrator or Staff account to access the Admin Portal.",
        }}
      />
    );
  }

  // 2. Logged in, but lacking required role
  const userRole = (currentUser.role || "").toLowerCase().trim();
  const isAllowed = allowedRoles.map((r) => r.toLowerCase()).includes(userRole);

  if (!isAllowed) {
    return (
      <div style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#FAF7F2",
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          maxWidth: "480px",
          width: "100%",
          background: "#FFFFFF",
          borderRadius: "16px",
          padding: "36px 28px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          textAlign: "center",
          border: "1px solid #EAE3D9"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
          <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#2B1E16", marginBottom: "8px" }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: "14px", color: "#6B5E55", lineHeight: "1.6", marginBottom: "24px" }}>
            The account <strong>{currentUser.email || currentUser.username}</strong> does not have permission to view the BAKE HOUSE Admin Portal. Only authorized store administrators and staff can access this section.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <a
              href="/"
              style={{
                display: "inline-block",
                padding: "12px 20px",
                borderRadius: "10px",
                background: "#D4A373",
                color: "#FFFFFF",
                fontWeight: "600",
                textDecoration: "none",
                fontSize: "14px",
                transition: "background 0.2s"
              }}
            >
              ← Return to Bakery Store
            </a>
            <button
              onClick={() => {
                authService.logout();
                window.location.href = "/account?redirect=" + encodeURIComponent(location.pathname);
              }}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "1px solid #D1C7BD",
                background: "transparent",
                color: "#6B5E55",
                fontWeight: "500",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              Switch Account / Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized -> Render protected route
  return children;
}
