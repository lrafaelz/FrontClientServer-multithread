export interface QueryResult {
  cpf: string;
  nome: string;
  sexo: string;
  nasc: string;
}

export class TCPClient {
  private baseUrl: string;

  constructor(private host: string, private port: number) {
    this.baseUrl = `http://${host}:${port}`;
  }

  private formatCPF(cpf: string): string {
    // Remove todos os caracteres não numéricos
    const cleaned = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cleaned.length !== 11) {
      throw new Error('CPF deve conter 11 dígitos');
    }
    
    return cleaned;
  }

  async getPersonByName(name: string): Promise<QueryResult[]> {
    const response = await fetch(`${this.baseUrl}/get-person-by-name/${encodeURIComponent(name)}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar por nome');
    }
    const data = await response.json();
    return data.results;
  }

  async getPersonByExactName(name: string): Promise<QueryResult[]> {
    const response = await fetch(`${this.baseUrl}/get-person-by-exact-name/${encodeURIComponent(name)}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar por nome exato');
    }
    const data = await response.json();
    return data.results;
  }

  async getPersonByCPF(cpf: string): Promise<QueryResult[]> {
    const formattedCPF = this.formatCPF(cpf);
    const response = await fetch(`${this.baseUrl}/get-person-by-cpf/${formattedCPF}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar por CPF');
    }
    const data = await response.json();
    return data.results;
  }
} 