interface ProgressConfig {
  queryId: string;
  estimatedTime: number; // tempo estimado em ms
  updateInterval: number; // intervalo de atualização em ms
}

const ctx: Worker = self as any;

ctx.onmessage = (event) => {
  const { queryId, estimatedTime, updateInterval } =
    event.data as ProgressConfig;
  const startTime = Date.now();

  const updateProgress = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(95, (elapsed / estimatedTime) * 100); // Limita a 95% até o resultado final

    ctx.postMessage({
      type: "progress",
      data: {
        queryId,
        progress,
      },
    });

    if (progress < 95) {
      setTimeout(updateProgress, updateInterval);
    }
  };

  updateProgress();
};

export {};
