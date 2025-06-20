import { styled } from "@mui/material/styles";
import { Container, Card, Avatar, Button } from "@mui/material";

export const StyledContainer = styled(Container)(({ theme }) => ({
  height: "100vh",
  display: "flex",
  alignItems: "center",
}));

export const StyledCard = styled(Card)(({ theme }) => ({
  width: "100%",
  maxWidth: 400,
  margin: "0 auto",
  boxShadow: theme.shadows[3],
}));

export const StyledAvatar = styled(Avatar)(({ theme }) => ({
  margin: theme.spacing(1),
  backgroundColor: "transparent",
  width: 80,
  height: 80,
}));

export const StyledButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(2),
  backgroundColor: "#8B4513",
  "&:hover": {
    backgroundColor: "#A0522D",
  },
  paddingY: theme.spacing(1.5),
}));

export const headerBoxStyles = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  mb: 3,
};

export const titleTypographyStyles = {
  color: "#8B4513",
  fontWeight: "bold",
};

export const subtitleTypographyStyles = {
  mt: 1,
};

export const formBoxStyles = {
  mt: 1,
};

export const credentialsBoxStyles = {
  mt: 2,
};

export const cardContentStyles = {
  p: 4,
};
