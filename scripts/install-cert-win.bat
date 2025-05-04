@echo off
echo Instalando certificado SSL...
cd /d "%~dp0..\..\ssl"
certutil -addstore -user "Root" "cert.pem"
echo Certificado instalado com sucesso!
pause