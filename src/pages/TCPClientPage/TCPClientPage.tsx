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
import { Socio } from "../../types";
import {
  StyledContainer,
  mainPaperStyles,
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
    cnpjByNameCPFQueries,
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
              disabled={
                queries.length === 0 && cnpjByNameCPFQueries.length === 0
              }
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
                          {query.queryType === "cnpj" && query.cnpjResults ? (
                            <>
                              <Typography>
                                <strong>Razão Social:</strong>{" "}
                                {query.cnpjResults[index]?.razao_social}
                              </Typography>
                              <Typography>
                                <strong>CNPJ:</strong>{" "}
                                {query.cnpjResults[index]?.cnpj}
                              </Typography>
                              <Typography>
                                <strong>Nome Fantasia:</strong>{" "}
                                {query.cnpjResults[index]?.nome_fantasia ||
                                  "Não informado"}
                              </Typography>

                              <Typography>
                                <strong>Email:</strong>{" "}
                                {query.cnpjResults[index]?.email ||
                                  "Não informado"}
                              </Typography>
                              <Typography>
                                <strong>Telefone:</strong>{" "}
                                {query.cnpjResults[index]?.telefone ||
                                  "Não informado"}
                              </Typography>
                              <Typography>
                                <strong>Endereço:</strong>{" "}
                                {query.cnpjResults[index]?.endereço ||
                                  query.cnpjResults[index]?.endereco ||
                                  "Não informado"}
                              </Typography>
                              {query.cnpjResults[index]?.socios &&
                                query.cnpjResults[index].socios.length > 0 && (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="subtitle2">
                                      <strong>Sócios:</strong>
                                    </Typography>
                                    {query.cnpjResults[index].socios.map(
                                      (socio: Socio, socioIndex: number) => (
                                        <Typography
                                          key={socioIndex}
                                          variant="body2"
                                          sx={{ ml: 2 }}
                                        >
                                          • {socio.nome_socio} - CPF/CNPJ:{" "}
                                          {socio.cnpj_cpf_socio}{" "}
                                          {socio.nome_representante &&
                                            `(Rep: ${socio.nome_representante})`}
                                        </Typography>
                                      )
                                    )}
                                  </Box>
                                )}
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
                        </Box>
                        {(query.queryType === "name" ||
                          query.queryType === "exactName" ||
                          query.queryType === "cpf") && (
                          <Button
                            variant="contained"
                            size="small"
                            sx={cnpjButtonStyles}
                            onClick={() =>
                              handleCNPJByCPF(result.nome, result.cpf)
                            }
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

        {/* Resultados das Consultas CNPJ por Nome e CPF */}
        {cnpjByNameCPFQueries.map((query) => (
          <Accordion key={query.id} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={accordionBoxStyles}>
                <Typography variant="h6">
                  CNPJ por Nome/CPF: {query.searchName} - {query.searchCPF}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status:{" "}
                  {query.isLoading
                    ? "Processando..."
                    : query.status === "completed"
                    ? "Concluído"
                    : query.status === "error"
                    ? "Erro"
                    : "Pendente"}
                </Typography>
                {query.isLoading && <LinearProgress sx={progressBarStyles} />}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {query.error ? (
                <Alert severity="error">{query.error}</Alert>
              ) : query.results ? (
                <Box>
                  <Typography variant="body1" gutterBottom>
                    CNPJs encontrados: {query.results.length}
                  </Typography>
                  {query.results.map((result, index) => (
                    <Paper key={index} sx={resultPaperStyles}>
                      <Box sx={resultHeaderStyles}>
                        <Box>
                          <Typography>
                            <strong>CNPJ:</strong> {result.cnpj}
                          </Typography>
                          <Typography>
                            <strong>Razão Social:</strong> {result.razao_social}
                          </Typography>
                          <Typography>
                            <strong>Nome Fantasia:</strong>{" "}
                            {result.nome_fantasia || "Não informado"}
                          </Typography>
                          <Typography>
                            <strong>Email:</strong>{" "}
                            {result.email || "Não informado"}
                          </Typography>
                          <Typography>
                            <strong>Telefone:</strong>{" "}
                            {result.telefone || "Não informado"}
                          </Typography>
                          <Typography>
                            <strong>Endereço:</strong>{" "}
                            {result.endereço || "Não informado"}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : query.isLoading ? (
                <Box sx={loadingBoxStyles}>
                  <CircularProgress size={24} sx={loadingProgressStyles} />
                  <Typography>Buscando CNPJs...</Typography>
                </Box>
              ) : null}
            </AccordionDetails>
          </Accordion>
        ))}
      </StyledContainer>
    </>
  );
}

export default TCPClientPage;
