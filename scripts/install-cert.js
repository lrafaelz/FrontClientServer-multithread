const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Caminho para o certificado
const certPath = path.join(__dirname, '../ssl/cert.pem');
const absoluteCertPath = path.resolve(certPath);

console.log('Procurando certificado em:', absoluteCertPath);

if (!fs.existsSync(certPath)) {
  console.error('Certificado não encontrado em:', absoluteCertPath);
  process.exit(1);
}

console.log('Certificado encontrado!');

// Detectar o sistema operacional
const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

try {
  if (isWin) {
    // Windows - Adiciona o certificado aos certificados confiáveis de usuário
    console.log('Instalando certificado no Windows...');
    try {
      const output = execSync(`certutil -addstore -user "Root" "${absoluteCertPath}"`, { encoding: 'utf8' });
      console.log(output);
      
      if (output.includes('FAILED') || output.includes('ERROR')) {
        throw new Error('Falha na instalação do certificado');
      }
      
      console.log('Certificado instalado com sucesso!');
    } catch (winError) {
      console.error('Erro ao instalar certificado no Windows:', winError.message);
      console.error('Saída do comando:', winError.stdout || 'Sem saída disponível');
      process.exit(1);
    }
  } else if (isMac) {
    // macOS - Adiciona o certificado ao keychain
    console.log('Instalando certificado no macOS...');
    execSync(`security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/login.keychain "${absoluteCertPath}"`);
    console.log('Certificado instalado com sucesso!');
  } else if (isLinux) {
    // Linux - Copia para os certificados confiáveis
    console.log('Instalando certificado no Linux...');
    const destPath = '/usr/local/share/ca-certificates/server-cert.crt';
    execSync(`sudo cp "${absoluteCertPath}" "${destPath}" && sudo update-ca-certificates`);
    console.log('Certificado instalado com sucesso!');
  } else {
    console.error('Sistema operacional não suportado para instalação automática de certificados.');
  }
} catch (error) {
  console.error('Erro ao instalar certificado:', error);
  process.exit(1);
}