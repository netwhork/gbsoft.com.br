const express = require('express');
const cors = require('cors');
const path = require('path');
const { pref, buscarDocumentos, fecharNavegador, isNavegadorAberto } = require('./test.js');

const app = express();
const PORT = 5500;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Rota para disparar a automação inicial
app.post('/api/execute-automation', async (req, res) => {
  try {
    const { empresaId } = req.body;
    if (!empresaId) {
      return res.status(400).json({ error: 'ID da empresa é obrigatório' });
    }
    
    console.log('Iniciando automação para empresa:', empresaId);
    
    // Executa a função do Playwright e aguarda o resultado
    const result = await pref(empresaId);
    
    if (result.success) {
      res.status(200).json({ message: 'Conectado à Prefeitura de Sinop', status: 'success' });
    } else {
      res.status(500).json({ error: result.error, status: 'error' });
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Nova rota para buscar documentos de um CNPJ específico
app.post('/api/buscar-documentos', async (req, res) => {
  try {
    const { cnpj } = req.body;
    if (!cnpj) {
      return res.status(400).json({ error: 'CNPJ é obrigatório' });
    }
    
    console.log('Buscando documentos para CNPJ:', cnpj);
    
    // Verifica se o navegador está aberto
    const { aberto } = isNavegadorAberto();
    if (!aberto) {
      return res.status(400).json({ 
        error: 'O navegador não está aberto. Inicie a automação primeiro.',
        status: 'error' 
      });
    }
    
    // Executa a busca no navegador já aberto
    const result = await buscarDocumentos(cnpj);
    
    if (result.success) {
      res.status(200).json({ 
        message: `Busca realizada para CNPJ: ${cnpj}`, 
        status: 'success' 
      });
    } else {
      res.status(500).json({ 
        error: result.error, 
        status: 'error' 
      });
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para verificar status do navegador
app.get('/api/browser-status', (req, res) => {
  const { aberto } = isNavegadorAberto();
  res.json({ browserAberto: aberto });
});

// Rota para fechar o navegador
app.post('/api/fechar-navegador', async (req, res) => {
  try {
    const result = await fecharNavegador();
    if (result.success) {
      res.status(200).json({ message: result.message, status: 'success' });
    } else {
      res.status(500).json({ error: result.error, status: 'error' });
    }
  } catch (error) {
    console.error('Erro ao fechar navegador:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para verificar se o servidor está funcionando
app.get('/api/status', (req, res) => {
  res.json({ status: 'online' });
});

// Outras rotas existentes...

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}/dashboard.html`);
});