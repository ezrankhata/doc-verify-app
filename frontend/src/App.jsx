import { useState, useEffect } from "react";
import { useUser } from "./context/UserContext";
import { useBlockchain } from "./context/BlockchainContext";
import Navbar from "./components/Navbar";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import VerifyPage from "./pages/VerifyPage";
import MyDocsPage from "./pages/MyDocsPage";

export default function App() {
  const [page, setPage] = useState("home");
  const { isLoggedIn, handleWalletLinked } = useUser();
  const { address, isConnected } = useBlockchain();

  // Auto-link wallet to logged in user — runs when wallet connects OR when user logs in
  useEffect(() => {
    if (isLoggedIn && isConnected && address) {
      handleWalletLinked(address);
    }
  }, [isLoggedIn, isConnected, address]);

  // If URL has ?hash= (from QR scan), go straight to verify
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("hash")) setPage("verify");
  }, []);

  // Show auth screen if not logged in
  if (!isLoggedIn) return <AuthPage />;

  return (
    <div className="app">
      <Navbar page={page} setPage={setPage} />
      <main className="main-content">
        {page === "home"     && <HomePage setPage={setPage} />}
        {page === "register" && <RegisterPage />}
        {page === "verify"   && <VerifyPage />}
        {page === "mydocs"   && <MyDocsPage />}
      </main>
    </div>
  );
}
