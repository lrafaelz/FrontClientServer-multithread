#!/usr/bin/env python3
"""
Script para gerar certificados SSL self-signed para desenvolvimento
"""
import os
import subprocess
import sys

def generate_ssl_certificate():
    """Gera certificado SSL self-signed usando OpenSSL"""
    
    # Configuração do certificado
    cert_config = """
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = BR
ST = Rio Grande do Sul
L = Local
O = Development
OU = UNIPAMPA
CN = localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
IP.1 = 127.0.0.1
"""
    
    # Salvar configuração em arquivo temporário
    config_file = 'ssl_config.conf'
    with open(config_file, 'w') as f:
        f.write(cert_config)
    
    try:
        # Comando para gerar chave privada
        print("Gerando chave privada...")
        subprocess.run([
            'openssl', 'genrsa', '-out', 'server.key', '2048'
        ], check=True, capture_output=True)
        
        # Comando para gerar certificado
        print("Gerando certificado...")
        subprocess.run([
            'openssl', 'req', '-new', '-x509',
            '-key', 'server.key',
            '-out', 'server.crt',
            '-days', '365',
            '-config', config_file,
            '-extensions', 'v3_req'
        ], check=True, capture_output=True)
        
        print("✅ Certificados SSL gerados com sucesso!")
        print("   - server.key (chave privada)")
        print("   - server.crt (certificado)")
        
        # Remover arquivo de configuração temporário
        os.remove(config_file)
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao gerar certificados: {e}")
        return False
    except FileNotFoundError:
        print("❌ OpenSSL não encontrado. Instale o OpenSSL primeiro.")
        print("   - Windows: https://slproweb.com/products/Win32OpenSSL.html")
        print("   - Linux: sudo apt-get install openssl")
        print("   - macOS: brew install openssl")
        return False
    finally:
        # Limpar arquivo de configuração se ainda existir
        if os.path.exists(config_file):
            os.remove(config_file)

def check_existing_certificates():
    """Verifica se já existem certificados"""
    if os.path.exists('server.crt') and os.path.exists('server.key'):
        print("⚠️  Certificados já existem!")
        response = input("Deseja sobrescrever? (s/n): ").lower()
        return response == 's'
    return True

if __name__ == "__main__":
    print("🔐 Gerador de Certificados SSL Self-Signed")
    print("=" * 50)
    
    if check_existing_certificates():
        success = generate_ssl_certificate()
        if success:
            print("\n📝 Próximos passos:")
            print("1. O navegador pode mostrar aviso de segurança")
            print("2. Aceite o certificado como exceção de segurança")
            print("3. As requisições HTTPS devem funcionar normalmente")
        else:
            print("\n❌ Falha ao gerar certificados. Verifique os erros acima.")
            sys.exit(1)
    else:
        print("Operação cancelada.")
