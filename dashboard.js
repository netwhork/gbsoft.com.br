import { fazerLogout, verificarAutenticacao } from './auth.js';

// Verifica se o usuário está autenticado ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verifica autenticação e redireciona para login se não estiver autenticado
        const user = await verificarAutenticacao();
        console.log('Usuário autenticado:', user.email);
        
        // Carregar dados e inicializar interface do dashboard
        carregarEmpresas();
        
        // Adiciona evento de logout ao botão (se existir)
        const logoutButton = document.querySelector('#logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', fazerLogout);
        }
    } catch (error) {
        console.error('Erro de autenticação:', error);
        // Não é necessário redirecionar aqui, pois verificarAutenticacao já faz isso
    }
});

// Função para carregar empresas
async function carregarEmpresas() {
    try {
        // Se você estiver usando Electron, mantenha o código original:
        const empresas = await ipcRenderer.invoke('get-empresas');
        const grid = document.getElementById('empresasGrid');
        grid.innerHTML = ''; // Limpa o grid

        empresas.forEach(empresa => {
            const div = document.createElement('div');
            div.className = 'empresa';
            div.innerHTML = `
                <h3>${empresa.nome}</h3>
                <p>${empresa.cnpj}</p>
                <button class="btn-executar" data-cnpj="${empresa.cnpj}">Executar</button>
            `;
            grid.appendChild(div);
        });

        // Implementa a funcionalidade de busca
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('.empresa').forEach(div => {
                const nome = div.querySelector('h3').textContent.toLowerCase();
                const cnpj = div.querySelector('p').textContent.toLowerCase();
                const shouldShow = nome.includes(searchTerm) || cnpj.includes(searchTerm);
                div.style.display = shouldShow ? 'block' : 'none';
            });
        });
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
    }
}

// Adicione esta função no seu script existente
function executarAutomacao(empresaId) {
    // URL do seu servidor backend
    const apiUrl = 'http://localhost:3000/execute-automation';
    
    // Fazer a requisição para o backend
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ empresaId: empresaId })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Automação iniciada:', data);
        // Você pode adicionar uma notificação visual para o usuário aqui
    })
    .catch(error => {
        console.error('Erro ao iniciar automação:', error);
    });
}

// Modifique o evento de autenticação no Firebase para também disparar a automação
document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            // Se não estiver autenticado, redirecionar para o login
            window.location.href = 'index.html';
        } else {
            // Usuário está autenticado - disparar a automação
            // Substitua pelo ID da empresa ou obtenha de algum lugar (Firestore, etc.)
            const empresaId = '03.300.663/0001-10'; // Exemplo do ID usado no seu script
            executarAutomacao(empresaId);
        }
    });
});