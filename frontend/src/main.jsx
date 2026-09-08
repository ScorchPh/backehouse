import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./index.css";
import "./styles/global.css";

import { CartProvider } from "./context/CartContext";
import { OrderProvider } from "./context/OrderContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>

    <OrderProvider>

      <CartProvider>

        <App />

      </CartProvider>

    </OrderProvider>

  </React.StrictMode>
);