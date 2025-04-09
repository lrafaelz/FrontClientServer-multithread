import { useState } from 'react';
import { 
  Container, 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Grid,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Alert
} from '@mui/material';
import { TCPClient, QueryResult } from './services/TCPClient';

function App() {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('5000');
  const [searchTerm, setSearchTerm] = useState('');
  const [queryType, setQueryType] = useState<'name' | 'exactName' | 'cpf'>('name');
  const [results, setResults] = useState<QueryResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!searchTerm) {
      setError('Por favor, insira um termo de busca');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const client = new TCPClient(host, parseInt(port));
      
      let response;
      if (queryType === 'name') {
        response = await client.getPersonByName(searchTerm);
      } else if (queryType === 'exactName') {
        response = await client.getPersonByExactName(searchTerm);
      } else {
        response = await client.getPersonByCPF(searchTerm);
      }

      setResults(response);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro desconhecido ao realizar a busca');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Busca de CPF
        </Typography>

        <Grid container spacing={3}>
          <Box sx={{ width: '100%', display: 'flex', gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Porta"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </Box>
          </Box>

          <Box sx={{ width: '100%' }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Tipo de Busca</FormLabel>
              <RadioGroup
                row
                value={queryType}
                onChange={(e) => setQueryType(e.target.value as 'name' | 'exactName' | 'cpf')}
              >
                <FormControlLabel value="name" control={<Radio />} label="Por Nome" />
                <FormControlLabel value="exactName" control={<Radio />} label="Por Nome Exato" />
                <FormControlLabel value="cpf" control={<Radio />} label="Por CPF" />
              </RadioGroup>
            </FormControl>
          </Box>

          <Box sx={{ width: '100%' }}>
            <TextField
              fullWidth
              label={queryType === 'cpf' ? 'CPF' : 'Nome'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              helperText={queryType === 'cpf' ? 'Digite apenas os 11 dígitos do CPF' : ''}
            />
          </Box>

          <Box sx={{ width: '100%' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleQuery}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </Box>

          {error && (
            <Box sx={{ width: '100%' }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}

          {results && (
            <Box sx={{ width: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Resultados:
              </Typography>
              {results.map((result, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
                  <Typography><strong>CPF:</strong> {result.cpf}</Typography>
                  <Typography><strong>Nome:</strong> {result.nome}</Typography>
                  <Typography><strong>Sexo:</strong> {result.sexo}</Typography>
                  <Typography><strong>Data de Nascimento:</strong> {result.nasc}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Grid>
      </Box>
    </Container>
  );
}

export default App; 