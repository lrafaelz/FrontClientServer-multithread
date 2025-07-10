import React from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  LinearProgress,
  Paper,
} from "@mui/material";
import { PatternFormat } from "react-number-format";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AppHeader from "../../components/AppHeader/AppHeader";
import { useTCPClientPage } from "./TCPClientPage.functions";
import {
  StyledContainer,
  mainPaperStyles,
  alertStyles,
  buttonBoxStyles,
  accordionBoxStyles,
  progressBarStyles,
  resultPaperStyles,
  loadingBoxStyles,
  loadingProgressStyles,
  searchTermBoxStyles,
  cnpjButtonStyles,
  resultHeaderStyles,
} from "./TCPClientPage.styles";

function TCPClientPage() {
  const {
    nameSearchTerm,
    documentSearchTerm,
    queryType,
    setQueryType,
    queries,
    batchQueries,
    user,
    token,
    connectionConfig,
    updateConnectionConfig,
    handleQuery,
    clearResults,
    handleKeyPress,
    handleSearchTermChange,
    handleCNPJByCPF,
    getCurrentSearchTerm,
  } = useTCPClientPage();

  return (
    <>
      <AppHeader />
      <StyledContainer maxWidth="lg">
        <Paper elevation={3} sx={mainPaperStyles}>
          <Typography variant="h4" component="h1" gutterBottom>
            Sistema de Consulta CPF/CNPJ
          </Typography>

          {user && (
            <Alert severity="info" sx={alertStyles}>
              Conectado como: <strong>{user.name}</strong> ({user.email})
              <br />
              Token: {token ? `${token.substring(0, 20)}...` : "Não disponível"}
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: "200px" }}>
              <TextField
                fullWidth
                label="Host"
                value={connectionConfig.host}
                onChange={(e) =>
                  updateConnectionConfig(e.target.value, connectionConfig.port)
                }
                margin="normal"
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: "200px" }}>
              <TextField
                fullWidth
                label="Porta"
                value={connectionConfig.port}
                onChange={(e) =>
                  updateConnectionConfig(connectionConfig.host, e.target.value)
                }
                margin="normal"
              />
            </Box>
          </Box>

          <FormControl component="fieldset" margin="normal">
            <FormLabel component="legend">Tipo de Consulta</FormLabel>
            <RadioGroup
              row
              value={queryType}
              onChange={(e) =>
                setQueryType(
                  e.target.value as "name" | "exactName" | "cpf" | "cnpj"
                )
              }
            >
              <FormControlLabel value="name" control={<Radio />} label="Nome" />
              <FormControlLabel
                value="exactName"
                control={<Radio />}
                label="Nome Exato"
              />
              <FormControlLabel value="cpf" control={<Radio />} label="CPF" />
              <FormControlLabel value="cnpj" control={<Radio />} label="CNPJ" />
            </RadioGroup>
          </FormControl>

          <Box sx={searchTermBoxStyles}>
            {queryType === "cpf" ? (
              <PatternFormat
                customInput={TextField}
                format="###.###.###-##"
                mask="_"
                fullWidth
                label="CPF"
                value={documentSearchTerm}
                onChange={handleSearchTermChange}
                onKeyPress={handleKeyPress}
                margin="normal"
              />
            ) : queryType === "cnpj" ? (
              <PatternFormat
                customInput={TextField}
                format="##.###.###/####-##"
                mask="_"
                fullWidth
                label="CNPJ"
                value={documentSearchTerm}
                onChange={handleSearchTermChange}
                onKeyPress={handleKeyPress}
                margin="normal"
              />
            ) : (
              <TextField
                fullWidth
                label={queryType === "name" ? "Nome" : "Nome Exato"}
                value={nameSearchTerm}
                onChange={handleSearchTermChange}
                onKeyPress={handleKeyPress}
                margin="normal"
              />
            )}
          </Box>

          <Box sx={buttonBoxStyles}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleQuery}
              disabled={!getCurrentSearchTerm().trim()}
            >
              Consultar
            </Button>

            <Button
              variant="outlined"
              onClick={clearResults}
              disabled={queries.length === 0 && batchQueries.length === 0}
            >
              Limpar Resultados
            </Button>
          </Box>
        </Paper>

        {/* Resultados das Consultas */}
        {queries.map((query) => (
          <Accordion key={query.id} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={accordionBoxStyles}>
                <Typography variant="h6">
                  #{query.requestNumber} - {query.queryType}: {query.searchTerm}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {query.statusMessage}
                </Typography>
                {query.status === "pending" && (
                  <LinearProgress
                    variant="determinate"
                    value={query.progress}
                    sx={progressBarStyles}
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {query.error ? (
                <Alert severity="error">{query.error}</Alert>
              ) : query.results ? (
                <Box>
                  <Typography variant="body1" gutterBottom>
                    Resultados encontrados: {query.results.length}
                  </Typography>
                  {query.results.map((result, index) => (
                    <Paper key={index} sx={resultPaperStyles}>
                      <Box sx={resultHeaderStyles}>
                        <Box>
                          <Typography>
                            <strong>Nome:</strong> {result.nome}
                          </Typography>
                          <Typography>
                            <strong>CPF:</strong> {result.cpf}
                          </Typography>
                          <Typography>
                            <strong>Sexo:</strong> {result.sexo}
                          </Typography>
                          <Typography>
                            <strong>Nascimento:</strong> {result.nasc}
                          </Typography>
                        </Box>
                        {(query.queryType === "name" ||
                          query.queryType === "exactName") && (
                          <Button
                            variant="contained"
                            size="small"
                            sx={cnpjButtonStyles}
                            onClick={() => handleCNPJByCPF(result.cpf)}
                          >
                            Buscar CNPJ
                          </Button>
                        )}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Box sx={loadingBoxStyles}>
                  <CircularProgress size={24} sx={loadingProgressStyles} />
                  <Typography>Processando consulta...</Typography>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </StyledContainer>
    </>
  );
}

export default TCPClientPage;
