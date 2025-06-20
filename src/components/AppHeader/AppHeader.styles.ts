import { styled } from "@mui/material/styles";
import { AppBar, IconButton } from "@mui/material";

export const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: "#8B4513",
  "&:hover": {
    backgroundColor: "#8B4513",
  },
}));

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(2),
}));

export const capybaraMiniIconStyles = {
  fill: "#FFF",
};

export const menuUserBoxStyles = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
};

export const userNameTypographyStyles = {
  marginRight: 2,
  display: { xs: "none", sm: "block" },
};

export const menuAnchorOrigin = {
  vertical: "top" as const,
  horizontal: "right" as const,
};

export const menuTransformOrigin = {
  vertical: "top" as const,
  horizontal: "right" as const,
};
