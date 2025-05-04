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

      // Configurações para HTTPS e CORS
      session.defaultSession.webRequest.onBeforeSendHeaders(
        (details, callback) => {
          details.requestHeaders["Origin"] = "https://192.168.0.102:5000";
          callback({ requestHeaders: details.requestHeaders });
        }
      );

      session.defaultSession.webRequest.onHeadersReceived(
        (details, callback) => {
          if (details.responseHeaders) {
            details.responseHeaders["Access-Control-Allow-Origin"] = ["*"];
            details.responseHeaders["Access-Control-Allow-Methods"] = ["*"];
            details.responseHeaders["Access-Control-Allow-Headers"] = ["*"];
          }
          callback({ responseHeaders: details.responseHeaders || {} });
        }
      );

      // Certificados HTTPS
      app.on(
        "certificate-error",
        (event, webContents, url, error, certificate, callback) => {
          event.preventDefault();
          callback(true);
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
