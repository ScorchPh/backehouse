# CORDOVA PUBLIC COLLEGE
## COLLEGE OF COMPUTER STUDIES
### Bachelor of Science in Information Technology

---

# SOFTWARE TEST DESCRIPTION (STD)
### FOR
# BAKE HOUSE: ARTISANAL BAKERY MANAGEMENT, INTERACTIVE CAKE CUSTOMIZATION, AND DISPATCH SYSTEM

---

**Prepared by:**
* **Lead Developer / Author:** John Vincent C. Ong
* **Degree Program:** Bachelor of Science in Information Technology (BSIT)
* **Institution:** Cordova Public College, Gabi, Cordova, Cebu
* **Academic Year:** 2025–2026

**Approved by Evaluation Committee:**

_____________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; _____________________________
**Capstone Adviser** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Technical Panel Member**

_____________________________
**Dean, College of Computer Studies**

---

## Document Revision History

| Version | Date | Primary Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| **1.0** | September 2025 | John Vincent Ong | Initial draft of test strategy and basic authentication test cases. |
| **1.1** | October 2025 | John Vincent Ong | Incorporated test procedures for custom cake builder and chat communication. |
| **1.2** | February 2026 | John Vincent Ong | Added POS hardware thermal printing, kitchen queue transitions, and inventory deduction tests. |
| **2.0** | October 2026 | John Vincent Ong | Final defense release: Added dynamic VAT calculations, GPS pin accuracy, and full test execution log. |
| **2.1** | October 2026 | John Vincent Ong | Added test cases for mandatory customer login enforcement, dynamic delivery tariff propagation, and sub-4-second real-time tracking polling. |

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Test Plan](#2-test-plan)
3. [Test Cases](#3-test-cases)
   * 3.1 TC-01: User Registration, Direct Login, and Google OAuth Integration
   * 3.2 TC-02: Interactive Custom Cake Builder & Lead-Time Event Scheduling
   * 3.3 TC-03: Mandatory Customer Authentication Guard & Post-Auth Session Continuity
   * 3.4 TC-04: Dynamic Store Delivery Fee Configuration & Checkout Propagation
   * 3.5 TC-05: Kitchen Dispatch Queue Workflow (Live Queue vs. Scheduled Advance Orders)
   * 3.6 TC-06: Real-Time Order Lifecycle Polling & Status Stepper Synchronization
   * 3.7 TC-07: Custom Cake Order Denial with Structured Baker Clarification Note
   * 3.8 TC-08: 1-to-1 Custom Cake Consultation & Real-Time Baker Action Triggers
   * 3.9 TC-09: Counter POS Fast-Checkout, Cash Tender, and Thermal Printing (ESC/POS)
   * 3.10 TC-10: Atomic Stock Deduction & Automated Low-Stock Notification
   * 3.11 TC-11: Configurable Store VAT/Tax Computation & Financial Integrity
   * 3.12 TC-12: Cross-Device Responsive Layout & Touch Usability
4. [Appendix: Test Execution Logs & Summary Report](#4-appendix-test-execution-logs--summary-report)

---

## 1. Introduction
The **Software Test Description (STD)** for BAKE HOUSE establishes the formal test cases, procedures, and pass/fail criteria used to evaluate system performance and compliance with institutional requirements. Testing follows the IEEE 829 test documentation standard.

---

## 2. Test Plan
The verification cycle evaluates all primary subsystems:
1. Customer identity management, password encryption, and Google OAuth SSO.
2. Mandatory customer authentication enforcement prior to checkout or custom cake booking.
3. Parametric cake modeling, layer calculations, and lead time scheduling.
4. Database-driven dynamic delivery tariff calculations.
5. Kitchen queue dispatch segregation and order transitions.
6. Sub-4-second real-time order tracking polling.
7. Thermal receipt printing via Web Serial API.
8. Inventory deduction and low-stock warnings.
9. 12% BIR VAT calculations.

---

## 3. Test Cases

### 3.1 TC-01: User Registration, Direct Login, and Google OAuth Integration
* **Test Case ID:** `TC-01`
* **Purpose:** Verify that new customers can create an account, authenticate with BCrypt-hashed credentials, and sign in via Google OAuth.
* **Preconditions:** Database is reachable; email `testbaker@cpc.edu.ph` is not yet registered.
* **Result:** **PASS** (BCrypt hashing verified; session persisted in client state).

---

### 3.2 TC-02: Interactive Custom Cake Builder & Lead-Time Event Scheduling
* **Test Case ID:** `TC-02`
* **Purpose:** Verify dynamic 3D/layered canvas rendering, price accumulation, and enforcement of the 3-day lead time cutoff.
* **Preconditions:** Base pricing active in customizer settings; current date = Oct 14, 2026.
* **Result:** **PASS** (Preview updated dynamically; dates $< 72$ hours ahead blocked).

---

### 3.3 TC-03: Mandatory Customer Authentication Guard & Post-Auth Session Continuity
* **Test Case ID:** `TC-03`
* **Purpose:** Verify that unauthenticated guests are prevented from placing orders or ordering custom cakes, and that logging in redirects them back to their active checkout session.
* **Preconditions:** User is browsing as a guest (logged out); cart contains 2 bakery items.
* **Test Procedure:**
  1. Click "Proceed to Checkout" in Cart.
  2. Observe system behavior. (Expected: System displays "Sign In to Checkout" and navigates to `/account?redirect=/checkout` with message *"Please sign in or create an account to proceed to checkout"*).
  3. Navigate directly to `/checkout` as guest. (Expected: Checkout renders "Account Required to Checkout" security card).
  4. In Customizer, click "Add Scheduled Cake to Cart". (Expected: Status modal triggers informing user of account requirement).
  5. Log in with customer credentials. (Expected: System automatically redirects directly back to `/checkout` with cart items preserved).
* **Result:** **PASS** (Zero unauthenticated orders allowed; session restored seamlessly).

---

### 3.4 TC-04: Dynamic Store Delivery Fee Configuration & Checkout Propagation
* **Test Case ID:** `TC-04`
* **Purpose:** Verify that updating the standard delivery fee in Admin Settings persists to MySQL/TiDB and immediately reflects across checkout without hardcoded fallbacks.
* **Preconditions:** Administrator logged in; base catalog items in customer cart.
* **Test Procedure:**
  1. Open Admin Settings $ightarrow$ Delivery & Orders. Change delivery fee to ₱1,000.00. Save settings.
  2. Query database table `store_settings`. (Expected: JSON payload in `store_config` stores `delivery_fee = 1000`).
  3. Open Customer Checkout in another browser session.
  4. Inspect "Door-to-Door Delivery" option card and Order Summary. (Expected: Delivery card displays `₱1000.00 fee`; Order Summary lists `Delivery Fee: ₱1,000`).
* **Result:** **PASS** (Dynamic tariff propagated from database table cleanly).

---

### 3.5 TC-05: Kitchen Dispatch Queue Workflow
* **Test Case ID:** `TC-05`
* **Purpose:** Verify segregation of active daily baking queue from advance scheduled bookings and step-by-step order progression.
* **Result:** **PASS** (Tab filtering clean; status transitions execute smoothly).

---

### 3.6 TC-06: Real-Time Order Lifecycle Polling & Status Stepper Synchronization
* **Test Case ID:** `TC-06`
* **Purpose:** Verify that customer tracking screens update in real time when an order is marked as "Delivered" without requiring manual page reload.
* **Preconditions:** Customer is viewing Order #1008 on `/order-details` (current status: "For Delivery").
* **Test Procedure:**
  1. In Admin Queue, dispatcher clicks "Mark Delivered" on Order #1008.
  2. Observe customer tracking screen without touching the keyboard or mouse.
  3. Monitor network tab and DOM state. (Expected: Client polls `/api/orders/get_order_details.php` every 3.5 seconds; status updates to "Delivered"; timeline stepper advances to Step 4 within 3.5 seconds).
* **Result:** **PASS** (Automatic background sync executed in 3.2 seconds without page refresh).

---

### 3.7 TC-07: Custom Cake Order Denial with Structured Clarification Note
* **Test Case ID:** `TC-07`
* **Purpose:** Verify that rejecting an unfeasible custom cake design requires a descriptive note and displays the baker's feedback to the customer.
* **Result:** **PASS** (Denial blocked without explanation; note displayed on customer card).

---

### 3.8 TC-08: 1-to-1 Custom Cake Consultation & Baker Action Triggers
* **Test Case ID:** `TC-08`
* **Purpose:** Verify real-time messaging, photo attachment uploads, and baker quote adjustments within order-isolated channels.
* **Result:** **PASS** (Messages and images exchanged in $< 3$ seconds; quotes synced).

---

### 3.9 TC-09: Counter POS Fast-Checkout, Cash Tender, and Thermal Printing
* **Test Case ID:** `TC-09`
* **Purpose:** Verify cashier cart calculations, cash tender validation, change calculation, and ESC/POS thermal printing.
* **Result:** **PASS** (Exact change calculated; ESC/POS byte sequence dispatched to printer).

---

### 3.10 TC-10: Atomic Stock Deduction & Automated Low-Stock Notification
* **Test Case ID:** `TC-10`
* **Purpose:** Verify database inventory counts decrement atomically upon purchase and trigger dashboard alerts at threshold.
* **Result:** **PASS** (Stock count updated in DB; low-stock indicator rendered).

---

### 3.11 TC-11: Configurable Store VAT/Tax Computation & Financial Integrity
* **Test Case ID:** `TC-11`
* **Purpose:** Verify dynamic 12% BIR VAT calculations across counter receipts and customer checkout.
* **Result:** **PASS** (Centavo precision verified; VAT line toggles cleanly).

---

### 3.12 TC-12: Cross-Device Responsive Layout & Touch Usability
* **Test Case ID:** `TC-12`
* **Purpose:** Verify responsive layout across desktop ($1920	imes1080$), tablet ($768	imes1024$), and mobile ($375	imes667$).
* **Result:** **PASS** (Zero horizontal scroll overflow; sticky cake preview functional).

---

## 4. Appendix: Test Execution Logs & Summary Report

### 4.1 Test Execution Log

* **Lead Tester / Developer:** John Vincent C. Ong
* **Evaluation Date:** October 15, 2026
* **Target Build:** BAKE HOUSE v2.1 Release

| Test Case ID | Test Case Description | Execution Date | Environment | Tester | Result | Notes / Remarks |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **TC-01** | User Registration & OAuth Login | 2026-10-15 | Win11 / Chrome | J.V. Ong | **PASS** | BCrypt hashing verified; Google SSO token validated. |
| **TC-02** | Custom Cake Builder & Lead Time | 2026-10-15 | Win11 / Chrome | J.V. Ong | **PASS** | 72-hour lead time restriction prevented rush bookings. |
| **TC-03** | Auth Guard & Post-Auth Redirect | 2026-10-15 | Win11 / Chrome | J.V. Ong | **PASS** | Unauthenticated checkout blocked; redirected back post-login. |
| **TC-04** | Dynamic Delivery Fee Propagation | 2026-10-15 | Win11 / Chrome | J.V. Ong | **PASS** | Fee changed in DB reflected across checkout cards immediately. |
| **TC-05** | Kitchen Queue Segregation | 2026-10-15 | Win11 / Chrome | J.V. Ong | **PASS** | Clean separation between immediate daily bake and advance bookings. |
| **TC-06** | Real-Time Tracking Polling (3.5s) | 2026-10-15 | Multi-Tab | J.V. Ong | **PASS** | Status updated from 'For Delivery' to 'Delivered' in 3.2s. |
| **TC-07** | Order Denial with Baker Reason | 2026-10-15 | Win11 / Chrome | J.V. Ong | **PASS** | Mandatory reason validation enforced; displayed to customer. |
| **TC-08** | Real-Time Consultation Chat | 2026-10-15 | Multi-Browser | J.V. Ong | **PASS** | Image references uploaded and displayed in $< 3$ seconds. |
| **TC-09** | Counter POS & Thermal Printing | 2026-10-15 | POS / ESC/POS | J.V. Ong | **PASS** | Change calculated correctly; thermal receipt printed via Web Serial. |
| **TC-10** | Atomic Stock Deduction | 2026-10-15 | Win11 / MySQL | J.V. Ong | **PASS** | Stock decremented in DB; low-stock indicator triggered at threshold. |
| **TC-11** | Dynamic VAT/Tax Computation | 2026-10-15 | Win11 / Chrome | J.V. Ong | **PASS** | Philippine 12% VAT calculations verified accurate across all screens. |
| **TC-12** | Cross-Device Responsive Layout | 2026-10-15 | Desktop/Mobile | J.V. Ong | **PASS** | No layout shifting; sticky preview and mobile menus functional. |

---

### 4.2 Defect Tracking and Resolutions

1. **Defect #D-01 (Resolved): Chat Timestamp Discrepancy**  
   *Resolution:* Synchronized server and database timezone to `Asia/Manila` (PST/UTC+8).
2. **Defect #D-02 (Resolved): Broken Pending Icon in Queue**  
   *Resolution:* Standardized Lucide icon imports with SVG fallback handler.
3. **Defect #D-03 (Resolved): Mobile Cake Builder Preview Scrolling**  
   *Resolution:* Applied CSS sticky positioning to preview container.
4. **Defect #D-04 (Resolved): Hardcoded Delivery Fee in Checkout Option Card**  
   *Resolution:* Updated `Checkout.jsx` fulfillment card to read `configuredDeliveryFee` dynamically, and updated backend `get_settings.php` to query MySQL `store_settings` directly.
5. **Defect #D-05 (Resolved): Stale Order Tracking Status on Customer Screen**  
   *Resolution:* Implemented 3.5-second background polling cycle and window focus listeners in `MyOrders.jsx` and `OrderDetails.jsx`.
6. **Defect #D-06 (Resolved): Unauthenticated Guest Checkout & Missing Chat Trigger**  
   *Resolution:* Added customer authentication guard before checkout and custom cake submission, and made floating chat trigger visible to guests with sign-in guidance.

---

### 4.3 Final Assessment and Test Sign-Off

* **Total Test Cases Executed:** 12
* **Test Cases Passed:** 12 (100%)
* **Critical Defects Open:** 0

**Conclusion:** The **BAKE HOUSE** platform satisfies all architectural, functional, and non-functional requirements. The system is verified for formal capstone defense at Cordova Public College.

---

**Signed by:**

_____________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; _____________________________  
**John Vincent C. Ong** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Capstone Adviser**  
Lead Developer / Author &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Cordova Public College
