interface ProgressConfig {
  queryId: string;
  estimatedTime: number; // tempo estimado em ms
  updateInterval: number; // intervalo de atualização em ms
  requestNumber?: number; // número da requisição para logging
}

const ctx: Worker = self as any;

ctx.onmessage = (event) => {
  const { queryId, estimatedTime, updateInterval, requestNumber } =
    event.data as ProgressConfig;
  const startTime = Date.now();
  let intervalId: number | null = null;

  const updateProgress = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(95, (elapsed / estimatedTime) * 100); // Limita a 95% até o resultado final

    // Calcula o status baseado no progresso
    let status = "Processando...";
    let message = "";

    if (progress < 25) {
      status = "Iniciando consulta";
      message = "Conectando ao servidor";
    } else if (progress < 50) {
      status = "Consultando";
      message = "Processando solicitação";
    } else if (progress < 75) {
      status = "Analisando";
      message = "Formatando resultados";
    } else {
      status = "Finalizando";
      message = "Preparando resposta";
    }

    ctx.postMessage({
      type: "progress",
      data: {
        queryId,
        progress,
        status,
        message,
        requestNumber,
      },
    });

    if (progress >= 95) {
      // Se atingiu 95%, podemos parar o intervalo
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  };

  // Inicia imediatamente uma primeira atualização
  updateProgress();

  // E continua atualizando de acordo com o intervalo
  intervalId = setInterval(updateProgress, updateInterval) as unknown as number;

  // Adiciona um listener para limpar o intervalo se o worker for terminado
  ctx.addEventListener("close", () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  });
};

export {};
