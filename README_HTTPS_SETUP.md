# Configuração HTTPS para Flask + Frontend

Para executar o projeto CapivaraCoorp em conjunto ao [backend Flask](https://github.com/tiagodfer/python-sql-server) é necessário seguir alguns passos para geração dos certificados SSL devido requisições HTTPS. Para as requisições são usados certificados auto-assinados no frontend e no backend, basta seguir os passos para começar a utilizar a ferramenta: 

### 1. **Geração de Certificados SSL**

Dois scripts disponíveis:

#### Opção 1: `generate_ssl_cert.py` (Requer OpenSSL)
```bash
python generate_ssl_cert.py
```

#### Opção 2: `generate_ssl_cert_python.py` (Python puro)
```bash
# Instalar dependência primeiro
pip install cryptography

# Gerar certificados
python generate_ssl_cert_python.py
```
<!-- 
### Aceitar Certificados no Navegador (caso erro)
1. Quando acessar `https://localhost:5000` pela primeira vez
2. O navegador mostrará um aviso de segurança
3. Clique em "Avançado" → "Continuar para localhost (não seguro)"
4. Isso aceita o certificado self-signed -->

## Estrutura de Arquivos

```
FrontClientServer-Multithread/
├── generate_ssl_cert.py            # Gerador de certificados (OpenSSL)
├── generate_ssl_cert_python.py     # Gerador de certificados (Python)
├── server.crt                      # Certificado SSL (gerado)
├── server.key                      # Chave privada (gerada)
├── src/                            # Componentes do projeto react (CapivaraCoorp)
```