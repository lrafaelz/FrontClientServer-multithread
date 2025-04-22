import { useState } from "react";
import {
  Container,
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
  LinearProgress,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { PatternFormat } from "react-number-format";
import { QueryResult } from "./services/TCPClient";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface QueryState {
  id: string;
  searchTerm: string;
  queryType: "name" | "exactName" | "cpf";
  results: QueryResult[] | null;
  error: string | null;
  progress: number;
  status: "pending" | "completed" | "error";
  startTime: number;
}

function App() {
  const [host, setHost] = useState(" 192.168.0.102");
  const [port, setPort] = useState("5000");
  const [searchTerm, setSearchTerm] = useState("");
  const [queryType, setQueryType] = useState<"name" | "exactName" | "cpf">(
    "name"
  );
  const [queries, setQueries] = useState<QueryState[]>([]);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleQuery();
    }
  };

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove mask characters if it's a CPF input
    const cleanValue = queryType === "cpf" ? value.replace(/\D/g, "") : value;
    setSearchTerm(cleanValue);
  };

  const handleQuery = async () => {
    if (!searchTerm) {
      console.error("Campo de busca vazio");
      return;
    }

    const queryId = Date.now().toString();
    const newQuery: QueryState = {
      id: queryId,
      searchTerm,
      queryType,
      results: null,
      error: null,
      progress: 0,
      status: "pending",
      startTime: Date.now(),
    };

    setQueries((prev) => [newQuery, ...prev]);

    const worker = new Worker(
      new URL("./workers/queryWorker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (event) => {
      const { type, data } = event.data;

      if (type === "progress") {
        setQueries((prev) =>
          prev.map((q) =>
            q.id === queryId ? { ...q, progress: data.progress } : q
          )
        );
      } else if (type === "result") {
        setQueries((prev) =>
          prev.map((q) =>
            q.id === queryId
              ? { ...q, results: data.results, status: "completed" }
              : q
          )
        );
        worker.terminate();
      } else if (type === "error") {
        setQueries((prev) =>
          prev.map((q) =>
            q.id === queryId ? { ...q, error: data.error, status: "error" } : q
          )
        );
        worker.terminate();
      }
    };

    worker.postMessage({
      host,
      port,
      searchTerm,
      queryType,
    });
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Busca de CPF
        </Typography>

        <Grid container spacing={3}>
          <Box sx={{ width: "100%", display: "flex", gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Porta"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </Box>
          </Box>

          <Box sx={{ width: "100%" }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Tipo de Busca</FormLabel>
              <RadioGroup
                row
                value={queryType}
                onChange={(e) =>
                  setQueryType(e.target.value as "name" | "exactName" | "cpf")
                }
              >
                <FormControlLabel
                  value="name"
                  control={<Radio />}
                  label="Por Nome"
                />
                <FormControlLabel
                  value="exactName"
                  control={<Radio />}
                  label="Por Nome Exato"
                />
                <FormControlLabel
                  value="cpf"
                  control={<Radio />}
                  label="Por CPF"
                />
              </RadioGroup>
            </FormControl>
          </Box>

          <Box sx={{ width: "100%" }}>
            {queryType === "cpf" ? (
              <PatternFormat
                customInput={TextField}
                format="###.###.###-##"
                mask="_"
                fullWidth
                label="CPF"
                value={searchTerm}
                onValueChange={(values) => setSearchTerm(values.value)}
                onKeyPress={handleKeyPress}
                helperText="Digite o CPF"
              />
            ) : (
              <TextField
                fullWidth
                label="Nome"
                value={searchTerm}
                onChange={handleSearchTermChange}
                onKeyPress={handleKeyPress}
              />
            )}
          </Box>

          <Box sx={{ width: "100%" }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleQuery}
              fullWidth
            >
              {"Buscar"}
            </Button>
          </Box>

          <Box sx={{ width: "100%", mt: 4 }}>
            <Grid container spacing={2}>
              {queries.map((query) => (
                <Grid size={{ xs: 12, md: 6 }} key={query.id}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        Busca por {query.queryType}: {query.searchTerm}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {query.status === "pending" && (
                        <Box sx={{ width: "100%", mb: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={query.progress}
                          />
                          <Typography variant="body2" color="text.secondary">
                            Tempo decorrido:{" "}
                            {((Date.now() - query.startTime) / 1000).toFixed(1)}
                            s
                          </Typography>
                        </Box>
                      )}

                      {query.error && (
                        <Alert severity="error">{query.error}</Alert>
                      )}

                      {query.results && (
                        <Box>
                          {query.results.map((result, index) => (
                            <Box
                              key={index}
                              sx={{
                                mb: 2,
                                p: 2,
                                border: "1px solid #ccc",
                                borderRadius: 1,
                              }}
                            >
                              <Typography>
                                <strong>CPF:</strong> {result.cpf}
                              </Typography>
                              <Typography>
                                <strong>Nome:</strong> {result.nome}
                              </Typography>
                              <Typography>
                                <strong>Sexo:</strong> {result.sexo}
                              </Typography>
                              <Typography>
                                <strong>Data de Nascimento:</strong>{" "}
                                {result.nasc}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>
      </Box>
    </Container>
  );
}

export default App;
