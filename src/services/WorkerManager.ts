// filepath: c:\subDesktop\Unipampa\2025\Redes\FrontClientServer-multithread\src\services\WorkerManager.ts
import { TCPClient, QueryResult, ProgressUpdate } from "./TCPClient";

export type QueryType = "name" | "exactName" | "cpf";

interface QueryWorkerOptions {
  host: string;
  port: number;
  searchTerm: string;
  queryType: QueryType;
  queryId: string;
  requestNumber: number;
  useProgressWorker?: boolean;
}

interface ProgressResponse {
  type: "progress";
  data: {
    queryId: string;
    progress: number;
    status?: string;
    message?: string;
    results?: QueryResult[];
    isComplete?: boolean;
  };
}

interface ResultResponse {
  type: "result";
  data: {
    queryId: string;
    results: QueryResult[];
    totalTime: number;
  };
}

interface ErrorResponse {
  type: "error";
  data: {
    queryId: string;
    error: string;
  };
}

type WorkerResponse = ProgressResponse | ResultResponse | ErrorResponse;

export class WorkerManager {
  private activeWorkers: Map<string, Worker> = new Map();
  private callbackMap: Map<
    string,
    {
      onProgress?: (update: ProgressUpdate) => void;
      onComplete?: (results: QueryResult[]) => void;
      onError?: (error: string) => void;
    }
  > = new Map();

  // Opção para usar workers ou não
  private _useWorkers: boolean = true;

  private activeConnections: number = 0;
  private maxConnections: number = 4; // Menor que o limite do navegador (6)
  private pendingQueries: Array<{
    options: QueryWorkerOptions;
    callbacks: any;
  }> = [];

  constructor(useWorkers: boolean = true) {
    this._useWorkers = useWorkers;
  }

  // Getter/Setter para a opção de usar workers
  get useWorkers(): boolean {
    return this._useWorkers;
  }

  set useWorkers(value: boolean) {
    this._useWorkers = value;
  }

  // Método para executar uma consulta
  public executeQuery(
    options: QueryWorkerOptions,
    callbacks: {
      onProgress?: (update: ProgressUpdate) => void;
      onComplete?: (results: QueryResult[]) => void;
      onError?: (error: string) => void;
    }
  ): void {
    // Importante: Primeiro armazenar callbacks originais no mapa
    this.callbackMap.set(options.queryId, callbacks);

    if (this.activeConnections >= this.maxConnections) {
      console.log(
        `Conexão ${options.queryId} enfileirada. Ativas: ${this.activeConnections}`
      );
      this.pendingQueries.push({ options, callbacks });
    } else {
      this._executeQuery(options, callbacks);
    }
  }

  private _executeQuery(options: QueryWorkerOptions, callbacks: any): void {
    this.activeConnections++;
    console.log(
      `Iniciando conexão ${options.queryId}. Total ativas: ${this.activeConnections}`
    );

    const wrappedCallbacks = {
      onComplete: (results: any) => {
        this.activeConnections--;
        console.log(
          `Finalizando conexão ${options.queryId}. Restantes: ${this.activeConnections}`
        );
        callbacks.onComplete?.(results);
        this._processNextInQueue();
      },
      onError: (error: string) => {
        this.activeConnections--;
        console.log(
          `Erro na conexão ${options.queryId}. Restantes: ${this.activeConnections}`
        );
        callbacks.onError?.(error);
        this._processNextInQueue();
      },
      onProgress: callbacks.onProgress,
    };

    if (this._useWorkers) {
      this.executeWithWorker(options, wrappedCallbacks);
    } else {
      this.executeWithAwait(options, wrappedCallbacks);
    }
  }

  private _processNextInQueue(): void {
    if (
      this.pendingQueries.length > 0 &&
      this.activeConnections < this.maxConnections
    ) {
      const next = this.pendingQueries.shift();
      if (next) {
        console.log(
          `Processando próxima requisição da fila: ${next.options.queryId}`
        );
        this._executeQuery(next.options, next.callbacks);
      }
    }
  }

  // Método para executar a consulta usando worker
  private executeWithWorker(
    options: QueryWorkerOptions,
    wrappedCallbacks: any
  ): void {
    const { queryId } = options;

    try {
      // Criar worker
      console.log(`Criando worker para consulta ${queryId}`);
      const worker = new Worker(
        new URL("../workers/queryWorker.ts", import.meta.url),
        { type: "module" }
      );

      // Armazenar worker para possível cancelamento posterior
      this.activeWorkers.set(queryId, worker);

      // Configurar timeout para o worker (adicional ao timeout interno)
      const workerTimeout = setTimeout(() => {
        console.error(
          `Worker para consulta ${queryId} atingiu o timeout global`
        );
        this.handleWorkerTimeout(queryId, worker);
      }, 30000); // 30 segundos de timeout global

      // Configurar handler de mensagens
      worker.onmessage = (event) => {
        const response = event.data as WorkerResponse;

        switch (response.type) {
          case "progress":
            if (response.data) {
              wrappedCallbacks.onProgress?.({
                progress: response.data.progress,
                status: response.data.status || "Processando",
                message: response.data.message,
                isComplete: response.data.isComplete || false,
                results: response.data.results,
              });
            }
            break;

          case "result":
            if (response.data) {
              // Usar o wrappedCallback que vai gerenciar a fila
              wrappedCallbacks.onComplete?.(response.data.results);
            }
            // Limpar recursos após conclusão
            clearTimeout(workerTimeout);
            this.cleanupWorker(queryId);
            break;

          case "error":
            if (response.data) {
              // Usar o wrappedCallback que vai gerenciar a fila
              wrappedCallbacks.onError?.(response.data.error);
            }
            // Limpar recursos após erro
            clearTimeout(workerTimeout);
            this.cleanupWorker(queryId);
            break;
        }
      };

      // Configurar handler de erros
      worker.onerror = (error) => {
        console.error(`Erro no worker ${queryId}:`, error);
        // Usar o wrappedCallback que vai gerenciar a fila
        wrappedCallbacks.onError?.(`Erro no worker: ${error.message}`);

        // Limpar recursos após erro
        clearTimeout(workerTimeout);
        this.cleanupWorker(queryId);
      };

      // Iniciar worker com as opções
      console.log(`Enviando mensagem para worker ${queryId}`);
      worker.postMessage(options);
    } catch (error) {
      // Em caso de falha na criação do worker, notificar erro
      console.error(
        `Falha ao criar/iniciar worker para consulta ${queryId}:`,
        error
      );

      // Usar o wrappedCallback que vai gerenciar a fila
      wrappedCallbacks.onError?.(
        `Falha ao criar worker: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );

      // Limpar recursos
      this.cleanupWorker(queryId);
    }
  }

  private handleWorkerTimeout(queryId: string, worker: Worker): void {
    console.warn(
      `Worker ${queryId} não respondeu no tempo esperado. Encerrando...`
    );
    const callbacks = this.callbackMap.get(queryId);

    // Decrementar contador de conexões ativas
    this.activeConnections--;
    console.log(
      `Timeout na conexão ${queryId}. Restantes: ${this.activeConnections}`
    );

    // Notificar erro de timeout
    if (callbacks && callbacks.onError) {
      callbacks.onError("O servidor não respondeu no tempo esperado (timeout)");
    }

    // Limpar recursos
    this.cleanupWorker(queryId);

    // Processar próxima requisição da fila após timeout
    this._processNextInQueue();
  }

  // Método para executar a consulta usando await (sem worker)
  private async executeWithAwait(
    options: QueryWorkerOptions,
    wrappedCallbacks: any
  ): Promise<void> {
    const { host, port, searchTerm, queryType, queryId, requestNumber } =
      options;
    if (!wrappedCallbacks) return; // Sem callbacks registrados

    try {
      // Uso direto do TCPClient
      const client = new TCPClient(
        host,
        port,
        true,
        requestNumber,
        wrappedCallbacks.onProgress // Passamos o callback de progresso diretamente
      );

      let results: QueryResult[];

      // Execução da consulta de acordo com o tipo
      switch (queryType) {
        case "name":
          results = await client.getPersonByName(searchTerm);
          break;
        case "exactName":
          results = await client.getPersonByExactName(searchTerm);
          break;
        case "cpf":
          // Para CPF, simulamos o progresso manualmente pois não tem streaming
          let intervalId: number | undefined;
          const startTime = Date.now();
          const updateInterval = 50;
          const estimatedTime = 5000;

          // Criar um intervalo para atualizar o progresso
          if (wrappedCallbacks.onProgress) {
            intervalId = window.setInterval(() => {
              const elapsed = Date.now() - startTime;
              const progress = Math.min(95, (elapsed / estimatedTime) * 100);

              wrappedCallbacks.onProgress?.({
                progress,
                status: "Processando",
                message: `Consultando CPF ${searchTerm}`,
                isComplete: false,
              });

              if (progress >= 95) {
                clearInterval(intervalId);
              }
            }, updateInterval) as unknown as number;
          }

          // Executar a consulta
          results = await client.getPersonByCPF(searchTerm);

          // Limpar o intervalo se existir
          if (intervalId) {
            clearInterval(intervalId);
          }
          break;

        default:
          throw new Error("Tipo de consulta inválido");
      }

      // Notificar resultado completo usando o wrapped callback
      // que vai gerenciar a fila e o contador de conexões
      wrappedCallbacks.onComplete?.(results);
    } catch (error) {
      // Notificar erro usando o wrapped callback
      // que vai gerenciar a fila e o contador de conexões
      wrappedCallbacks.onError?.(
        error instanceof Error ? error.message : "Erro desconhecido"
      );
    }
  }

  // Método para cancelar uma consulta em andamento
  public cancelQuery(queryId: string): void {
    const worker = this.activeWorkers.get(queryId);
    if (worker) {
      worker.terminate();
      this.cleanupWorker(queryId);
    }
  }

  // Método para limpar recursos após uma consulta
  private cleanupWorker(queryId: string): void {
    const worker = this.activeWorkers.get(queryId);
    if (worker) {
      worker.terminate();
      this.activeWorkers.delete(queryId);
    }
    this.callbackMap.delete(queryId);
  }

  // Método para cancelar todas as consultas em andamento
  public cancelAllQueries(): void {
    for (const worker of this.activeWorkers.values()) {
      worker.terminate();
    }
    this.activeWorkers.clear();
    this.callbackMap.clear();
  }
}
