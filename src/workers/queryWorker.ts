import { TCPClient } from "../services/TCPClient";

const ctx: Worker = self as any;

ctx.onmessage = async (event) => {
  const { host, port, searchTerm, queryType, queryId } = event.data;

  try {
    const client = new TCPClient(host, parseInt(port));

    // Iniciar worker de progresso
    const progressWorker = new Worker(
      new URL("./progressWorker.ts", import.meta.url),
      { type: "module" }
    );

    // Configurar worker de progresso com tempos otimizados
    progressWorker.postMessage({
      queryId,
      estimatedTime: 15000, // Reduzido para 15 segundos
      updateInterval: 50, // Atualiza mais frequentemente
    });

    // Repassar atualizações de progresso
    progressWorker.onmessage = (progressEvent) => {
      ctx.postMessage(progressEvent.data);
    };

    let response;
    const startTime = Date.now();

    if (queryType === "name") {
      response = await client.getPersonByName(searchTerm);
    } else if (queryType === "exactName") {
      response = await client.getPersonByExactName(searchTerm);
    } else {
      response = await client.getPersonByCPF(searchTerm);
    }

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
