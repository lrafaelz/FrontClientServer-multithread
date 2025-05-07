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
  Switch,
  LinearProgress,
  Paper,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { PatternFormat } from "react-number-format";
import {
  QueryResult,
  TCPClient,
  ProgressUpdate,
  BatchProgressUpdate,
} from "./services/TCPClient";
import { WorkerManager } from "./services/WorkerManager";
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
  requestNumber: number;
  retryCount: number;
  statusMessage: string;
}

// Interface para representar o estado de uma operação em lote
interface BatchQueryState {
  id: string;
  queryType: "name" | "exactName" | "cpf";
  searchTerms: string[];
  numberOfRequests: number;
  results: QueryResult[];
  completed: number;
  total: number;
  progress: number;
  status: "pending" | "completed" | "error";
  error: string | null;
  startTime: number;
  statusMessage: string;
}

function App() {
  const [host, setHost] = useState("192.168.1.104");
  const [port, setPort] = useState("5000");
  const [searchTerm, setSearchTerm] = useState("");
  const [queryType, setQueryType] = useState<"name" | "exactName" | "cpf">(
    "name"
  );
  const [queries, setQueries] = useState<QueryState[]>([]);
  const [batchQueries, setBatchQueries] = useState<BatchQueryState[]>([]);
  const requestCounterRef = useRef(0);
  const progressIntervalsRef = useRef<Record<string, number>>({});

  // Novos estados para requisições em lote
  const [batchMode, setBatchMode] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [batchTerms, setBatchTerms] = useState<string[]>([]);
  const [batchTermsInput, setBatchTermsInput] = useState("");

  // Novo estado para controlar se usamos workers ou não
  const [useWorkers, setUseWorkers] = useState(true);
  // Referência ao WorkerManager
  const workerManagerRef = useRef<WorkerManager | null>(null);

  // Inicializa o WorkerManager
  useEffect(() => {
    workerManagerRef.current = new WorkerManager(useWorkers);

    // Limpeza quando o componente é desmontado
    return () => {
      if (workerManagerRef.current) {
        workerManagerRef.current.cancelAllQueries();
        workerManagerRef.current = null;
      }

      Object.values(progressIntervalsRef.current).forEach((intervalId) => {
        window.clearInterval(intervalId);
      });
    };
  }, [useWorkers]); // Adicionado useWorkers como dependência para recriar o WorkerManager quando a opção mudar

  // Atualiza o WorkerManager quando a opção de useWorkers muda
  useEffect(() => {
    if (workerManagerRef.current) {
      workerManagerRef.current.useWorkers = useWorkers;
    }
  }, [useWorkers]);

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

  // Função para processar atualizações de progresso das requisições em lote
  const handleBatchProgressUpdate =
    (batchId: string) => (update: BatchProgressUpdate) => {
      console.log(`Recebida atualização de lote ${batchId}:`, update);

      setBatchQueries((prev) =>
        prev.map((batch) => {
          if (batch.id === batchId) {
            return {
              ...batch,
              completed: update.completed,
              total: update.total,
              progress: update.progress,
              results: update.results,
              status: update.isComplete ? "completed" : "pending",
              statusMessage: `Processadas ${update.completed}/${
                update.total
              } requisições (${Math.round(update.progress)}%)`,
            };
          }
          return batch;
        })
      );
    };

  // Função simplificada para requisições CPF que não usam streaming
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

  // Função para executar consulta usando o WorkerManager (substitui performQuery)
  const performQueryWithWorkerManager = (query: QueryState) => {
    if (!workerManagerRef.current) {
      console.error("WorkerManager não inicializado");
      return;
    }

    // Atualiza o status inicial
    setQueries((prev) =>
      prev.map((q) =>
        q.id === query.id
          ? { ...q, statusMessage: "Iniciando consulta...", progress: 0 }
          : q
      )
    );

    // Configurar as callbacks
    const callbacks = {
      onProgress: handleProgressUpdate(query.id),
      onComplete: (results: QueryResult[]) => {
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
      },
      onError: (errorMessage: string) => {
        console.error(
          `[#${query.requestNumber}] Erro na consulta:`,
          errorMessage
        );

        setQueries((prev) =>
          prev.map((q) =>
            q.id === query.id
              ? {
                  ...q,
                  error: errorMessage,
                  status: "error",
                  statusMessage: "Erro na consulta após múltiplas tentativas",
                }
              : q
          )
        );
      },
    };

    // Executar a consulta usando o WorkerManager
    workerManagerRef.current.executeQuery(
      {
        host,
        port: parseInt(port),
        searchTerm: query.searchTerm,
        queryType: query.queryType,
        queryId: query.id,
        requestNumber: query.requestNumber,
        useProgressWorker: query.queryType === "cpf", // Usar progressWorker apenas para CPF
      },
      callbacks
    );
  };

  // Função que implementa o método de consulta original (mantida para compatibilidade)
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

  // Função modificada para processar consultas em lote com WorkerManager
  const performBatchQueryWithWorkerManager = (batchQuery: BatchQueryState) => {
    if (!workerManagerRef.current) {
      console.error("WorkerManager não inicializado");
      return;
    }

    // Atualiza o status para indicar que o processamento está começando
    setBatchQueries((prev) =>
      prev.map((b) =>
        b.id === batchQuery.id
          ? { ...b, statusMessage: "Iniciando processamento em lote..." }
          : b
      )
    );

    const results: QueryResult[] = [];
    let completed = 0;
    const total = Math.min(
      batchQuery.searchTerms.length,
      batchQuery.numberOfRequests
    );
    const termsToProcess = batchQuery.searchTerms.slice(
      0,
      batchQuery.numberOfRequests
    );

    // Função auxiliar para atualizar o progresso do lote
    const updateBatchProgress = () => {
      const progress = (completed / total) * 100;

      setBatchQueries((prev) =>
        prev.map((b) =>
          b.id === batchQuery.id
            ? {
                ...b,
                completed,
                progress,
                results: [...results],
                statusMessage: `Processadas ${completed}/${total} requisições (${Math.round(
                  progress
                )}%)`,
                status: completed === total ? "completed" : "pending",
              }
            : b
        )
      );
    };

    // Processa cada termo do lote
    termsToProcess.forEach((term, index) => {
      const queryId = `${batchQuery.id}-${index}`;
      requestCounterRef.current += 1;

      workerManagerRef.current!.executeQuery(
        {
          host,
          port: parseInt(port),
          searchTerm: term,
          queryType: batchQuery.queryType,
          queryId,
          requestNumber: requestCounterRef.current,
        },
        {
          onComplete: (termResults) => {
            // Adiciona resultados ao array global
            results.push(...termResults);
            completed++;
            updateBatchProgress();
          },
          onError: (error) => {
            console.error(
              `Erro na consulta do lote para termo ${term}:`,
              error
            );
            completed++;
            updateBatchProgress();
          },
        }
      );
    });
  };

  // Função para processar consultas em lote (método original)
  const performBatchQuery = async (batchQuery: BatchQueryState) => {
    try {
      console.log(
        `[Lote #${batchQuery.id}] Iniciando ${batchQuery.numberOfRequests} consultas do tipo ${batchQuery.queryType}`
      );

      // Atualiza o status para indicar que o processamento está começando
      setBatchQueries((prev) =>
        prev.map((b) =>
          b.id === batchQuery.id
            ? { ...b, statusMessage: "Iniciando processamento em lote..." }
            : b
        )
      );

      // Incrementa o contador de requisições para ID único
      requestCounterRef.current += 1;
      const batchRequestId = requestCounterRef.current;

      // Criar cliente TCP com suporte para notificações de progresso em lote
      const client = new TCPClient(
        host,
        parseInt(port),
        true,
        batchRequestId,
        undefined, // Sem callback para progresso individual
        handleBatchProgressUpdate(batchQuery.id) // Callback para progresso em lote
      );

      // Executar todas as consultas em paralelo
      const promises = batchQuery.searchTerms.map((term) =>
        client.batchQuery(batchQuery.queryType, [term], 1)
      );

      const resultsArray = await Promise.all(promises);

      // Combina os resultados de todas as requisições
      const results = resultsArray.flat();

      console.log(
        `[Lote #${batchQuery.id}] Processamento em lote concluído com sucesso`
      );

      // Atualiza o estado final do lote
      setBatchQueries((prev) =>
        prev.map((b) =>
          b.id === batchQuery.id
            ? {
                ...b,
                results,
                status: "completed",
                progress: 100,
                completed: batchQuery.numberOfRequests,
                statusMessage: `Processamento em lote concluído. ${results.length} resultados encontrados.`,
              }
            : b
        )
      );
    } catch (error) {
      console.error(
        `[Lote #${batchQuery.id}] Erro no processamento em lote:`,
        error
      );

      // Atualiza o estado com o erro
      setBatchQueries((prev) =>
        prev.map((b) =>
          b.id === batchQuery.id
            ? {
                ...b,
                error:
                  error instanceof Error ? error.message : "Erro desconhecido",
                status: "error",
                statusMessage: "Erro no processamento em lote",
              }
            : b
        )
      );
    }
  };

  const handleQuery = () => {
    if (batchMode) {
      // Verificação para modo de requisições múltiplas
      if (batchTerms.length === 0) {
        console.error("Nenhum termo de busca fornecido para consulta em lote");
        return;
      }
      // Executa consulta em lote
      handleBatchQuery();
    } else {
      // Verificação para modo de requisição individual
      if (!searchTerm) {
        console.error("Campo de busca vazio");
        return;
      }

      // Executa consulta individual
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
        requestNumber: currentRequestNumber,
        retryCount: 0,
        statusMessage: "Iniciando consulta...",
      };

      // Adiciona a nova consulta ao estado
      setQueries((prev) => [newQuery, ...prev]);

      console.log(`Iniciando requisição #${currentRequestNumber}`);

      // Executa a consulta com o WorkerManager ou método original
      if (workerManagerRef.current) {
        performQueryWithWorkerManager(newQuery);
      } else {
        performQuery(newQuery);
      }
    }
  };

  // Função para lidar com requisições em lote
  const handleBatchQuery = () => {
    // Verifica se temos termos de pesquisa
    const terms = batchTerms.length > 0 ? batchTerms : [searchTerm];

    if (terms.length === 0 || (terms.length === 1 && !terms[0])) {
      console.error("Nenhum termo de pesquisa fornecido para o lote");
      return;
    }

    const batchId = Date.now().toString();
    const newBatchQuery: BatchQueryState = {
      id: batchId,
      queryType,
      searchTerms: terms,
      numberOfRequests: batchSize,
      results: [],
      completed: 0,
      total: Math.min(terms.length, batchSize),
      progress: 0,
      status: "pending",
      error: null,
      startTime: Date.now(),
      statusMessage: "Preparando consultas em lote...",
    };

    // Adiciona a nova consulta em lote ao estado
    setBatchQueries((prev) => [newBatchQuery, ...prev]);

    console.log(`Iniciando lote de ${newBatchQuery.total} requisições`);

    // Executa o processamento em lote com o WorkerManager ou método original
    if (workerManagerRef.current) {
      performBatchQueryWithWorkerManager(newBatchQuery);
    } else {
      performBatchQuery(newBatchQuery);
    }
  };

  // Função para lidar com a entrada de termos em lote
  const handleBatchTermsInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setBatchTermsInput(value);

    // Separa os termos por linha nova ou vírgula
    const terms = value
      .split(/[\n,]/) // Divide por novas linhas ou vírgulas
      .map((term) => term.trim())
      .filter((term) => term.length > 0); // Remove termos vazios

    setBatchTerms(terms);
  };

  // Função para ler um arquivo de termos
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;

      // Atualiza os campos de texto
      setBatchTermsInput(content);

      // Processa os termos
      const terms = content
        .split(/[\n,]/)
        .map((term) => term.trim())
        .filter((term) => term.length > 0);

      setBatchTerms(terms);
      console.log(`Carregados ${terms.length} termos do arquivo`);
    };

    reader.readAsText(file);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Sistema de Consultas
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid size={12}>
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
            </Grid>

            <Grid size={12}>
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
            </Grid>

            <Grid
              size={12}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={batchMode}
                    onChange={() => setBatchMode(!batchMode)}
                  />
                }
                label="Modo de requisições múltiplas"
              />

              <Tooltip
                title={
                  useWorkers
                    ? "Usando Web Workers para máximo paralelismo"
                    : "Usando await direto (limite de 6 conexões)"
                }
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={useWorkers}
                      onChange={() => setUseWorkers(!useWorkers)}
                    />
                  }
                  label="Usar Web Workers"
                />
              </Tooltip>
            </Grid>

            {!batchMode ? (
              <Grid size={12}>
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
              </Grid>
            ) : (
              <>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Número de requisições"
                    value={batchSize}
                    onChange={(e) =>
                      setBatchSize(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    InputProps={{ inputProps: { min: 1 } }}
                    helperText="Quantidade máxima de requisições a serem executadas"
                  />
                </Grid>
                <Grid size={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Termos de busca (um por linha ou separados por vírgula)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={batchTermsInput}
                    onChange={handleBatchTermsInput}
                    placeholder={`Termo 1\nTermo 2\nTermo 3`}
                    helperText={`${batchTerms.length} termos carregados`}
                  />
                </Grid>
                <Grid size={12}>
                  <Button variant="outlined" component="label" sx={{ mr: 2 }}>
                    Carregar arquivo de termos
                    <input
                      type="file"
                      hidden
                      accept=".txt,.csv"
                      onChange={handleFileUpload}
                    />
                  </Button>
                </Grid>
              </>
            )}

            <Grid size={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleQuery}
                fullWidth
                disabled={batchMode && batchTerms.length === 0}
              >
                {batchMode
                  ? `Executar ${Math.min(
                      batchSize,
                      batchTerms.length || 1
                    )} requisições`
                  : "Buscar"}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Resultados de consultas em lote */}
        {batchQueries.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Resultados de Consultas em Lote
            </Typography>
            <Grid container spacing={2}>
              {batchQueries.map((batch) => (
                <Grid size={12} key={batch.id}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        Lote de {batch.total} requisições ({batch.queryType}) -
                        {batch.status === "completed"
                          ? " Concluído"
                          : batch.status === "error"
                          ? " Erro"
                          : ` ${batch.completed}/${batch.total}`}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {batch.status === "pending" && (
                        <Box sx={{ width: "100%", mb: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={batch.progress}
                            sx={{ height: 10, borderRadius: 1, mb: 1 }}
                          />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            align="center"
                          >
                            {batch.statusMessage}
                          </Typography>
                        </Box>
                      )}

                      {batch.error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {batch.error}
                        </Alert>
                      )}

                      <Typography variant="subtitle2" gutterBottom>
                        {batch.results.length} resultados encontrados
                      </Typography>

                      <Box sx={{ maxHeight: "400px", overflow: "auto" }}>
                        {batch.results.map((result, index) => (
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
                              <strong>Data de Nascimento:</strong> {result.nasc}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Resultados de consultas individuais */}
        {queries.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Resultados de Consultas Individuais
            </Typography>
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
        )}
      </Box>
    </Container>
  );
}

export default App;
