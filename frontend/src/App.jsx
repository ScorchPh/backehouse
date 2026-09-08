import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";

import Settings from "./pages/Admin/Settings/Settings";
import Reports from "./pages/Admin/Reports/Reports";
import Customers from "./pages/Admin/Customers/Customers";
import Products from "./pages/Admin/Products/Products";
import Orders from "./pages/Admin/Orders/Orders";
import Queue from "./pages/Admin/Queue/Queue";
import CounterPOS from "./pages/Admin/CounterPOS/CounterPOS";
import CakeCustomizer from "./pages/Admin/Customizer/CakeCustomizer";
import AdminLayout from "./layouts/AdminLayout/AdminLayout";
import Dashboard from "./pages/Admin/Dashboard/Dashboard";
import Home from "./pages/Home/Home";
import About from "./pages/About/About";
import Menu from "./pages/Menu/Menu";
import Personalize from "./pages/Personalize/Personalize";
import Contact from "./pages/Contact/Contact";
import Cart from "./pages/Cart/Cart";
import Checkout from "./pages/Checkout/Checkout";
import OrderSuccess from "./pages/OrderSuccess/OrderSuccess";
import Account from "./pages/Account/Account";
import MyOrders from "./pages/MyOrders/MyOrders";
import OrderDetails from "./pages/OrderDetails/OrderDetails";

// Layout controller to conditionally render store Navbar/Footer only on non-admin routes
function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <>
      {!isAdminRoute && <Navbar />}

      <Routes>
        {/* Customer & Public Store Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/personalize" element={<Personalize />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/account" element={<Account />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/order-details" element={<OrderDetails />} />

        {/* Dedicated Admin Portal Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<CounterPOS />} />
          <Route path="counter" element={<CounterPOS />} />
          <Route path="queue" element={<Queue />} />
          <Route path="orders" element={<Orders />} />
          <Route path="products" element={<Products />} />
          <Route path="customizer" element={<CakeCustomizer />} />
          <Route path="cake-customizer" element={<CakeCustomizer />} />
          <Route path="customers" element={<Customers />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>

      {!isAdminRoute && <Footer />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;