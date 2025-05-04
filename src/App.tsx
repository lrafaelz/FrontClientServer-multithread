import { useState, useRef, useEffect } from "react";
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
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { PatternFormat } from "react-number-format";
import { QueryResult, TCPClient, ProgressUpdate } from "./services/TCPClient";
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
  requestNumber: number; // Adicionado para rastrear o número da requisição
  retryCount: number; // Adicionado para rastrear o número de tentativas
  statusMessage: string; // Mensagem de status para dar feedback ao usuário
}

function App() {
  const [host, setHost] = useState("192.168.0.102");
  const [port, setPort] = useState("5000");
  const [searchTerm, setSearchTerm] = useState("");
  const [queryType, setQueryType] = useState<"name" | "exactName" | "cpf">(
    "name"
  );
  const [queries, setQueries] = useState<QueryState[]>([]);
  const requestCounterRef = useRef(0); // Contador persistente usando useRef
  const progressIntervalsRef = useRef<Record<string, number>>({});

  // Limpa intervalos de progresso quando o componente é desmontado
  useEffect(() => {
    return () => {
      Object.values(progressIntervalsRef.current).forEach((intervalId) => {
        window.clearInterval(intervalId);
      });
    };
  }, []);

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

  // Função para processar atualizações de progresso do servidor
  const handleProgressUpdate =
    (queryId: string) => (update: ProgressUpdate) => {
      console.log(`Recebida atualização para consulta ${queryId}:`, update);

      setQueries((prev) =>
        prev.map((q) => {
          if (q.id === queryId) {
            return {
              ...q,
              progress: update.progress,
              statusMessage:
                update.message || `${update.status} (${update.progress}%)`,
              status: update.isComplete ? "completed" : "pending",
              results: update.results || q.results,
            };
          }
          return q;
        })
      );

      // Se o progresso chegou a 100% e temos resultados, podemos limpar qualquer intervalo de progresso
      if (update.isComplete && update.progress === 100) {
        if (progressIntervalsRef.current[queryId]) {
          clearInterval(progressIntervalsRef.current[queryId]);
          delete progressIntervalsRef.current[queryId];
        }
      }
    };

  // Função simplificada que agora só será usada para requisições CPF que não usam streaming
  const startProgressUpdates = (
    queryId: string,
    estimatedTime: number = 5000,
    updateInterval: number = 50
  ) => {
    const startTime = Date.now();

    // Cria um intervalo para atualização do progresso
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(95, (elapsed / estimatedTime) * 100);

      setQueries((prev) =>
        prev.map((q) => (q.id === queryId ? { ...q, progress } : q))
      );

      // Para o intervalo quando atingir 95%
      if (progress >= 95) {
        clearInterval(progressIntervalsRef.current[queryId]);
        delete progressIntervalsRef.current[queryId];
      }
    }, updateInterval);

    // Armazena o ID do intervalo para limpeza posterior
    progressIntervalsRef.current[queryId] = intervalId;

    return () => {
      clearInterval(progressIntervalsRef.current[queryId]);
      delete progressIntervalsRef.current[queryId];
    };
  };

  // Função que substitui o queryWorker com async/await
  const performQuery = async (query: QueryState) => {
    try {
      console.log(
        `[#${query.requestNumber}] Iniciando consulta de ${query.queryType}: ${query.searchTerm}`
      );

      // Atualiza a mensagem de status para indicar que a consulta está sendo iniciada
      setQueries((prev) =>
        prev.map((q) =>
          q.id === query.id
            ? { ...q, statusMessage: "Conectando ao servidor..." }
            : q
        )
      );

      // Criar cliente com conexão HTTPS direta e passar o requestNumber e o callback de progresso
      // Apenas para consultas por nome e nome exato que usam streaming
      const client = new TCPClient(
        host,
        parseInt(port),
        true,
        query.requestNumber,
        query.queryType !== "cpf" ? handleProgressUpdate(query.id) : undefined
      );

      let results: QueryResult[];

      // Executar a consulta apropriada
      if (query.queryType === "name") {
        results = await client.getPersonByName(query.searchTerm);
      } else if (query.queryType === "exactName") {
        results = await client.getPersonByExactName(query.searchTerm);
      } else {
        // Para busca por CPF, usamos o progresso simulado pois não implementamos streaming
        const stopProgress = startProgressUpdates(query.id);
        results = await client.getPersonByCPF(query.searchTerm);
        stopProgress();
      }

      console.log(`[#${query.requestNumber}] Consulta concluída com sucesso`);

      // Atualiza o estado com os resultados (necessário apenas para CPF, já que para nome
      // as atualizações vêm do callback de progresso)
      if (query.queryType === "cpf") {
        setQueries((prev) =>
          prev.map((q) =>
            q.id === query.id
              ? {
                  ...q,
                  results,
                  status: "completed",
                  progress: 100,
                  statusMessage: "Consulta concluída com sucesso",
                }
              : q
          )
        );
      }
    } catch (error) {
      console.error(`[#${query.requestNumber}] Erro na consulta:`, error);

      // Limpa o intervalo de progresso se existir
      if (progressIntervalsRef.current[query.id]) {
        clearInterval(progressIntervalsRef.current[query.id]);
        delete progressIntervalsRef.current[query.id];
      }

      // Atualiza o estado com o erro
      setQueries((prev) =>
        prev.map((q) =>
          q.id === query.id
            ? {
                ...q,
                error:
                  error instanceof Error ? error.message : "Erro desconhecido",
                status: "error",
                statusMessage: "Erro na consulta após múltiplas tentativas",
              }
            : q
        )
      );
    }
  };

  const handleQuery = () => {
    if (!searchTerm) {
      console.error("Campo de busca vazio");
      return;
    }

    // Incrementa o contador de requisições
    requestCounterRef.current += 1;
    const currentRequestNumber = requestCounterRef.current;

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
      requestNumber: currentRequestNumber, // Usa o contador incrementado
      retryCount: 0, // Inicializa o contador de tentativas
      statusMessage: "Iniciando consulta...", // Mensagem de status inicial
    };

    // Adiciona a nova consulta ao estado
    setQueries((prev) => [newQuery, ...prev]);

    console.log(`Iniciando requisição #${currentRequestNumber}`);

    // Executa a consulta de forma assíncrona
    performQuery(newQuery);
  };

  // O restante do componente permanece o mesmo
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
                        Busca #{query.requestNumber} - {query.queryType}:{" "}
                        {query.searchTerm}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {query.status === "pending" && (
                        <Box
                          sx={{
                            width: "100%",
                            mb: 2,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                          }}
                        >
                          <CircularProgress
                            variant="determinate"
                            value={query.progress}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {query.statusMessage}
                          </Typography>
                          {query.retryCount > 0 && (
                            <Typography variant="caption" color="warning.main">
                              Tentativa {query.retryCount} de 4
                            </Typography>
                          )}
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
