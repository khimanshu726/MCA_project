import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { CartProvider } from "./context/CartContext";
import { UserAuthProvider } from "./context/UserAuthContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <UserAuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </UserAuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
