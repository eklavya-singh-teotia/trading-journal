import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Account & Filter States
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  useEffect(() => {
    // Check initial session by fetching accounts
    fetchAccounts()
      .then((accs) => {
        if (accs) setUser({ loggedIn: true });
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await api.get("/account");
      setAccounts(data || []);
      if (data && data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0]._id);
      }
      return data;
    } catch (err) {
      return null;
    }
  };

  const login = async (email, password) => {
    const data = await api.post("/auth/login", { email, password });
    setUser(data.user);
    await fetchAccounts();
    return data;
  };

  const register = async (fullName, email, password) => {
    const data = await api.post("/auth/register", { fullName, email, password });
    await login(email, password);
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // ignore logout network errors
    } finally {
      setUser(null);
      setAccounts([]);
      setSelectedAccount("");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        accounts,
        fetchAccounts,
        selectedAccount,
        setSelectedAccount,
        dateRange,
        setDateRange,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
