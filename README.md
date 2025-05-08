# Sistema de Consulta de CPF - Aplicativo Desktop

Este é um sistema cliente-servidor para consulta de CPFs, desenvolvido como parte do curso de Redes de Computadores. O aplicativo consiste em uma interface desktop criada com Electron, React e TypeScript.

## Funcionalidades

- Consulta de CPF por nome (busca parcial)
- Consulta de CPF por nome exato
- Consulta de CPF por número do CPF
- Requisições em lote através de arquivo ou lista de termos
- Processamento paralelo com Web Workers
- Interface desktop moderna com Material-UI
- Tratamento de erros e reconexões

## Tecnologias Utilizadas

- Electron (aplicativo desktop multiplataforma)
- TypeScript
- React
- Material-UI
- Web Workers (para processamento paralelo)
- Vite (bundler)

## Pré-requisitos

- Node.js 18+
- npm ou yarn

## Instalação e Execução

1. Clone o repositório e navegue até a pasta do projeto:
```bash
cd FrontClientServer-multithread
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o aplicativo em modo de desenvolvimento:
```bash
npm run dev
```

4. Para construir o aplicativo:
```bash
npm run build
```

5. Para empacotar como aplicativo desktop:
```bash
npm run electron:build
```

## Estrutura do Projeto

```
.
├── electron/              # Código principal do Electron
│   └── main.ts           # Ponto de entrada do Electron
├── src/
│   ├── App.tsx           # Componente principal da aplicação
│   ├── main.tsx          # Ponto de entrada React
│   ├── services/
│   │   ├── TCPClient.ts  # Cliente HTTP com suporte a streaming
│   │   └── WorkerManager.ts # Gerenciador de Web Workers
│   └── workers/
│       ├── queryWorker.ts     # Worker para processamento de consultas
│       └── progressWorker.ts  # Worker para atualização de progresso
├── ssl/                  # Certificados SSL para conexões seguras
│   ├── cert.pem
│   └── key.pem
└── scripts/              # Scripts para instalação de certificados e build
```

## Recursos Avançados

### Consultas Paralelas
O sistema utiliza Web Workers para executar consultas em paralelo, permitindo um melhor aproveitamento dos recursos do sistema e mantendo a interface responsiva durante operações intensivas.

### Requisições em Lote
É possível executar múltiplas consultas em lote, através de:
- Lista de termos separados por linha ou vírgula
- Upload de arquivo de texto com termos

### Tolerância a Falhas
- Reconexão automática em caso de falhas de rede
- Timeout configurável para cada requisição
- Sistema de fila para controle de conexões simultâneas

## Configuração da Conexão

Os seguintes parâmetros podem ser configurados na interface do aplicativo:
- Host do servidor
- Porta do servidor
- Tipo de consulta (nome parcial, nome exato, CPF)
- Uso de Web Workers para processamento paralelo

