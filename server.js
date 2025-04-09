const express = require('express');
const net = require('net');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pythonServerHost = '127.0.0.1';
const pythonServerPort = 5050;

app.post('/query', async (req, res) => {
  const { queryType, searchTerm } = req.body;

  const client = new net.Socket();
  
  try {
    const result = await new Promise((resolve, reject) => {
      client.connect(pythonServerPort, pythonServerHost, () => {
        let queryString;
        if (queryType === 'name') {
          queryString = searchTerm + 'nf';
        } else if (queryType === 'exactName') {
          queryString = searchTerm + 'xf';
        } else if (queryType === 'cpf') {
          // Remove todos os caracteres não numéricos
          const cleaned = searchTerm.replace(/\D/g, '');
          if (cleaned.length !== 11) {
            throw new Error('CPF deve conter 11 dígitos');
          }
          queryString = cleaned + 'cf';
        }

        client.write(queryString);
      });

      client.on('data', (data) => {
        try {
          const response = JSON.parse(data.toString());
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid response format'));
        }
        client.destroy();
      });

      client.on('error', (error) => {
        reject(error);
        client.destroy();
      });

      client.on('timeout', () => {
        reject(new Error('Connection timeout'));
        client.destroy();
      });

      client.setTimeout(5000);
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 