# Sistema de Consulta de CPF

Este é um sistema cliente-servidor para consulta de CPFs, desenvolvido como parte do curso de Redes de Computadores. O sistema consiste em um servidor Flask que fornece uma API REST e um cliente React que consome essa API.

## Funcionalidades

- Consulta de CPF por nome (busca parcial)
- Consulta de CPF por nome exato
- Consulta de CPF por número do CPF
- Interface web responsiva e moderna
- Tratamento de erros e feedback ao usuário

## Tecnologias Utilizadas

### Backend (Servidor)
- Python 3.x
- Flask
- SQLite3
- Flask-CORS

### Frontend (Cliente)
- React
- TypeScript
- Material-UI
- Vite

## Pré-requisitos

### Backend
- Python 3.x
- Flask
- Flask-CORS
- SQLite3

### Frontend
- Node.js
- npm ou yarn

## Instalação e Execução

### Backend

1. Navegue até a pasta do servidor:
```bash
cd sql-client-server
```

2. Instale as dependências:
```bash
pip install flask flask-cors
```

3. Execute o servidor:
```bash
python flask-server.py
```

O servidor estará disponível em `http://localhost:5000`

### Frontend

1. Navegue até a pasta do cliente:
```bash
cd FrontClientServer-multithread
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o cliente:
```bash
npm start
```

O cliente estará disponível em `http://localhost:5173`

## Estrutura do Projeto

```
.
├── sql-client-server/           # Pasta do servidor
│   ├── flask-server.py         # Servidor Flask
│   ├── server.py               # Servidor TCP original
│   ├── queries.py              # Queries SQL
│   └── db/                     # Banco de dados
│       ├── basecpf.db         # Banco de CPFs
│       └── cnpj.db            # Banco de CNPJs
│
└── FrontClientServer-multithread/  # Pasta do cliente
    ├── src/
    │   ├── App.tsx            # Componente principal
    │   └── services/
    │       └── TCPClient.ts   # Cliente HTTP
    ├── package.json
    └── README.md
```

## API Endpoints

O servidor fornece os seguintes endpoints:

- `GET /get-person-by-name/<name>` - Busca por nome (parcial)
- `GET /get-person-by-exact-name/<name>` - Busca por nome exato
- `GET /get-person-by-cpf/<cpf>` - Busca por CPF

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Contato

Para dúvidas ou sugestões, entre em contato através do repositório.

