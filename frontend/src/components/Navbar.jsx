import { Shield } from "lucide-react";
import { useBlockchain } from "../context/BlockchainContext";
import { useUser } from "../context/UserContext";

const addSepoliaNetwork = async () => {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0xaa36a7",
          chainName: "Sepolia Testnet",
          nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc.sepolia.org"],
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        }],
      });
    }
  }
};

export default function Navbar({ page, setPage }) {
  const { address, isConnected, isConnecting, isSupported, chainName, hasMetaMask, connect, disconnect } = useBlockchain();
  const { user, handleLogout } = useUser();

  const short = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">
          <Shield size={16} color="#fff" strokeWidth={2.5} />
        </div>
        DocVerify
      </div>

      <div className="navbar-links">
        {[
          { id: "home",     label: "Home"     },
          { id: "register", label: "Register" },
          { id: "verify",   label: "Verify"   },
          { id: "mydocs",   label: "My Docs"  },
        ].map(({ id, label }) => (
          <button key={id} className={`nav-btn ${page === id ? "active" : ""}`} onClick={() => setPage(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="navbar-right">
        {user && (
          <div className="user-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            {user.name}
          </div>
        )}

        {isConnected && !isSupported && (
          <button className="btn btn-warning btn-sm" onClick={addSepoliaNetwork}>
            Switch to Sepolia
          </button>
        )}

        {isConnected ? (
          <>
            <div className={`wallet-badge ${isSupported ? "connected" : "wrong-net"}`}>
              <span className="dot" />
              {isSupported ? `${chainName} · ${short(address)}` : `Wrong Network · ${short(address)}`}
            </div>
            <button className="btn btn-outline btn-sm" onClick={disconnect}>Disconnect</button>
          </>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={connect} disabled={isConnecting || !hasMetaMask}>
            {isConnecting ? <><span className="spinner" /> Connecting</> : "Connect Wallet"}
          </button>
        )}

        <button className="btn btn-outline btn-sm" onClick={handleLogout}>Log Out</button>
      </div>
    </nav>
  );
}
