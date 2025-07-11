# Sistema de Consulta de CPF/CNPJ - CapivaraCoorp

Este é um sistema cliente-servidor para consulta de CPFs e CNPJs, desenvolvido como parte do curso de Redes de Computadores. O aplicativo consiste em uma interface web criada com React e TypeScript que se conecta ao [backend Flask](https://github.com/tiagodfer/python-sql-server).

## Funcionalidades

- **Consulta de CPF**:
  - Busca por nome (busca parcial)
  - Busca por nome exato
  - Busca por número do CPF
- **Consulta de CNPJ**:
  - Busca por número do CNPJ
  - Busca de CNPJs associados a um nome e CPF

## Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: CSS modular
- **HTTP Client**: Fetch API nativo com streaming
- **State Management**: React Hooks (useState, useContext)
- **Build Tool**: Vite
- **SSL/HTTPS**: Certificados auto-assinados

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Python 3.x (para geração de certificados)

## Configuração HTTPS

Para executar o projeto em conjunto com o backend Flask, é necessário configurar certificados SSL para requisições HTTPS.

### 1. Geração de Certificados SSL

Dois scripts disponíveis na raiz do projeto:

#### Opção 1: `generate_ssl_cert.py` (Requer OpenSSL)
```bash
python generate_ssl_cert.py
```

#### Opção 2: `generate_ssl_cert_python.py` (Python puro - Recomendado)
```bash
# Instalar dependência primeiro
pip install cryptography

# Gerar certificados
python generate_ssl_cert_python.py
```

Os certificados serão gerados na raiz do projeto:
- `server.crt` - Certificado SSL
- `server.key` - Chave privada

### 2. Aceitar Certificados no Navegador
1. Quando acessar `https://localhost:5000` pela primeira vez
2. O navegador mostrará um aviso de segurança
3. Clique em "Avançado" → "Continuar para localhost (não seguro)"
4. Isso aceita o certificado auto-assinado

## Instalação e Execução

1. Clone o repositório e navegue até a pasta do projeto:
```bash
cd FrontClientServer-multithread
```

2. Instale as dependências:
```bash
npm install
```

3. Gere os certificados SSL (se necessário):
```bash
python generate_ssl_cert_python.py
```

4. Execute o aplicativo em modo de desenvolvimento:
```bash
npm run dev
```

5. Para construir o aplicativo para produção:
```bash
npm run build
```

6. Para visualizar o build de produção:
```bash
npm run preview
```

## Estrutura do Projeto

```
FrontClientServer-multithread/
├── generate_ssl_cert.py            # Gerador de certificados (OpenSSL)
├── generate_ssl_cert_python.py     # Gerador de certificados (Python)
├── server.crt                      # Certificado SSL (gerado)
├── server.key                      # Chave privada (gerado)
├── public/
│   ├── capivaraLogo.ico            # Favicon
│   └── capivaraLogo.png            # Logo da aplicação
├── src/
│   ├── App.tsx                     # Componente principal
│   ├── main.tsx                    # Ponto de entrada React
│   ├── components/
│   │   ├── AppHeader/              # Cabeçalho da aplicação
│   │   └── ProtectedRoute/         # Componente de proteção de rotas
│   ├── contexts/
│   │   └── AuthContext.tsx         # Contexto de autenticação
│   ├── pages/
│   │   ├── LoginPage/              # Página de login
│   │   └── TCPClientPage/          # Página principal de consultas
│   ├── services/
│   │   ├── TCPClient.ts            # Cliente HTTP com suporte a streaming
│   │   └── WorkerManager.ts        # Gerenciador de consultas paralelas
│   ├── types/
│   │   └── index.ts                # Definições de tipos TypeScript
│   └── workers/                    # Pasta para workers (atualmente vazia)
├── package.json                    # Dependências e scripts
├── tsconfig.json                   # Configuração TypeScript
├── vite.config.ts                  # Configuração Vite
└── README.md                       # Este arquivo
```

## Arquitetura do Sistema

### TCPClient
Cliente HTTP otimizado com:
- **Streaming**: Suporte a respostas em tempo real (para consultas por nome)
- **Timeout dinâmico**: Baseado em verificação de preflight
- **Retry automático**: Até 3 tentativas com backoff
- **Validação**: CPF e CNPJ com algoritmos de validação

### Sistema de Autenticação
- **Context API**: Gerenciamento de estado global
- **JWT Tokens**: Autenticação via Bearer tokens
- **Proteção de rotas**: Componentes protegidos
- **Logout automático**: Em caso de token expirado (401)

## Funcionalidades Técnicas

### Consultas Paralelas
O sistema executa até 4 consultas simultâneas através do `WorkerManager`, mantendo a interface responsiva durante operações intensivas.


### Tolerância a Falhas
- **Reconexão automática**: Em caso de falhas de rede
- **Timeout configurável**: Baseado na resposta do servidor
- **Sistema de fila**: Controle inteligente de conexões simultâneas
- **Validação local**: CPF e CNPJ validados antes do envio

## Configuração da Conexão

Os seguintes parâmetros podem ser configurados na interface:
- **Host do servidor**: Endereço IP ou hostname
- **Porta do servidor**: Porta de conexão
- **Protocolo**: HTTPS (recomendado) ou HTTP
- **Tipo de consulta**: Nome parcial, nome exato, CPF ou CNPJ

## Tipos de Consulta Disponíveis

1. **Por Nome (Parcial)**: Busca pessoas com nomes que contenham o termo
2. **Por Nome Exato**: Busca pessoas com nome exatamente igual ao termo
3. **Por CPF**: Busca pessoa específica pelo número do CPF
4. **Por CNPJ**: Busca empresa específica pelo número do CNPJ
5. **CNPJ por Nome e CPF**: Busca CNPJs associados a uma pessoa específica

## Validações Implementadas

- **CPF**: Validação completa com cálculo dos dígitos verificadores
- **CNPJ**: Validação completa com algoritmo oficial
- **Campos obrigatórios**: Verificação de campos necessários
- **Duplicação**: Prevenção de consultas idênticas simultâneas

## Scripts Disponíveis

- `npm run dev` - Executa em modo desenvolvimento
- `npm run build` - Constrói para produção
- `npm run preview` - Visualiza build de produção
- `npm run lint` - Executa linter TypeScript

 