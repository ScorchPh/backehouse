/**
 * ============================================================================
 * BAKE HOUSE - Admin Customer Management Component
 * ============================================================================
 * Capstone Project Explanation:
 * Displays all registered customer profiles from /api/auth/customers.php.
 * Allows filtering, search, and viewing customer contact information.
 * ============================================================================
 */

import { useState, useEffect } from "react";
import "./Customers.css";
import { authService } from "../../../services/authService";
import UserAvatar from "../../../components/UserAvatar/UserAvatar";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const fetchCustomerList = async () => {
    try {
      setLoading(true);
      const res = await authService.getCustomers();
      if (res && res.customers) {
        setCustomers(res.customers);
      }
    } catch (err) {
      console.error("Failed to load customer list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerList();
  }, []);

  // ============================================================================
  // LEARNING NOTE: Resilient Client-Side Search & Case-Insensitive Filtering
  // ----------------------------------------------------------------------------
  // 1. When querying contact numbers, customers may type partial digits (e.g. '0917').
  //    Including contact_number in client-side search makes lookup instant.
  // 2. Database strings may have inconsistent casing (e.g. 'Customer' vs 'customer').
  //    Always use .toLowerCase() on both sides of role checks to avoid missing records.
  // ============================================================================
  const filteredCustomers = customers.filter((c) => {
    const q = searchTerm.toLowerCase().trim();
    const fullName = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
    const contact = (c.contact_number || "").toLowerCase();
    const email = (c.email || "").toLowerCase();
    const username = (c.username || "").toLowerCase();

    const matchesSearch =
      !q ||
      fullName.includes(q) ||
      email.includes(q) ||
      username.includes(q) ||
      contact.includes(q);

    const userRole = (c.role || "").toLowerCase();
    const matchesRole =
      roleFilter === "all" || userRole === roleFilter.toLowerCase();

    return matchesSearch && matchesRole;
  });

  const totalCount = customers.length;
  const customerRoleCount = customers.filter((c) => (c.role || "").toLowerCase() === "customer").length;
  const staffRoleCount = customers.filter((c) => {
    const r = (c.role || "").toLowerCase();
    return r === "staff" || r === "admin";
  }).length;

  return (
    <div className="customers-page">
      {/* Header */}
      <div className="customers-header">
        <div>
          <h1>Registered Users & Customers</h1>
          <p>View registered customer accounts, staff members, and details.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="customer-summary">
        <div className="customer-summary-card">
          <span>Total Accounts</span>
          <strong>{totalCount}</strong>
        </div>

        <div className="customer-summary-card">
          <span>Customers</span>
          <strong style={{ color: "#10B981" }}>{customerRoleCount}</strong>
        </div>

        <div className="customer-summary-card">
          <span>Staff & Admins</span>
          <strong style={{ color: "#3B82F6" }}>{staffRoleCount}</strong>
        </div>
      </div>

      {/* Customer Panel */}
      <div className="customers-panel">
        {/* Search and Filter */}
        <div className="customers-tools">
          <input
            type="text"
            placeholder="Search by name, email, phone, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="customer">Customers Only</option>
            <option value="staff">Staff Only</option>
            <option value="admin">Admins Only</option>
          </select>
        </div>

        {/* Customer Table */}
        <div className="customers-table">
          <div className="customers-table-header">
            <span>User Profile</span>
            <span>Username</span>
            <span>Contact Number</span>
            <span>Role</span>
            <span>Registered</span>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
              Loading user accounts...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
              No accounts found matching your search.
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div className="customers-table-row" key={customer.id}>
                <div className="customer-info">
                  <UserAvatar user={customer} className="customer-avatar" size={42} />

                  <div>
                    <strong>{customer.first_name} {customer.last_name}</strong>
                    <small>{customer.email}</small>
                  </div>
                </div>

                <span>@{customer.username}</span>

                <span>{customer.contact_number || "—"}</span>

                <span>
                  <span
                    className={`customer-status ${customer.role === "admin" ? "blocked" : "active"}`}
                    style={{
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      background: customer.role === "admin" ? "#FEE2E2" : customer.role === "staff" ? "#DBEAFE" : "#D1FAE5",
                      color: customer.role === "admin" ? "#DC2626" : customer.role === "staff" ? "#1D4ED8" : "#047857",
                    }}
                  >
                    {customer.role}
                  </span>
                </span>

                <span>{customer.created_at ? new Date(customer.created_at).toLocaleDateString() : "Active"}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Customers;