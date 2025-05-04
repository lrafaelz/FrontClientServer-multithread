#!/bin/bash

# Script de pós-instalação para macOS
# Instala o certificado automaticamente após a instalação

echo "Instalando certificado SSL no macOS..."

# Caminho para o certificado
CERT_PATH="$PWD/resources/ssl/cert.pem"

# Tentar instalar o certificado
/usr/bin/security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CERT_PATH"

# Verificar se a instalação foi bem-sucedida
if [ $? -eq 0 ]; then
    echo "Certificado instalado com sucesso!"
else
    # Se falhar com permissões, solicitar senha de administrador
    echo "Solicitando permissões de administrador para instalar o certificado..."
    osascript -e "do shell script \"/usr/bin/security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain '$CERT_PATH'\" with administrator privileges"
fi

echo "Instalação do certificado concluída."