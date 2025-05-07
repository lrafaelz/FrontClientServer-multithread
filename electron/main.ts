import { app, BrowserWindow, session } from "electron";
import * as path from "path";

// Configurações para limitar uso de memória
app.commandLine.appendSwitch(
  "js-flags",
  "--expose-gc --max-old-space-size=256"
);

// Mecanismo de instância única - vai impedir múltiplas instâncias do aplicativo
const gotTheLock = app.requestSingleInstanceLock();

// Se não conseguimos o lock, significa que outra instância já está rodando
if (!gotTheLock) {
  console.log("Outra instância do aplicativo já está em execução. Saindo...");
  app.quit();
} else {
  // Este código será executado na instância que obteve o lock
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Se uma segunda instância tentar abrir, focaremos na janela da primeira instância
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Desativar verificações de segurança para desenvolvimento
  app.commandLine.appendSwitch("ignore-certificate-errors");
  app.commandLine.appendSwitch("disable-web-security"); // Desabilita CORS e outras restrições
  app.commandLine.appendSwitch("allow-insecure-localhost"); // Para localhost

  // Referência global para evitar coleta de lixo automática
  let mainWindow: BrowserWindow | null = null;

  function createWindow() {
    // Criar uma nova janela apenas se não existir já uma
    if (mainWindow === null) {
      mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          webSecurity: false, // Desabilita webSecurity para desenvolvimento
        },
      });

      const isDev = !app.isPackaged;

      // Configurações para HTTPS e CORS - usar Origin dinâmico baseado no endereço que o usuário define
      session.defaultSession.webRequest.onBeforeSendHeaders(
        (details, callback) => {
          // Não define um Origin fixo, permite que o Origin seja definido pelo navegador
          // Isso evita problemas quando o usuário muda o endereço do servidor
          if (!details.requestHeaders["Origin"]) {
            // Definir apenas se não existir, para não substituir o que o navegador está enviando
            details.requestHeaders["Origin"] = "*";
          }

          // Adiciona cabeçalhos para evitar cache que pode causar problemas
          details.requestHeaders["Cache-Control"] = "no-cache";
          details.requestHeaders["Pragma"] = "no-cache";

          callback({ requestHeaders: details.requestHeaders });
        }
      );

      session.defaultSession.webRequest.onHeadersReceived(
        (details, callback) => {
          if (!details.responseHeaders) {
            details.responseHeaders = {};
          }

          // Configurar CORS de forma mais permissiva
          details.responseHeaders["Access-Control-Allow-Origin"] = ["*"];
          details.responseHeaders["Access-Control-Allow-Methods"] = [
            "GET",
            "POST",
            "OPTIONS",
            "PUT",
            "DELETE",
          ];
          details.responseHeaders["Access-Control-Allow-Headers"] = [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Origin",
            "Accept",
          ];
          details.responseHeaders["Access-Control-Allow-Credentials"] = [
            "true",
          ];

          callback({ responseHeaders: details.responseHeaders });
        }
      );

      // Certificados HTTPS - configuração mais robusta
      app.on(
        "certificate-error",
        (event, webContents, url, error, certificate, callback) => {
          console.log(`Ignorando erro de certificado para: ${url}`);
          event.preventDefault();
          callback(true); // Aceitar o certificado
        }
      );

      if (isDev) {
        mainWindow.loadURL("http://localhost:3000");
      } else {
        const indexPath = path.join(__dirname, "../dist/index.html");
        mainWindow.loadFile(indexPath).catch((err) => {
          console.error("Error loading file:", err);
        });
      }

      // Quando a janela for fechada, limpar a referência
      mainWindow.on("closed", () => {
        mainWindow = null;
      });

      // Abrir o DevTools automaticamente em desenvolvimento
      if (isDev) {
        mainWindow.webContents.openDevTools();
      }
    }
  }

  app.whenReady().then(createWindow);

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("activate", () => {
    // No macOS é comum recriar uma janela quando o ícone do dock é clicado
    if (mainWindow === null) createWindow();
  });
}
