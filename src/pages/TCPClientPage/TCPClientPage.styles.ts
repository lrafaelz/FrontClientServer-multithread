import { styled } from "@mui/material/styles";
import { Container, Paper, Button } from "@mui/material";

export const StyledContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
}));

export const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  elevation: 3,
}));

export const StyledButton = styled(Button)(({ theme }) => ({
  marginRight: theme.spacing(2),
}));

export const mainPaperStyles = {
  p: 3,
  mb: 3,
};

export const alertStyles = {
  mb: 3,
};

export const buttonBoxStyles = {
  mt: 2,
  display: "flex",
  gap: 2,
  alignItems: "center",
};

export const accordionBoxStyles = {
  width: "100%",
};

export const progressBarStyles = {
  mt: 1,
};

export const resultPaperStyles = {
  p: 2,
  mb: 1,
};

export const loadingBoxStyles = {
  display: "flex",
  alignItems: "center",
};

export const loadingProgressStyles = {
  mr: 2,
};

export const searchTermBoxStyles = {
  mt: 2,
};

export const cnpjButtonStyles = {
  mt: 1,
  mb: 1,
  backgroundColor: "#2E7D32",
  "&:hover": {
    backgroundColor: "#1B5E20",
  },
  fontSize: "0.75rem",
  padding: "4px 8px",
};

export const resultHeaderStyles = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  mb: 1,
};
