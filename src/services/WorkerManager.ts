import { TCPClient } from "./TCPClient";
import { QueryResult, QueryOptions } from "../types";

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
      onComplete?: (results: QueryResult[], cnpjResults?: any[]) => void;
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
      onComplete: (results: any, cnpjResults?: any) => {
        this.activeConnections--;
        console.log(
          `Finalizando conexão ${options.queryId}. Restantes: ${this.activeConnections}`
        );
        callbacks.onComplete?.(results, cnpjResults);
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
    const {
      host,
      port,
      searchTerm,
      queryType,
      requestNumber,
      token,
      onUnauthorized,
    } = options;
    if (!wrappedCallbacks) return; // Sem callbacks registrados

    try {
      // Uso direto do TCPClient
      const client = new TCPClient(
        host,
        port,
        true,
        requestNumber,
        onUnauthorized // Callback para 401 Unauthorized
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
          // Executar a consulta diretamente sem simulação de progresso
          results = await client.getPersonByCPF(searchTerm, token);
          break;

        case "cnpj":
          // Executar a consulta CNPJ e converter para QueryResult[]
          const cnpjResults = await client.getCompanyByCNPJ(searchTerm, token);
          results = cnpjResults.map((cnpj) => ({
            cpf: cnpj.cnpj, // Usar CNPJ no campo CPF para compatibilidade
            nome: cnpj.razao_social,
            sexo: cnpj.nome_fantasia || "Empresa", // Nome fantasia no campo sexo para compatibilidade
            nasc: cnpj.uf || "", // UF no campo nasc para compatibilidade
          }));

          // Notificar resultado com dados completos de CNPJ
          wrappedCallbacks.onComplete?.(results, cnpjResults);
          return;

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
