import React from "react";
import {
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Divider,
} from "@mui/material";
import {
  AccountCircle,
  Logout as LogoutIcon,
  Home as HomeIcon,
} from "@mui/icons-material";
import { useAppHeader } from "./AppHeader.functions";
import {
  StyledAppBar,
  StyledIconButton,
  menuUserBoxStyles,
  userNameTypographyStyles,
  menuAnchorOrigin,
  menuTransformOrigin,
} from "./AppHeader.styles";

// Capybara mini icon component
const CapybaraMiniIcon: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 100 100" style={{ fill: "#FFF" }}>
    <ellipse cx="50" cy="65" rx="35" ry="25" fill="#FFF" />
    <ellipse cx="50" cy="35" rx="25" ry="20" fill="#FFF" />
    <circle cx="42" cy="30" r="2" fill="#8B4513" />
    <circle cx="58" cy="30" r="2" fill="#8B4513" />
    <ellipse cx="50" cy="40" rx="1.5" ry="1" fill="#8B4513" />
    <ellipse cx="38" cy="20" rx="3" ry="5" fill="#FFF" />
    <ellipse cx="62" cy="20" rx="3" ry="5" fill="#FFF" />
  </svg>
);

const AppHeader: React.FC = () => {
  const { user, anchorEl, handleMenu, handleClose, handleLogout, handleHome } =
    useAppHeader();

  return (
    <StyledAppBar position="static">
      <Toolbar>
        <StyledIconButton
          edge="start"
          color="inherit"
          aria-label="home"
          onClick={handleHome}
        >
          <CapybaraMiniIcon />
        </StyledIconButton>

        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Capivara Corp - Sistema de Consulta CPF
        </Typography>

        {user && (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="body2" sx={userNameTypographyStyles}>
              Olá, {user.name}
            </Typography>

            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>

            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={menuAnchorOrigin}
              keepMounted
              transformOrigin={menuTransformOrigin}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>
                <Box sx={menuUserBoxStyles}>
                  <Typography variant="subtitle2">{user.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
              </MenuItem>

              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
                Sair
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </StyledAppBar>
  );
};

export default AppHeader;
