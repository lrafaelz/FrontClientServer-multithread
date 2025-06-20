import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import TCPClientPage from './pages/TCPClientPage';
import ProtectedRoute from './components/ProtectedRoute';
import { Box, CircularProgress } from '@mui/material';

function App() {
  const { isLoading } = useAuth();

  // Show loading spinner while auth context is initializing
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <TCPClientPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tcp-client"
        element={
          <ProtectedRoute>
            <TCPClientPage />
          </ProtectedRoute>
        }
      />
      {/* Redirect any unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

