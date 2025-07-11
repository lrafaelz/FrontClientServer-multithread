export interface QueryResult {
  cpf: string;
  nome: string;
  sexo: string;
  nasc: string;
}

export interface CNPJResult {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  situacao: string;
  data_situacao: string;
  motivo_situacao?: string;
  cidade?: string;
  uf: string;
  telefone?: string;
  email?: string;
  atividade_principal: string;
  capital_social?: string;
  porte?: string;
  natureza_juridica?: string;
  socios: Socio[];
}

export interface Socio {
  nome_socio: string;
  nome_representante: string;
  cnpj_cpf_socio: string;
}

export interface PersonCNPJResult {
  cnpj: string;
  nome_fantasia: string;
  uf: string;
}

export interface CNPJByCPFResult {
  cpf: string;
  nome: string;
  empresas: CNPJResult[];
}

// Interface para representar as atualizações de progresso do servidor
export interface ProgressUpdate {
  status: string;
  message?: string;
  progress: number;
  isComplete: boolean;
  results?: QueryResult[];
}

// Interface para o progresso de múltiplas requisições
export interface BatchProgressUpdate {
  completed: number;
  total: number;
  progress: number;
  currentRequest: number;
  results: QueryResult[];
  isComplete: boolean;
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
  error: string | null;
  progress: number;
  status: "pending" | "completed" | "error";
  startTime: number;
  requestNumber: number;
  retryCount: number;
  statusMessage: string;
}

export interface BatchQueryState {
  id: string;
  queryType: QueryType;
  searchTerms: string[];
  numberOfRequests: number;
  results: QueryResult[];
  completed: number;
  total: number;
  progress: number;
  status: "pending" | "completed" | "error";
  error: string | null;
  startTime: number;
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
