import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BlockchainProvider } from "./context/BlockchainContext";
import { UserProvider } from "./context/UserContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <UserProvider>
      <BlockchainProvider>
        <App />
      </BlockchainProvider>
    </UserProvider>
  </StrictMode>
);
