import React from "react";
import {
  Box,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
} from "@mui/material";
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Computer as ComputerIcon,
  Router as RouterIcon,
} from "@mui/icons-material";
import { useLoginPage } from "./LoginPage.functions";
import {
  StyledContainer,
  StyledCard,
  StyledAvatar,
  StyledButton,
  headerBoxStyles,
  titleTypographyStyles,
  subtitleTypographyStyles,
  formBoxStyles,
  cardContentStyles,
} from "./LoginPage.styles";

// Capybara SVG icon component
const CapybaraIcon: React.FC = () => (
  <svg width="80" height="80" viewBox="0 0 100 100" style={{ fill: "#8B4513" }}>
    {/* Capybara body */}
    <ellipse cx="50" cy="65" rx="35" ry="25" fill="#8B4513" />

    {/* Capybara head */}
    <ellipse cx="50" cy="35" rx="25" ry="20" fill="#A0522D" />

    {/* Eyes */}
    <circle cx="42" cy="30" r="3" fill="#000" />
    <circle cx="58" cy="30" r="3" fill="#000" />

    {/* Nose */}
    <ellipse cx="50" cy="40" rx="2" ry="1.5" fill="#000" />

    {/* Ears */}
    <ellipse cx="38" cy="20" rx="4" ry="6" fill="#8B4513" />
    <ellipse cx="62" cy="20" rx="4" ry="6" fill="#8B4513" />

    {/* Mouth */}
    <path d="M 45 45 Q 50 47 55 45" stroke="#000" strokeWidth="1" fill="none" />

    {/* Legs */}
    <ellipse cx="35" cy="85" rx="6" ry="10" fill="#8B4513" />
    <ellipse cx="50" cy="85" rx="6" ry="10" fill="#8B4513" />
    <ellipse cx="65" cy="85" rx="6" ry="10" fill="#8B4513" />
  </svg>
);

const LoginPage: React.FC = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    host,
    setHost,
    port,
    setPort,
    showPassword,
    error,
    emailError,
    passwordError,
    hostError,
    portError,
    isLoading,
    handleSubmit,
    handleClickShowPassword,
  } = useLoginPage();

  return (
    <StyledContainer maxWidth="sm">
      <StyledCard>
        <CardContent sx={cardContentStyles}>
          <Box sx={headerBoxStyles}>
            <StyledAvatar>
              <CapybaraIcon />
            </StyledAvatar>
            <Typography component="h1" variant="h4" sx={titleTypographyStyles}>
              Capivara Corp
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={subtitleTypographyStyles}
            >
              Sistema de Consulta de CPF
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={formBoxStyles}>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 1 }}>
              <Box sx={{ flex: 1, minWidth: "200px" }}>
                <TextField
                  fullWidth
                  label="Host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  error={!!hostError}
                  helperText={hostError}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ComputerIcon color={hostError ? "error" : "action"} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: "200px" }}>
                <TextField
                  fullWidth
                  label="Porta"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  error={!!portError}
                  helperText={portError}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <RouterIcon color={portError ? "error" : "action"} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Box>
            <Divider />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!emailError}
              helperText={emailError}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color={emailError ? "error" : "action"} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Senha"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!passwordError}
              helperText={passwordError}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color={passwordError ? "error" : "action"} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <StyledButton
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Entrar"
              )}
            </StyledButton>
          </Box>
        </CardContent>
      </StyledCard>
    </StyledContainer>
  );
};

export default LoginPage;
