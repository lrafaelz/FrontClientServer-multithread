import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface ConnectionConfig {
  host: string;
  port: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  connectionConfig: ConnectionConfig;
  login: (
    email: string,
    password: string,
    host: string,
    port: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  updateConnectionConfig: (host: string, port: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    host: "192.168.1.101",
    port: "5000",
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    const savedUser = localStorage.getItem("authUser");
    const savedConnectionConfig = localStorage.getItem("connectionConfig");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Error parsing saved user data:", error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      }
    }

    if (savedConnectionConfig) {
      try {
        setConnectionConfig(JSON.parse(savedConnectionConfig));
      } catch (error) {
        console.error("Error parsing saved connection config:", error);
        localStorage.removeItem("connectionConfig");
      }
    }

    setIsLoading(false);
  }, []);

  const apiLogin = async (
    username: string,
    password: string,
    host: string,
    port: string
  ) => {
    try {
      const baseUrl = `https://${host}:${port}`;
      const response = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for session management
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: {
            message: data.message,
            access_token: data.access_token, // Include the real token from the API
            user: {
              id: data.username || username, // Use username from response or fallback
              email: data.username || username, // Use username from response or fallback
              name: data.username || username, // Use username from response or fallback
            },
          },
        };
      } else {
        return {
          success: false,
          error: data.message || "Erro de autenticação",
        };
      }
    } catch (error) {
      console.error("Login API error:", error);
      return {
        success: false,
        error:
          "Erro de conexão com o servidor. Verifique se o host e porta estão corretos.",
      };
    }
  };

  const login = async (
    email: string,
    password: string,
    host: string,
    port: string
  ) => {
    setIsLoading(true);

    try {
      // Use email as username for the backend call
      const response = await apiLogin(email, password, host, port);

      if (response.success && response.data) {
        const { user: newUser, access_token } = response.data;

        // Use the real access_token from the API response
        setToken(access_token);
        setUser(newUser);

        // Update connection config
        const newConnectionConfig = { host, port };
        setConnectionConfig(newConnectionConfig);

        // Save to localStorage
        localStorage.setItem("authToken", access_token);
        localStorage.setItem("authUser", JSON.stringify(newUser));
        localStorage.setItem(
          "connectionConfig",
          JSON.stringify(newConnectionConfig)
        );

        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return {
        success: false,
        error: "Erro de conexão. Tente novamente.",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const updateConnectionConfig = (host: string, port: string) => {
    const newConnectionConfig = { host, port };
    setConnectionConfig(newConnectionConfig);
    localStorage.setItem(
      "connectionConfig",
      JSON.stringify(newConnectionConfig)
    );
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    // Keep connection config when logging out
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    connectionConfig,
    login,
    logout,
    isLoading,
    updateConnectionConfig,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
