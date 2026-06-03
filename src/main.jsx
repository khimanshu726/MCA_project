import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CartProvider } from "./context/CartContext";
import { UserAuthProvider } from "./context/UserAuthContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserAuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </UserAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
