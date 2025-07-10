#!/usr/bin/env python3
"""
Script alternativo para gerar certificados SSL self-signed usando Python puro
Para casos onde OpenSSL não está disponível
"""
import os
import datetime
from pathlib import Path

def generate_ssl_certificate_python():
    """Gera certificado SSL self-signed usando Python puro"""
    
    try:
        # Importar bibliotecas necessárias
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        import ipaddress
        
        print("Gerando chave privada...")
        
        # Gerar chave privada
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        
        # Dados do certificado
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "BR"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Rio Grande do Sul"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "Local"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Development"),
            x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "UNIPAMPA"),
            x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
        ])
        
        print("Gerando certificado...")
        
        # Criar certificado
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.DNSName("127.0.0.1"),
                x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())
        
        # Salvar chave privada
        with open("server.key", "wb") as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))
        
        # Salvar certificado
        with open("server.crt", "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
        
        print("✅ Certificados SSL gerados com sucesso!")
        print("   - server.key (chave privada)")
        print("   - server.crt (certificado)")
        
        return True
        
    except ImportError:
        print("❌ Biblioteca 'cryptography' não encontrada.")
        print("   Instale com: pip install cryptography")
        return False
    except Exception as e:
        print(f"❌ Erro ao gerar certificados: {e}")
        return False

def check_existing_certificates():
    """Verifica se já existem certificados"""
    if os.path.exists('server.crt') and os.path.exists('server.key'):
        print("⚠️  Certificados já existem!")
        response = input("Deseja sobrescrever? (s/n): ").lower()
        return response == 's'
    return True

if __name__ == "__main__":
    print("🔐 Gerador de Certificados SSL Self-Signed (Python)")
    print("=" * 55)
    
    if check_existing_certificates():
        success = generate_ssl_certificate_python()
        if success:
            print("\n📝 Próximos passos:")
            print("1. O navegador pode mostrar aviso de segurança")
            print("2. Aceite o certificado como exceção de segurança")
            print("3. As requisições HTTPS devem funcionar normalmente")
        else:
            print("\n❌ Falha ao gerar certificados. Verifique os erros acima.")
            print("   Como alternativa, tente usar o script generate_ssl_cert.py")
    else:
        print("Operação cancelada.")
