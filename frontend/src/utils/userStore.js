/**
 * userStore.js
 * Simple localStorage-based user store for testing.
 * NOT for production — passwords stored in plain text.
 */

const USERS_KEY = "docverify_users";
const SESSION_KEY = "docverify_session";

const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

export const signup = (name, email, password) => {
  const users = getUsers();
  if (users.find((u) => u.email === email)) {
    throw new Error("An account with this email already exists.");
  }
  const user = { id: Date.now().toString(), name, email, password, walletAddress: null };
  saveUsers([...users, user]);
  setSession(user);
  return user;
};

export const login = (email, password) => {
  const users = getUsers();
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) throw new Error("Invalid email or password.");
  setSession(user);
  return user;
};

export const logout = () => localStorage.removeItem(SESSION_KEY);

export const getSession = () => JSON.parse(localStorage.getItem(SESSION_KEY) || "null");

const setSession = (user) => localStorage.setItem(SESSION_KEY, JSON.stringify(user));

// Link a wallet address to the currently logged-in user
export const linkWallet = (walletAddress) => {
  const session = getSession();
  if (!session) return;

  const users = getUsers();
  const updated = users.map((u) =>
    u.id === session.id ? { ...u, walletAddress } : u
  );
  saveUsers(updated);
  const updatedUser = { ...session, walletAddress };
  setSession(updatedUser);
  return updatedUser;
};

// Look up a name by wallet address (used in verify result)
export const getNameByWallet = (walletAddress) => {
  if (!walletAddress) return null;
  const users = getUsers();
  const user = users.find(
    (u) => u.walletAddress?.toLowerCase() === walletAddress.toLowerCase()
  );
  return user ? user.name : null;
};
