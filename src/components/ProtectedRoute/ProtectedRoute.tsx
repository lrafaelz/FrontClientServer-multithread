import React from "react";
import { Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useProtectedRoute } from "./ProtectedRoute.functions";
import { loadingBoxStyles, loadingProgressSize } from "./ProtectedRoute.styles";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, location } = useProtectedRoute();

  if (isLoading) {
    return (
      <Box sx={loadingBoxStyles}>
        <CircularProgress size={loadingProgressSize} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
