Claro! Aqui está a tradução completa do seu `README.md` para o **português**:

---

# Ferramenta de Consulta de CPF - Cliente PyQt

Uma aplicação desktop para consultar o banco de dados de CPF usando uma conexão segura TCP/SSL. Esta aplicação cliente oferece uma interface amigável para consultas individuais e em lote.

## Funcionalidades

* **Interface amigável**: Interface limpa construída com PyQt5
* **Várias opções de busca**: Pesquisa por nome, nome exato ou CPF
* **Processamento em lote**: Execute múltiplas consultas simultaneamente
* **Processamento paralelo**: Modos opcionais com multithreading e multiprocessing
* **Progresso em tempo real**: Atualizações ao vivo durante as consultas
* **Comunicação segura**: SSL/TLS para comunicação segura cliente-servidor
* **Tratamento de erros**: Recuperação robusta com lógica de repetição automática

## Arquitetura

A aplicação segue uma arquitetura em camadas:

```
Cliente PyQt
│
├── Interface do Usuário (app.py, main.py)
│   └── Janela principal, campos de entrada, tabelas, barras de progresso
│
├── Lógica de Negócio (services/worker_manager.py)
│   ├── WorkerManager: Gerencia a execução paralela das consultas
│   ├── Worker/ThreadedExecutor: Processa consultas em paralelo
│   └── ResultProcessor: Lida com os resultados e callbacks
│
└── Acesso a Dados (services/tcp_client.py)
    └── TCPClient: Gerencia a comunicação com o servidor
```

## Dependências

* Python 3.6+
* PyQt5
* Requests

## Instalação

1. Clone o repositório
2. Instale os requisitos:

   ```bash
   pip install PyQt5 requests
   ```
3. Certifique-se de que os certificados SSL estejam configurados corretamente no diretório `PyQt/ssl/`

## Uso

Para executar a aplicação:

```bash
python main.py
```

### Configuração da Conexão

1. Insira o nome do host/IP do servidor e a porta
2. Selecione o tipo de consulta (nome, nome exato ou CPF)

### Consultas Individuais

1. Insira o termo de busca no campo de entrada
2. Clique no botão "Buscar"
3. Veja os resultados na tabela abaixo

### Consultas em Lote

1. Marque a opção "Modo múltiplas consultas"
2. Insira o número de requisições a serem executadas em paralelo
3. Insira os termos de busca na área de texto (um por linha) ou carregue de um arquivo
4. Clique em "Executar Consultas em Lote"
5. Acompanhe o status e os resultados do processamento em lote

### Usando Workers

* Ative a opção "Usar Workers" para utilizar multiprocessing nas requisições paralelas
* Desative para usar threading (melhor para responsividade da interface)

## Segurança

A aplicação usa certificados SSL/TLS para comunicação segura com o servidor:

* `ssl/cert.pem`: Certificado público
* `ssl/key.pem`: Chave privada

## Detalhes Técnicos da Implementação

### Cliente TCP

A classe `TCPClient` gerencia toda a comunicação com o servidor:

* Implementa o tratamento de requisições/respostas via HTTPS
* Suporta streaming para consultas demoradas
* Gerencia tentativas automáticas e timeouts
* Realiza tratamento adequado de erros

### Gerenciador de Workers

O `WorkerManager` implementa o processamento paralelo:

* Limita conexões simultâneas para evitar sobrecarga do servidor
* Enfileira requisições excedentes para processamento posterior
* Fornece atualizações de progresso via sinais do PyQt
* Suporta tanto multiprocessing quanto threading

### Janela Principal

A classe `MainWindow` provê a interface do usuário:

* Campos de entrada para configurações de conexão e termos de busca
* Progresso em tempo real durante as consultas
* Exibição tabular dos resultados
* Suporte para modos de operação simples e em lote

## Tratamento de Erros

A aplicação inclui tratamento de erros robusto:

* Timeouts de conexão
* Erros de servidor
* Validação de entradas inválidas
* Degradação suave em caso de falhas

## Desenvolvimento

Para estender a aplicação:

1. Adicione novos tipos de busca em `TCPClient` e na interface
2. Estenda o processamento de resultados em `ResultProcessor`
3. Adicione novos componentes de UI em `MainWindow`
