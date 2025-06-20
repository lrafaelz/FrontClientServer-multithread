import { useAuth } from "../../contexts/AuthContext";
import { useLocation } from "react-router-dom";

export const useProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  return {
    isAuthenticated,
    isLoading,
    location,
  };
};
