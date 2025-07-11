import { useState, useRef, useEffect } from "react";
import {
  QueryResult,
  TCPClient,
  ProgressUpdate,
  BatchProgressUpdate,
  CNPJResult,
} from "../../services/TCPClient";
import { WorkerManager } from "../../services/WorkerManager";
import { useAuth } from "../../contexts/AuthContext";

// Types
export type QueryType = "name" | "exactName" | "cpf" | "cnpj";

// Interfaces
export interface QueryState {
  id: string;
  searchTerm: string;
  queryType: QueryType;
  results: QueryResult[] | null;
  error: string | null;
  progress: number;
  status: "pending" | "completed" | "error";
  startTime: number;
  requestNumber: number;
  retryCount: number;
  statusMessage: string;
}

export interface BatchQueryState {
  id: string;
  queryType: QueryType;
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

export interface CNPJByNameCPFState {
  id: string;
  searchName: string;
  searchCPF: string;
  results: CNPJResult[] | null;
  error: string | null;
  isLoading: boolean;
  status: "pending" | "completed" | "error";
  startTime: number;
}

// Validation functions
export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, "");

  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // All same digits

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;

  return true;
};

export const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, "");

  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false; // All same digits

  // Pesos para o primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleanCNPJ.charAt(12))) return false;

  // Pesos para o segundo dígito verificador (incluindo o primeiro dígito verificador)
  const weights2 = [6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9, 2];

  // Calcular segundo dígito verificador (incluindo o primeiro dígito verificador)
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cleanCNPJ.charAt(13))) return false;

  return true;
};

export const useTCPClientPage = () => {
  const { token, user, connectionConfig, updateConnectionConfig } = useAuth();
  const [nameSearchTerm, setNameSearchTerm] = useState(""); // Para name e exactName
  const [documentSearchTerm, setDocumentSearchTerm] = useState(""); // Para cpf e cnpj
  const [queryType, setQueryType] = useState<QueryType>("name");
  const [queries, setQueries] = useState<QueryState[]>([]);
  const [batchQueries, setBatchQueries] = useState<BatchQueryState[]>([]);
  const [cnpjByNameCPFQueries, setCnpjByNameCPFQueries] = useState<
    CNPJByNameCPFState[]
  >([]);
  const requestCounterRef = useRef(0);
  const progressIntervalsRef = useRef<Record<string, number>>({});

  // Ref para controlar requisições em andamento e evitar duplicações
  const pendingQueriesRef = useRef<Set<string>>(new Set());

  // Novos estados para requisições em lote
  const [batchMode, setBatchMode] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [batchTerms, setBatchTerms] = useState<string[]>([]);
  const [batchTermsInput, setBatchTermsInput] = useState("");

  // Referência ao WorkerManager
  const workerManagerRef = useRef<WorkerManager | null>(null);

  // Inicializa o WorkerManager
  useEffect(() => {
    workerManagerRef.current = new WorkerManager();

    // Limpeza quando o componente é desmontado
    return () => {
      if (workerManagerRef.current) {
        workerManagerRef.current.cancelAllQueries();
        workerManagerRef.current = null;
      }

      Object.values(progressIntervalsRef.current).forEach((intervalId) => {
        window.clearInterval(intervalId);
      });

      // Limpar requisições pendentes
      pendingQueriesRef.current.clear();
    };
  }, []);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleQuery();
    }
  };

  // Função para obter o termo de busca correto baseado no tipo
  const getCurrentSearchTerm = () => {
    if (queryType === "name" || queryType === "exactName") {
      return nameSearchTerm;
    } else {
      return documentSearchTerm;
    }
  };

  // Função para definir o termo de busca correto baseado no tipo
  const setCurrentSearchTerm = (value: string) => {
    if (queryType === "name" || queryType === "exactName") {
      setNameSearchTerm(value);
    } else {
      setDocumentSearchTerm(value);
    }
  };

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove mask characters if it's a CPF or CNPJ input
    const cleanValue =
      queryType === "cpf" || queryType === "cnpj"
        ? value.replace(/\D/g, "")
        : value;
    setCurrentSearchTerm(cleanValue);
  };

  // Validação do termo de busca
  const validateSearchTerm = (
    term: string,
    type: QueryType
  ): { isValid: boolean; message: string } => {
    if (!term.trim()) {
      return { isValid: false, message: "Por favor, digite um termo de busca" };
    }

    if (type === "cpf") {
      if (!validateCPF(term)) {
        return { isValid: false, message: "CPF inválido" };
      }
    }
    // CNPJ validation disabled - always valid
    // else if (type === "cnpj") {
    //   if (!validateCNPJ(term)) {
    //     return { isValid: false, message: "CNPJ inválido" };
    //   }
    // }

    return { isValid: true, message: "" };
  };

  // Função para buscar CNPJ por CPF
  const handleCNPJByCPF = async (nome: string, cpf: string) => {
    if (!nome.trim() || !cpf.trim()) {
      alert("Nome e CPF são obrigatórios para buscar CNPJ");
      return;
    }

    const newQuery: CNPJByNameCPFState = {
      id: Date.now().toString(),
      searchName: nome,
      searchCPF: cpf,
      results: null,
      error: null,
      isLoading: true,
      status: "pending",
      startTime: Date.now(),
    };

    setCnpjByNameCPFQueries((prev) => [newQuery, ...prev]);

    try {
      console.log(`Buscando CNPJs para: Nome="${nome}", CPF="${cpf}"`);

      const client = new TCPClient(
        connectionConfig.host,
        parseInt(connectionConfig.port),
        true,
        ++requestCounterRef.current
      );

      const results = await client.getPersonCNPJByNameAndCPF(
        nome,
        cpf,
        token || undefined
      );

      setCnpjByNameCPFQueries((prev) =>
        prev.map((q) =>
          q.id === newQuery.id
            ? {
                ...q,
                results: results as CNPJResult[],
                isLoading: false,
                status: "completed",
                error: null,
              }
            : q
        )
      );

      console.log(`Encontrados ${results.length} CNPJs para ${nome}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";

      setCnpjByNameCPFQueries((prev) =>
        prev.map((q) =>
          q.id === newQuery.id
            ? {
                ...q,
                error: errorMessage,
                isLoading: false,
                status: "error",
              }
            : q
        )
      );

      console.error("Erro ao buscar CNPJ por nome e CPF:", error);
    }
  };

  // Função para processar atualizações de progresso do servidor
  const handleProgressUpdate =
    (queryId: string) => (update: ProgressUpdate) => {
      setQueries((prev) =>
        prev.map((q) => {
          if (q.id === queryId) {
            // Verificar se a atualização contém resultados em formato direto
            let processedResults = q.results;

            if (update.results) {
              // Se update.results é um array, usar diretamente
              if (Array.isArray(update.results)) {
                processedResults = update.results;
              }
              // Se update.results é um objeto com propriedade 'results', extrair o array
              else if (
                update.results &&
                (update.results as any).results &&
                Array.isArray((update.results as any).results)
              ) {
                processedResults = (update.results as any)
                  .results as QueryResult[];
              }
            }

            return {
              ...q,
              progress: update.progress,
              statusMessage:
                update.message || `${update.status} (${update.progress}%)`,
              status: update.isComplete ? "completed" : "pending",
              results: processedResults,
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

    // Criar chave para remover da lista de pendentes
    const queryKey = `${query.queryType}:${query.searchTerm}:${connectionConfig.host}:${connectionConfig.port}`;

    // Configurar as callbacks
    const callbacks = {
      onProgress: handleProgressUpdate(query.id),
      onComplete: (results: QueryResult[] | any) => {
        // Remover da lista de requisições pendentes
        pendingQueriesRef.current.delete(queryKey);

        // Processar os resultados para garantir que temos o formato correto
        let processedResults: QueryResult[] = [];

        if (Array.isArray(results)) {
          processedResults = results;
        } else if (
          results &&
          results.results &&
          Array.isArray(results.results)
        ) {
          processedResults = results.results;
        }

        setQueries((prev) =>
          prev.map((q) =>
            q.id === query.id
              ? {
                  ...q,
                  results: processedResults,
                  status: "completed",
                  progress: 100,
                  statusMessage: "Consulta concluída com sucesso",
                }
              : q
          )
        );
      },
      onError: (errorMessage: string) => {
        // Remover da lista de requisições pendentes
        pendingQueriesRef.current.delete(queryKey);

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

    // Executar a consulta usando o WorkerManager com token
    workerManagerRef.current.executeQuery(
      {
        host: connectionConfig.host,
        port: parseInt(connectionConfig.port),
        searchTerm: query.searchTerm,
        queryType: query.queryType,
        queryId: query.id,
        requestNumber: query.requestNumber,
        token: token || undefined, // Adicionar o token aqui
      },
      callbacks
    );
  };

  const handleQuery = () => {
    const currentSearchTerm = getCurrentSearchTerm();
    const validation = validateSearchTerm(currentSearchTerm, queryType);

    if (!validation.isValid) {
      alert(validation.message);
      return;
    }

    // Criar uma chave única para identificar a requisição
    const queryKey = `${queryType}:${currentSearchTerm}:${connectionConfig.host}:${connectionConfig.port}`;

    // Verificar se já existe uma requisição em andamento com os mesmos parâmetros
    if (pendingQueriesRef.current.has(queryKey)) {
      console.log(`Requisição duplicada detectada e ignorada: ${queryKey}`);
      return;
    }

    const newQuery: QueryState = {
      id: Date.now().toString(),
      searchTerm: currentSearchTerm,
      queryType,
      results: null,
      error: null,
      progress: 0,
      status: "pending",
      startTime: Date.now(),
      requestNumber: ++requestCounterRef.current,
      retryCount: 0,
      statusMessage: "Iniciando...",
    };

    // Adicionar à lista de requisições pendentes
    pendingQueriesRef.current.add(queryKey);

    setQueries((prev) => [newQuery, ...prev]);

    // Usar WorkerManager para todos os tipos de consulta
    performQueryWithWorkerManager(newQuery);
  };

  const clearResults = () => {
    setQueries([]);
    setBatchQueries([]);
    setCnpjByNameCPFQueries([]);
    // Limpar requisições pendentes
    pendingQueriesRef.current.clear();
  };

  return {
    // State
    connectionConfig,
    updateConnectionConfig,
    nameSearchTerm,
    setNameSearchTerm,
    documentSearchTerm,
    setDocumentSearchTerm,
    queryType,
    setQueryType,
    queries,
    batchQueries,
    cnpjByNameCPFQueries,
    batchMode,
    setBatchMode,
    batchSize,
    setBatchSize,
    batchTerms,
    setBatchTerms,
    batchTermsInput,
    setBatchTermsInput,
    user,
    token,

    // Functions
    handleQuery,
    clearResults,
    handleKeyPress,
    handleSearchTermChange,
    handleCNPJByCPF,
    validateSearchTerm,
    getCurrentSearchTerm,
  };
};
