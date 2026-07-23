import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { CartProvider } from "./context/CartContext";
import { UserAuthProvider } from "./context/UserAuthContext";
import { AuthModalProvider } from "./context/AuthModalContext";
import "./styles.css";
import "./styles/tailwind.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // React Query's default ("online") pauses a query whenever it believes
      // the browser is offline, and a paused query reports neither `isError`
      // nor `isLoading`. Anything branching on those two flags then falls
      // through to its success branch and renders an empty list — which reads
      // as "this store has nothing", not "we couldn't reach the server".
      //
      // Worse, the pause did not lift when the API came back: the homepage
      // rail stayed empty until a manual reload.
      //
      // "always" means we attempt the request regardless of what the browser
      // thinks of the network, and a failure surfaces as a real error that the
      // normal retry path can recover from. For a same-origin API that is the
      // honest model — the only way to know whether the server is reachable is
      // to ask it.
      networkMode: "always",
    },
    mutations: {
      networkMode: "always",
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UserAuthProvider>
          <CartProvider>
            <AuthModalProvider>
              <App />
            </AuthModalProvider>
          </CartProvider>
        </UserAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
