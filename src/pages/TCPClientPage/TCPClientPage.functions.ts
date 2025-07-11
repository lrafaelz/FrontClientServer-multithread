import { useState, useRef, useEffect } from "react";
import { TCPClient } from "../../services/TCPClient";
import { WorkerManager } from "../../services/WorkerManager";
import { useAuth } from "../../contexts/AuthContext";
import {
  QueryResult,
  QueryType,
  QueryState,
  CNPJByNameCPFState,
} from "../../types";

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
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

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
  const {
    token,
    user,
    connectionConfig,
    updateConnectionConfig,
    handleUnauthorized,
  } = useAuth();
  const [nameSearchTerm, setNameSearchTerm] = useState(""); // Para name e exactName
  const [documentSearchTerm, setDocumentSearchTerm] = useState(""); // Para cpf e cnpj
  const [queryType, setQueryType] = useState<QueryType>("name");
  const [queries, setQueries] = useState<QueryState[]>([]);
  const [cnpjByNameCPFQueries, setCnpjByNameCPFQueries] = useState<
    CNPJByNameCPFState[]
  >([]);
  const requestCounterRef = useRef(0);

  // Ref para controlar requisições em andamento e evitar duplicações
  const pendingQueriesRef = useRef<Set<string>>(new Set());

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

      // Limpar requisições pendentes
      pendingQueriesRef.current.clear();
    };
  }, []);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleQuery();
    }
  };

  const getCurrentSearchTerm = () => {
    if (queryType === "name" || queryType === "exactName") {
      return nameSearchTerm;
    } else {
      return documentSearchTerm;
    }
  };

  const setCurrentSearchTerm = (value: string) => {
    if (queryType === "name" || queryType === "exactName") {
      setNameSearchTerm(value);
    } else {
      setDocumentSearchTerm(value);
    }
  };

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleanValue =
      queryType === "cpf" || queryType === "cnpj"
        ? value.replace(/\D/g, "")
        : value;
    setCurrentSearchTerm(cleanValue);
  };

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
    } else if (type === "cnpj") {
      if (!validateCNPJ(term)) {
        return { isValid: false, message: "CNPJ inválido" };
      }
    }

    return { isValid: true, message: "" };
  };

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
        ++requestCounterRef.current,
        handleUnauthorized // onUnauthorized
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
                results: results,
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

  const performQueryWithWorkerManager = (query: QueryState) => {
    if (!workerManagerRef.current) {
      console.error("WorkerManager não inicializado");
      return;
    }

    setQueries((prev) =>
      prev.map((q) =>
        q.id === query.id
          ? { ...q, statusMessage: "Iniciando consulta...", progress: 0 }
          : q
      )
    );

    const queryKey = `${query.queryType}:${query.searchTerm}:${connectionConfig.host}:${connectionConfig.port}`;

    const callbacks = {
      onComplete: (results: QueryResult[] | any, cnpjResults?: any[]) => {
        pendingQueriesRef.current.delete(queryKey);

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
                  cnpjResults: cnpjResults || null,
                  status: "completed",
                  progress: 100,
                  statusMessage: "Consulta concluída com sucesso",
                }
              : q
          )
        );
      },
      onError: (errorMessage: string) => {
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

    workerManagerRef.current.executeQuery(
      {
        host: connectionConfig.host,
        port: parseInt(connectionConfig.port),
        searchTerm: query.searchTerm,
        queryType: query.queryType,
        queryId: query.id,
        requestNumber: query.requestNumber,
        token: token || undefined,
        onUnauthorized: handleUnauthorized, // Callback para 401 Unauthorized
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

    // Criar uma chave única para identificar a requisição evitando requisições repetidas
    const queryKey = `${queryType}:${currentSearchTerm}:${connectionConfig.host}:${connectionConfig.port}`;

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

    pendingQueriesRef.current.add(queryKey);

    setQueries((prev) => [newQuery, ...prev]);

    performQueryWithWorkerManager(newQuery);
  };

  const clearResults = () => {
    setQueries([]);
    setCnpjByNameCPFQueries([]);
    // Limpar requisições pendentes
    pendingQueriesRef.current.clear();
  };

  return {
    // State
    connectionConfig,
    updateConnectionConfig,
    nameSearchTerm,
    documentSearchTerm,
    queryType,
    setQueryType,
    queries,
    cnpjByNameCPFQueries,
    user,
    token,

    // Functions
    handleQuery,
    clearResults,
    handleKeyPress,
    handleSearchTermChange,
    handleCNPJByCPF,
    getCurrentSearchTerm,
  };
};
