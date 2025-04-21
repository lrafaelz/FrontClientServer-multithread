interface ProgressConfig {
  queryId: string;
  estimatedTime: number; // tempo estimado em ms
  updateInterval: number; // intervalo de atualização em ms
}

self.onmessage = async (event: MessageEvent<ProgressConfig>) => {
  const { queryId, estimatedTime, updateInterval } = event.data;
  let currentProgress = 0;
  const startTime = Date.now();

  const updateProgress = () => {
    const elapsedTime = Date.now() - startTime;
    currentProgress = Math.min((elapsedTime / estimatedTime) * 100, 99);

    self.postMessage({
      type: "progress",
      data: {
        queryId,
        progress: Math.round(currentProgress),
        elapsedTime,
      },
    });

    if (currentProgress < 99) {
      setTimeout(updateProgress, updateInterval);
    }
  };

  updateProgress();
};
