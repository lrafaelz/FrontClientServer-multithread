import { TCPClient } from "../services/TCPClient";

const ctx: Worker = self as any;

// Interface para as mensagens recebidas
interface QueryWorkerMessage {
  host: string;
  port: number;
  searchTerm: string;
  queryType: "name" | "exactName" | "cpf";
  queryId: string;
  requestNumber: number;
  useProgressWorker?: boolean;
}

// Interface para as mensagens de progresso
interface ProgressMessage {
  type: "progress";
  data: {
    queryId: string;
    progress: number;
    status?: string;
    message?: string;
  };
}

// Interface para as mensagens de resultado
interface ResultMessage {
  type: "result";
  data: {
    queryId: string;
    results: any[];
    totalTime: number;
  };
}

// Interface para as mensagens de erro
interface ErrorMessage {
  type: "error";
  data: {
    queryId: string;
    error: string;
  };
}

// Tipo de união para todas as mensagens possíveis
type WorkerMessage = ProgressMessage | ResultMessage | ErrorMessage;

// Interface para o worker de progresso
interface ProgressWorker extends Worker {
  terminate(): void;
}

// Função para enviar mensagem de progresso ao thread principal
function sendProgress(
  queryId: string,
  progress: number,
  status: string = "Processando",
  message: string = ""
): void {
  ctx.postMessage({
    type: "progress",
    data: {
      queryId,
      progress,
      status,
      message,
    },
  });
}

// Função para enviar mensagem de erro ao thread principal
function sendError(queryId: string, error: string): void {
  console.error(`[Worker] Erro na consulta ${queryId}: ${error}`);
  ctx.postMessage({
    type: "error",
    data: {
      queryId,
      error,
    },
  });
}

ctx.onmessage = async (event) => {
  const {
    host,
    port,
    searchTerm,
    queryType,
    queryId,
    requestNumber,
    useProgressWorker = true,
  } = event.data as QueryWorkerMessage;

  // Declaração explícita da variável progressWorker no escopo principal
  let progressWorker: Worker | null = null;

  // Verificar dados de entrada
  if (!host || !port || !searchTerm || !queryType || !queryId) {
    sendError(
      queryId || "unknown",
      "Parâmetros de consulta inválidos ou incompletos"
    );
    return;
  }

  // Envia progresso inicial
  sendProgress(queryId, 5, "Iniciando consulta", "Preparando conexão");

  try {
    // Usar o requestNumber que vem do componente App
    console.log(
      `[Worker #${requestNumber}] Iniciando consulta de ${queryType}: ${searchTerm}`
    );

    // Verificar se o host e porta são válidos
    if (host.trim() === "" || isNaN(port) || port <= 0 || port > 65535) {
      sendError(queryId, `Host ou porta inválidos: ${host}:${port}`);
      return;
    }

    // Enviar progresso de conexão
    sendProgress(
      queryId,
      10,
      "Conectando",
      `Conectando ao servidor ${host}:${port}`
    );

    // Criar cliente com conexão HTTPS direta e passar o requestNumber
    const client = new TCPClient(
      host,
      port,
      true,
      requestNumber,
      // Para consultas de nome ou nome exato, podemos enviar atualizações de progresso ao worker principal
      queryType !== "cpf"
        ? (update) => {
            ctx.postMessage({
              type: "progress",
              data: {
                queryId,
                progress: update.progress,
                status: update.status,
                message: update.message,
                results: update.results,
                isComplete: update.isComplete,
              },
            });
          }
        : undefined
    );

    // Reinicializar progressWorker para garantir estado limpo
    progressWorker = null;

    // Iniciar worker de progresso apenas se useProgressWorker for true e for uma consulta de CPF
    if (useProgressWorker && queryType === "cpf") {
      try {
        progressWorker = new Worker(
          new URL("./progressWorker.ts", import.meta.url),
          { type: "module" }
        );

        // Configurar worker de progresso
        progressWorker.postMessage({
          queryId,
          estimatedTime: 5000,
          updateInterval: 50,
          requestNumber, // Passa o número da requisição para o worker de progresso
        });

        // Repassar atualizações de progresso
        progressWorker.onmessage = (progressEvent) => {
          ctx.postMessage(progressEvent.data);
        };

        progressWorker.onerror = (error) => {
          console.error(`[Worker] Erro no progressWorker: ${error.message}`);
          // Se houver erro no worker de progresso, continuamos a consulta, apenas logamos o erro
        };
      } catch (progressWorkerError) {
        console.error(
          `[Worker] Erro ao criar progressWorker: ${progressWorkerError}`
        );
        // Não interrompemos a consulta principal se o worker de progresso falhar
        progressWorker = null;
      }
    }

    let response;
    const startTime = Date.now();

    // Enviar progresso antes da execução da consulta
    sendProgress(
      queryId,
      20,
      "Enviando requisição",
      `Executando consulta para ${searchTerm}`
    );

    console.log(
      `[Worker #${requestNumber}] Executando consulta para ${searchTerm}`
    );

    try {
      // Executar a consulta apropriada
      if (queryType === "name") {
        response = await client.getPersonByName(searchTerm);
      } else if (queryType === "exactName") {
        response = await client.getPersonByExactName(searchTerm);
      } else {
        response = await client.getPersonByCPF(searchTerm);
      }
    } catch (requestError: any) {
      // Tratar erros específicos da requisição
      if (
        requestError.name === "AbortError" ||
        requestError.message.includes("timeout")
      ) {
        sendError(
          queryId,
          `A requisição excedeu o tempo limite. O servidor ${host}:${port} pode estar indisponível.`
        );
      } else {
        sendError(
          queryId,
          `Erro na requisição: ${requestError.message || "Erro desconhecido"}`
        );
      }
      // Limpar recursos
      if (progressWorker) {
        progressWorker.terminate();
        progressWorker = null;
      }
      return;
    }

    console.log(`[Worker #${requestNumber}] Consulta concluída com sucesso`);

    // Encerrar worker de progresso se existir
    if (progressWorker) {
      progressWorker.terminate();
      progressWorker = null;
    }

    // Enviar resultado final
    ctx.postMessage({
      type: "result",
      data: {
        queryId,
        results: response,
        totalTime: Date.now() - startTime,
      },
    } as ResultMessage);
  } catch (error) {
    console.error(`[Worker] Erro na consulta #${requestNumber}:`, error);

    // Encerrar worker de progresso se existir
    if (progressWorker) {
      progressWorker.terminate();
      progressWorker = null;
    }

    // Determinar mensagem de erro específica baseada no erro
    let errorMessage = "Erro desconhecido";

    if (error instanceof Error) {
      // Detectar erros comuns de rede e oferecer mensagens mais úteis
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("net::ERR")
      ) {
        errorMessage = `Erro de conexão: verifique se o servidor ${host}:${port} está acessível e aceitando conexões HTTPS.`;
      } else if (error.message.includes("aborted")) {
        errorMessage = "A requisição foi cancelada por timeout.";
      } else {
        errorMessage = error.message;
      }
    }

    sendError(queryId, errorMessage);
  }
};

export {};
