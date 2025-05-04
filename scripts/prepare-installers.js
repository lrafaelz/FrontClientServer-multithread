const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Função para definir permissões de execução em scripts
function setExecutablePermissions() {
  console.log('Configurando permissões de execução em scripts...');
  
  const scriptsPaths = [
    path.join(__dirname, 'linux-postinstall.sh'),
    path.join(__dirname, 'mac-postinstall.sh'),
    path.join(__dirname, 'install-cert-win.bat')
  ];
  
  try {
    // No Windows não precisamos alterar permissões, mas nos outros sistemas sim
    if (os.platform() !== 'win32') {
      scriptsPaths.forEach(scriptPath => {
        if (fs.existsSync(scriptPath)) {
          console.log(`Definindo permissão de execução para: ${scriptPath}`);
          execSync(`chmod +x "${scriptPath}"`);
        }
      });
    }
    console.log('Permissões configuradas com sucesso!');
  } catch (error) {
    console.error('Erro ao configurar permissões:', error);
  }
}

// Função para copiar arquivos de certificado se necessário
function copyCertificatesIfNeeded() {
  console.log('Verificando certificados SSL...');
  
  const sslDir = path.join(__dirname, '../ssl');
  const certPath = path.join(sslDir, 'cert.pem');
  const keyPath = path.join(sslDir, 'key.pem');
  
  // Verificar se os certificados existem
  if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir, { recursive: true });
    console.log('Diretório SSL criado.');
  }
  
  // Aqui você pode adicionar lógica para gerar certificados se eles não existirem
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.warn('Certificados SSL não encontrados.');
    console.warn('Por favor, crie ou copie os certificados para a pasta ssl/');
  } else {
    console.log('Certificados SSL encontrados!');
  }
}

// Executar funções de preparação
setExecutablePermissions();
copyCertificatesIfNeeded();

console.log('Preparação de instaladores concluída com sucesso!');