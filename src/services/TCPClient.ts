export interface QueryResult {
  cpf: string;
  nome: string;
  sexo: string;
  nasc: string;
}

export interface CNPJResult {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  situacao: string;
  data_situacao: string;
  motivo_situacao?: string;
  cidade: string;
  uf: string;
  telefone?: string;
  email?: string;
  atividade_principal: string;
  capital_social?: string;
  porte?: string;
  natureza_juridica?: string;
}

export interface CNPJByCPFResult {
  cpf: string;
  nome: string;
  empresas: CNPJResult[];
}

// Interface para representar as atualizações de progresso do servidor
export interface ProgressUpdate {
  status: string;
  message?: string;
  progress: number;
  isComplete: boolean;
  results?: QueryResult[];
}

// Interface para o progresso de múltiplas requisições
export interface BatchProgressUpdate {
  completed: number;
  total: number;
  progress: number;
  currentRequest: number;
  results: QueryResult[];
  isComplete: boolean;
}

// #############################################################################
export class TCPClient {
  private baseUrl: string;
  private requestNumber: number;
  private maxRetries: number = 3; // Número máximo de tentativas
  private retryDelay: number = 1000; // Delay entre tentativas (ms)
  private timeout: number = 10000;
  private preflightTimeout: number = 5000; // Timeout específico para preflight
  private streamingTimeoutMultiplier: number = 3; // Multiplicador para streaming quando preflight OK
  private requestTimeoutMultiplier: number = 2; // Multiplicador para requisições normais quando preflight OK
  private optionsSuccessTimeout: number = 120000; // Timeout de 120s quando OPTIONS retorna 200
  private optionsFailureTimeout: number = 60000; // Timeout de 60s quando OPTIONS falha ou não existe
  private onProgressUpdate?: (update: ProgressUpdate) => void;
  private onBatchProgressUpdate?: (update: BatchProgressUpdate) => void;

  constructor(
    host: string,
    port: number,
    useHttps: boolean = true,
    requestNumber: number = 1,
    onProgressUpdate?: (update: ProgressUpdate) => void,
    onBatchProgressUpdate?: (update: BatchProgressUpdate) => void
  ) {
    // Configuração simples da URL base
    const protocol = useHttps ? "https" : "http";
    this.baseUrl = `${protocol}://${host}:${port}`;
    // Armazena o número da requisição passado pelo App
    this.requestNumber = requestNumber;
    // Callback para atualizações de progresso
    this.onProgressUpdate = onProgressUpdate;
    // Callback para atualizações de progresso em lote
    this.onBatchProgressUpdate = onBatchProgressUpdate;
    
    console.log(`[${requestNumber}] Cliente TCP criado com timeout dinâmico baseado em preflight`);
  }

  // Método público para ajustar os timeouts
  public configureTimeouts({
    preflightTimeout,
    streamingMultiplier,
    requestMultiplier,
    optionsSuccessTimeout,
    optionsFailureTimeout
  }: {
    preflightTimeout?: number;
    streamingMultiplier?: number;
    requestMultiplier?: number;
    optionsSuccessTimeout?: number;
    optionsFailureTimeout?: number;
  }) {
    if (preflightTimeout) this.preflightTimeout = preflightTimeout;
    if (streamingMultiplier) this.streamingTimeoutMultiplier = streamingMultiplier;
    if (requestMultiplier) this.requestTimeoutMultiplier = requestMultiplier;
    if (optionsSuccessTimeout) this.optionsSuccessTimeout = optionsSuccessTimeout;
    if (optionsFailureTimeout) this.optionsFailureTimeout = optionsFailureTimeout;
    
    console.log(
      `[${this.requestNumber}] Timeouts configurados: preflight=${this.preflightTimeout}ms, ` +
      `streaming=${this.streamingTimeoutMultiplier}x, request=${this.requestTimeoutMultiplier}x, ` +
      `optionsSuccess=${this.optionsSuccessTimeout}ms, optionsFailure=${this.optionsFailureTimeout}ms`
    );
  }

  private formatCPF(cpf: string): string {
    // Remove todos os caracteres não numéricos
    const cleaned = cpf.replace(/\D/g, "");

    // Remove caracteres especiais que possam ter sido adicionados (como '}')
    const justNumbers = cleaned.replace(/[^0-9]/g, "").substring(0, 11);

    // Verifica se tem 11 dígitos
    if (justNumbers.length !== 11) {
      throw new Error("CPF deve conter 11 dígitos");
    }

    return justNumbers;
  }

  private formatCNPJ(cnpj: string): string {
    // Remove todos os caracteres não numéricos
    const cleaned = cnpj.replace(/\D/g, "");

    // Remove caracteres especiais que possam ter sido adicionados
    const justNumbers = cleaned.replace(/[^0-9]/g, "").substring(0, 14);

    // Verifica se tem 14 dígitos
    if (justNumbers.length !== 14) {
      throw new Error("CNPJ deve conter 14 dígitos");
    }

    return justNumbers;
  }

  private getHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Add authentication token if provided
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  // Método para esperar um tempo específico
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Método para verificar se o servidor está respondendo com preflight OPTIONS
  private async checkPreflightConnection(path: string, token?: string): Promise<boolean> {
    const requestId = this.requestNumber;
    const url = `${this.baseUrl}${path}`;
    
    try {
      console.log(`[${requestId}] Verificando conexão preflight para: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log(`[${requestId}] Timeout na verificação preflight`);
      }, this.preflightTimeout);

      const response = await fetch(url, {
        method: "OPTIONS",
        headers: this.getHeaders(token),
        signal: controller.signal,
        mode: "cors",
        credentials: "include",
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`[${requestId}] Preflight OPTIONS bem-sucedido (${response.status})`);
        return true;
      } else {
        console.log(`[${requestId}] Preflight OPTIONS falhou (${response.status})`);
        return false;
      }
    } catch (error) {
      console.log(`[${requestId}] Erro na verificação preflight:`, error);
      return false;
    }
  }

  // Método para processar respostas em streaming do servidor
  private async makeStreamRequest(
    path: string,
    token?: string
  ): Promise<QueryResult[]> {
    // Usa o número da requisição que veio do App
    const requestId = this.requestNumber;
    let retryCount = 0;
    let lastError: Error | null = null;

    // Verificar se o servidor está respondendo com preflight OPTIONS
    const preflightSuccess = await this.checkPreflightConnection(path, token);
    
    // Ajustar timeout baseado no sucesso do preflight
    // Se OPTIONS = 200: usa timeout de 120s
    // Se OPTIONS falha ou não existe: usa timeout de 60s
    const dynamicTimeout = preflightSuccess 
      ? this.optionsSuccessTimeout  // 120s quando OPTIONS retorna 200
      : this.optionsFailureTimeout; // 60s quando OPTIONS falha
    
    console.log(
      `[${requestId}] Preflight: ${preflightSuccess ? 'OK (200)' : 'FALHOU'} - Timeout: ${dynamicTimeout}ms`
    );

    while (retryCount <= this.maxRetries) {
      try {
        console.log(
          `[${requestId}] Tentativa ${retryCount + 1}/${
            this.maxRetries + 1
          } para: ${path}`
        );
        const startTime = Date.now();
        const url = `${this.baseUrl}${path}`;

        // Usando fetch com AbortController para controlar timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.warn(
            `[${requestId}] Tempo limite de ${dynamicTimeout}ms atingido, abortando requisição.`
          );
        }, dynamicTimeout);

        console.log(
          `[${requestId}] Iniciando requisição streaming para: ${url}`
        );

        // Fazemos fetch em modo streaming com tratamento de erro melhorado
        const response = await fetch(url, {
          method: "GET",
          headers: this.getHeaders(token),
          signal: controller.signal,
          // Desabilitar cache para evitar problemas com requisições pendentes
          cache: "no-store",
          // Set mode to cors for proper CORS handling
          mode: "cors",
          // Set credentials to include for CORS requests
          credentials: "include",
        }).catch((err) => {
          clearTimeout(timeoutId);
          throw err;
        });

        // Limpa o timeout pois a conexão foi estabelecida
        clearTimeout(timeoutId);

        // Verifica resposta
        if (!response.ok) {
          const errorText = await response
            .text()
            .catch(() => "Não foi possível ler o corpo da resposta");
          throw new Error(
            `Erro na requisição: ${response.status} ${response.statusText}. Detalhes: ${errorText}`
          );
        }

        // Garantindo que temos um ReadableStream
        if (!response.body) {
          throw new Error("Resposta não possui corpo legível");
        }

        // Processar o stream
        const reader = response.body.getReader();
        let incompleteJSON = "";
        let results: QueryResult[] = [];

        // Função para extrair objetos JSON válidos de texto
        const extractJSONObjects = (text: string): [any[], string] => {
          let validObjects: any[] = [];
          let remaining = text;

          // Versão otimizada: busca por objetos JSON usando expressões regulares
          // Isso é mais rápido que analisar caractere por caractere
          const regex = /{[^{}]*(?:{[^{}]*}[^{}]*)*}/g;
          let match;

          // Encontra todos os possíveis objetos JSON
          const matches = [];
          while ((match = regex.exec(remaining)) !== null) {
            const jsonStr = match[0];
            const start = match.index;
            const end = start + jsonStr.length;

            try {
              const jsonObj = JSON.parse(jsonStr);
              validObjects.push(jsonObj);
              matches.push({ start, end });
            } catch (e) {
              // Ignora objetos JSON inválidos
            }
          }

          // Se não encontramos correspondências, retorna o texto original como "restante"
          if (matches.length === 0) {
            // Limita o tamanho do texto restante para evitar vazamentos de memória
            if (remaining.length > 10000) {
              // Se for muito grande, mantém apenas os últimos 1000 caracteres
              // que podem conter o início de um objeto JSON
              remaining = remaining.substring(remaining.length - 1000);
            }
            return [validObjects, remaining];
          }

          // Caso contrário, mantém apenas o texto após o último objeto completo
          const lastMatch = matches[matches.length - 1];
          remaining = remaining.substring(lastMatch.end);

          // Limita o tamanho do buffer para evitar vazamentos de memória
          if (remaining.length > 10000) {
            remaining = remaining.substring(remaining.length - 1000);
          }

          return [validObjects, remaining];
        };

        let lastProgressUpdate = Date.now();
        const THROTTLE_INTERVAL = 100; // ms

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Reduzimos o nível de log para melhorar performance
            if (this.requestNumber % 10 === 0) {
              // Log apenas a cada 10 requisições
              console.log(`[${requestId}] Stream concluído`);
            }
            break;
          }

          // Converte o chunk para texto
          const chunk = new TextDecoder().decode(value);
          const currentText = incompleteJSON + chunk;

          // Extraímos objetos JSON completos do texto atual
          const [jsonObjects, remaining] = extractJSONObjects(currentText);
          incompleteJSON = remaining;

          // Processamos cada objeto JSON encontrado com throttling para atualizações de progresso
          for (const jsonObj of jsonObjects) {
            // Reduzimos os logs para melhorar desempenho
            if (this.requestNumber % 10 === 0) {
              // Log apenas a cada 10 requisições
              console.log(`[${requestId}] Atualização recebida`);
            }

            if (jsonObj.isComplete && jsonObj.results) {
              results = jsonObj.results;
            }

            // Aplicamos throttling nas atualizações de progresso para reduzir sobrecarga de UI
            const now = Date.now();
            if (
              this.onProgressUpdate &&
              "progress" in jsonObj &&
              (now - lastProgressUpdate > THROTTLE_INTERVAL ||
                jsonObj.isComplete)
            ) {
              this.onProgressUpdate(jsonObj);
              lastProgressUpdate = now;
            }
          }
        }

        const endTime = Date.now();
        console.log(
          `[${requestId}] Stream processado com sucesso em ${
            endTime - startTime
          }ms`
        );

        // Após o processamento, você precisa garantir que o reader e a resposta sejam fechados
        reader.releaseLock();
        response.body.cancel();

        // Se chegamos aqui com sucesso, retornamos os resultados
        return results;
      } catch (error) {
        // Armazena o último erro
        lastError =
          error instanceof Error ? error : new Error("Erro desconhecido");
        const errorMessage = lastError.message;

        // Loga o erro com detalhes específicos
        if (error instanceof DOMException && error.name === "AbortError") {
          console.error(
            `[${requestId}] Tempo limite excedido após ${this.timeout}ms`
          );
        } else {
          console.error(
            `[${requestId}] Erro na tentativa ${
              retryCount + 1
            }: ${errorMessage}`
          );
        }

        // Incrementa contador de tentativas
        retryCount++;

        // Se ainda há tentativas disponíveis, espera antes da próxima
        if (retryCount <= this.maxRetries) {
          const waitTime = this.retryDelay * retryCount; // Aumenta o tempo entre tentativas
          console.log(
            `[${requestId}] Esperando ${waitTime}ms antes da próxima tentativa...`
          );
          await this.delay(waitTime);
        }
      }
    }

    // Se chegamos aqui, todas as tentativas falharam
    console.error(
      `[${requestId}] Todas as ${this.maxRetries + 1} tentativas falharam`
    );
    throw lastError || new Error("Falha após múltiplas tentativas");
  }

  // Método para requisições normais (não streaming)
  private async makeRequest(path: string, token?: string): Promise<any> {
    // Usa o número da requisição que veio do App
    const requestId = this.requestNumber;
    let retryCount = 0;
    let lastError: Error | null = null;

    // Verificar se o servidor está respondendo com preflight OPTIONS
    const preflightSuccess = await this.checkPreflightConnection(path, token);
    
    // Ajustar timeout baseado no sucesso do preflight
    // Se OPTIONS = 200: usa timeout de 120s
    // Se OPTIONS falha ou não existe: usa timeout de 60s
    const dynamicTimeout = preflightSuccess 
      ? this.optionsSuccessTimeout  // 120s quando OPTIONS retorna 200
      : this.optionsFailureTimeout; // 60s quando OPTIONS falha
    
    console.log(
      `[${requestId}] Preflight: ${preflightSuccess ? 'OK (200)' : 'FALHOU'} - Timeout: ${dynamicTimeout}ms`
    );

    while (retryCount <= this.maxRetries) {
      try {
        console.log(
          `[${requestId}] Tentativa ${retryCount + 1}/${
            this.maxRetries + 1
          } para: ${path}`
        );
        const startTime = Date.now();
        const url = `${this.baseUrl}${path}`;

        // Usando fetch com AbortController para controlar timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.warn(
            `[${requestId}] Tempo limite de ${dynamicTimeout}ms atingido, abortando requisição.`
          );
        }, dynamicTimeout);

        // Browser fetch options with better HTTPS support
        const fetchOptions: RequestInit = {
          method: "GET",
          headers: this.getHeaders(token),
          signal: controller.signal,
          // Disable cache for HTTPS requests
          cache: "no-cache",
          // Set mode to cors for proper CORS handling
          mode: "cors",
          // Set credentials to include for CORS requests
          credentials: "include",
        };

        const response = await fetch(url, fetchOptions);

        // Limpa o timeout pois a requisição foi concluída
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Erro na requisição: ${response.status} ${response.statusText}`
          );
        }

        // Processa o resultado
        const result = await response.json();
        const endTime = Date.now();

        console.log(
          `[${requestId}] Resposta recebida com sucesso em ${
            endTime - startTime
          }ms`
        );

        return result;
      } catch (error) {
        // Armazena o último erro
        lastError =
          error instanceof Error ? error : new Error("Erro desconhecido");
        const errorMessage = lastError.message;

        // Log do erro com detalhes específicos
        if (error instanceof DOMException && error.name === "AbortError") {
          console.error(
            `[${requestId}] Tempo limite excedido após ${this.timeout}ms`
          );
        } else {
          console.error(
            `[${requestId}] Erro na tentativa ${
              retryCount + 1
            }: ${errorMessage}`
          );
        }

        // Incrementa contador de tentativas
        retryCount++;

        // Se ainda há tentativas disponíveis, espera antes da próxima
        if (retryCount <= this.maxRetries) {
          const waitTime = this.retryDelay * retryCount; // Aumenta o tempo entre tentativas
          console.log(
            `[${requestId}] Esperando ${waitTime}ms antes da próxima tentativa...`
          );
          await this.delay(waitTime);
        }
      }
    }

    // Se chegamos aqui, todas as tentativas falharam
    console.error(
      `[${requestId}] Todas as ${this.maxRetries + 1} tentativas falharam`
    );
    throw lastError || new Error("Falha após múltiplas tentativas");
  }

  async getPersonByName(name: string, token?: string): Promise<QueryResult[]> {
    // Usando o método de streaming para as buscas por nome
    return await this.makeStreamRequest(
      `/get-person-by-name/${encodeURIComponent(name)}`,
      token
    );
  }

  async getPersonByExactName(
    name: string,
    token?: string
  ): Promise<QueryResult[]> {
    // Usando o método de streaming para as buscas por nome exato
    return await this.makeStreamRequest(
      `/get-person-by-exact-name/${encodeURIComponent(name)}`,
      token
    );
  }

  async getPersonByCPF(cpf: string, token?: string): Promise<QueryResult[]> {
    try {
      const formattedCPF = this.formatCPF(cpf);
      console.log(`Formatando CPF: "${cpf}" -> "${formattedCPF}"`);

      // Garantindo que não há caracteres especiais na URL
      const sanitizedCPF = formattedCPF.trim();
      // CPF continua usando o método normal por enquanto
      const data = await this.makeRequest(
        `/get-person-by-cpf/${sanitizedCPF}`,
        token
      );
      return data.results;
    } catch (error) {
      console.error(`[${this.requestNumber}] Erro ao buscar por CPF:`, error);
      throw error;
    }
  }

  // Método para executar múltiplas requisições em sequência
  async batchQuery(
    queryType: "name" | "exactName" | "cpf" | "cnpj",
    searchTerms: string[],
    requestsCount: number
  ): Promise<QueryResult[]> {
    const results: QueryResult[] = [];
    let completed = 0;
    const total = Math.min(searchTerms.length, requestsCount);

    // Cria uma cópia do array de termos de pesquisa limitada ao número de requisições
    const termsToProcess = searchTerms.slice(0, requestsCount);

    for (let i = 0; i < termsToProcess.length; i++) {
      const term = termsToProcess[i];
      try {
        console.log(`Processando requisição ${i + 1}/${total}: ${term}`);

        let queryResults: QueryResult[] = [];

        // Executa a consulta apropriada com base no tipo
        switch (queryType) {
          case "name":
            queryResults = await this.getPersonByName(term);
            break;
          case "exactName":
            queryResults = await this.getPersonByExactName(term);
            break;
          case "cpf":
            queryResults = await this.getPersonByCPF(term);
            break;
        }

        // Adiciona os resultados ao array de resultados
        results.push(...queryResults);

        // Incrementa o contador de requisições completadas
        completed++;

        // Calcula o progresso
        const progress = (completed / total) * 100;

        // Notifica o progresso do lote
        if (this.onBatchProgressUpdate) {
          this.onBatchProgressUpdate({
            completed,
            total,
            progress,
            currentRequest: i + 1,
            results: [...results], // Cria uma cópia para evitar referências compartilhadas
            isComplete: completed === total,
          });
        }
      } catch (error) {
        console.error(`Erro na requisição ${i + 1} (${term}):`, error);
        // Continua processando mesmo com erro em uma requisição
      }
    }

    // Retorna todos os resultados acumulados
    return results;
  }
}
