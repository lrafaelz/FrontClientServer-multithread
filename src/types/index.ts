export interface QueryResult {
  cpf: string;
  nome: string;
  sexo: string;
  nasc: string;
}

export interface CNPJResult {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  endereço: string;
  endereco?: string;
  uf: string;
  telefone: string;
  email: string;
  socios: Socio[];
}

export interface Socio {
  nome_socio: string;
  nome_representante: string;
  cnpj_cpf_socio: string;
}

export interface PersonCNPJResult {
  cnpj: string;
  email: string;
  endereço: string;
  nome_fantasia: string;
  razao_social: string;
  telefone: string;
}

export interface CNPJByCPFResult {
  cpf: string;
  nome: string;
  empresas: CNPJResult[];
}

// Tipos para consultas
export type QueryType = "name" | "exactName" | "cpf" | "cnpj";

// Interface para opções de consulta
export interface QueryOptions {
  host: string;
  port: number;
  searchTerm: string;
  queryType: QueryType;
  queryId: string;
  requestNumber: number;
  token?: string;
  onUnauthorized?: () => void;
}

// Interfaces para estados das consultas
export interface QueryState {
  id: string;
  searchTerm: string;
  queryType: QueryType;
  results: QueryResult[] | null;
  cnpjResults?: CNPJResult[] | null; // Dados específicos de CNPJ
  error: string | null;
  progress: number;
  status: "pending" | "completed" | "error";
  startTime: number;
  requestNumber: number;
  retryCount: number;
  statusMessage: string;
}

export interface CNPJByNameCPFState {
  id: string;
  searchName: string;
  searchCPF: string;
  results: PersonCNPJResult[] | null;
  error: string | null;
  isLoading: boolean;
  status: "pending" | "completed" | "error";
  startTime: number;
}
