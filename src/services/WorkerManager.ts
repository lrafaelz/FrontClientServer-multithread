// filepath: c:\subDesktop\Unipampa\2025\Redes\FrontClientServer-multithread\src\services\WorkerManager.ts
import { TCPClient } from "./TCPClient";
import { QueryResult, ProgressUpdate, QueryType, QueryOptions } from "../types";

export class WorkerManager {
  private activeConnections: number = 0;
  private maxConnections: number = 4; // Menor que o limite do navegador (6)
  private pendingQueries: Array<{
    options: QueryOptions;
    callbacks: any;
  }> = [];

  constructor() {
    // Constructor simplificado - não precisa de parâmetros
  }

  // Método para executar uma consulta
  public executeQuery(
    options: QueryOptions,
    callbacks: {
      onProgress?: (update: ProgressUpdate) => void;
      onComplete?: (results: QueryResult[]) => void;
      onError?: (error: string) => void;
    }
  ): void {
    if (this.activeConnections >= this.maxConnections) {
      console.log(
        `Conexão ${options.queryId} enfileirada. Ativas: ${this.activeConnections}`
      );
      this.pendingQueries.push({ options, callbacks });
    } else {
      this._executeQuery(options, callbacks);
    }
  }

  private _executeQuery(options: QueryOptions, callbacks: any): void {
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

    // Sempre usar execução direta (sem workers)
    this.executeWithAwait(options, wrappedCallbacks);
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

  // Método para executar a consulta usando await (sem worker)
  private async executeWithAwait(
    options: QueryOptions,
    wrappedCallbacks: any
  ): Promise<void> {
    const { host, port, searchTerm, queryType, requestNumber, token } = options;
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
          results = await client.getPersonByName(searchTerm, token);
          break;
        case "exactName":
          results = await client.getPersonByExactName(searchTerm, token);
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
          results = await client.getPersonByCPF(searchTerm, token);

          // Limpar o intervalo se existir
          if (intervalId) {
            clearInterval(intervalId);
          }
          break;

        case "cnpj":
          // Para CNPJ, simulamos o progresso manualmente pois não tem streaming
          let cnpjIntervalId: number | undefined;
          const cnpjStartTime = Date.now();
          const cnpjUpdateInterval = 50;
          const cnpjEstimatedTime = 5000;

          // Criar um intervalo para atualizar o progresso
          if (wrappedCallbacks.onProgress) {
            cnpjIntervalId = window.setInterval(() => {
              const elapsed = Date.now() - cnpjStartTime;
              const progress = Math.min(
                95,
                (elapsed / cnpjEstimatedTime) * 100
              );

              wrappedCallbacks.onProgress?.({
                progress,
                status: "Processando",
                message: `Consultando CNPJ ${searchTerm}`,
                isComplete: false,
              });

              if (progress >= 95) {
                clearInterval(cnpjIntervalId);
              }
            }, cnpjUpdateInterval) as unknown as number;
          }

          // Executar a consulta CNPJ e converter para QueryResult[]
          const cnpjResults = await client.getCompanyByCNPJ(searchTerm, token);
          results = cnpjResults.map((cnpj) => ({
            cpf: cnpj.cnpj, // Usar CNPJ no campo CPF para compatibilidade
            nome: cnpj.razao_social,
            sexo: cnpj.natureza_juridica || "Empresa",
            nasc: cnpj.data_situacao || "",
          }));

          // Limpar o intervalo se existir
          if (cnpjIntervalId) {
            clearInterval(cnpjIntervalId);
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

  // Método para cancelar todas as consultas em andamento
  public cancelAllQueries(): void {
    // Limpar fila de requisições pendentes
    this.pendingQueries = [];
    this.activeConnections = 0;
  }
}
