import { TCPClient } from "../services/TCPClient";

const ctx: Worker = self as any;

ctx.onmessage = async (event) => {
  const { host, port, searchTerm, queryType, queryId, requestNumber } =
    event.data;

  try {
    // Usar o requestNumber que vem do componente App
    console.log(
      `[Worker #${requestNumber}] Iniciando consulta de ${queryType}: ${searchTerm}`
    );

    // Criar cliente com conexão HTTPS direta e passar o requestNumber
    const client = new TCPClient(host, parseInt(port), true, requestNumber);

    // Iniciar worker de progresso
    const progressWorker = new Worker(
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

    let response;
    const startTime = Date.now();

    console.log(
      `[Worker #${requestNumber}] Executando consulta para ${searchTerm}`
    );

    // Executar a consulta apropriada
    if (queryType === "name") {
      response = await client.getPersonByName(searchTerm);
    } else if (queryType === "exactName") {
      response = await client.getPersonByExactName(searchTerm);
    } else {
      response = await client.getPersonByCPF(searchTerm);
    }

    console.log(`[Worker #${requestNumber}] Consulta concluída com sucesso`);

    // Encerrar worker de progresso
    progressWorker.terminate();

    // Enviar resultado final
    ctx.postMessage({
      type: "result",
      data: {
        queryId,
        results: response,
        totalTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error(`[Worker] Erro na consulta #${requestNumber}:`, error);
    ctx.postMessage({
      type: "error",
      data: {
        queryId,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
    });
  }
};

export {};
