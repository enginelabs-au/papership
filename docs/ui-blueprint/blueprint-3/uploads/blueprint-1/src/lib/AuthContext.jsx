import React, { createContext, useState, useContext } from "react";

const AuthContext = createContext();

/** Lightweight auth context for local development (no remote IdP). */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(true);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    try {
      localStorage.removeItem("cc_app_access_token");
      localStorage.removeItem("token");
    } catch (_) {
      /* ignore */
    }
    if (shouldRedirect) {
      window.location.assign("/");
    }
  };

  const navigateToLogin = () => {
    window.location.assign("/");
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(false);
    setAuthChecked(true);
  };

  const checkAppState = async () => {
    setIsLoadingPublicSettings(false);
    setAuthError(null);
    setAuthChecked(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
