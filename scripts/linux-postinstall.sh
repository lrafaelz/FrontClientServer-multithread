#!/bin/bash

# Script de pós-instalação para Linux
# Instala o certificado automaticamente após a instalação

echo "Instalando certificado SSL no Linux..."

# Caminho para o certificado
CERT_PATH="$PWD/resources/ssl/cert.pem"

# Diretório de certificados confiáveis
CERT_DIR="/usr/local/share/ca-certificates"
DEST_PATH="$CERT_DIR/capivara-cert.crt"

# Verificar se o script está sendo executado como root
if [ "$EUID" -ne 0 ]; then
  echo "Este script precisa ser executado como root para instalar o certificado."
  xterm -e "sudo bash -c 'cp \"$CERT_PATH\" \"$DEST_PATH\" && sudo update-ca-certificates && echo \"Certificado instalado com sucesso!\" && read -p \"Pressione Enter para continuar...\"'" || true
  exit 0
fi

# Copiar o certificado e atualizar a lista de certificados confiáveis
mkdir -p "$CERT_DIR"
cp "$CERT_PATH" "$DEST_PATH" 
update-ca-certificates

echo "Certificado instalado com sucesso!"