import { createContext, useContext, useState, useEffect } from "react";
import { getSession, logout, linkWallet } from "../utils/userStore";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authPage, setAuthPage] = useState("login"); // "login" | "signup"
  const [showAuth, setShowAuth] = useState(false);

  // Restore session on load
  useEffect(() => {
    const session = getSession();
    if (session) setUser(session);
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setShowAuth(false);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  // When wallet connects, link it to the logged-in user
  const handleWalletLinked = (walletAddress) => {
    if (!user) return;
    if (user.walletAddress?.toLowerCase() === walletAddress.toLowerCase()) return;
    const updated = linkWallet(walletAddress);
    if (updated) setUser(updated);
  };

  return (
    <UserContext.Provider value={{
      user,
      isLoggedIn: !!user,
      authPage, setAuthPage,
      showAuth, setShowAuth,
      handleLogin,
      handleLogout,
      handleWalletLinked,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
};
