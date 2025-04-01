const { chromium } = require("playwright");

// Variáveis globais para armazenar as instâncias
let browserInstance = null;
let pageInstance = null;

// Função para iniciar o navegador e fazer login
async function pref(empresaId) {
  try {
    // Se já existe uma instância do navegador, use-a
    if (!browserInstance) {
      browserInstance = await chromium.launch({
        headless: false,
        slowMo: 50,
      });
      
      pageInstance = await browserInstance.newPage();
      await pageInstance.goto("https://www.gp.srv.br/tributario/sinop/portal_login?1");
      await pageInstance.waitForLoadState("networkidle");
      await pageInstance.waitForLoadState("domcontentloaded");
      await pageInstance.fill("#vUSUARIO_LOGIN", empresaId); // Usando o CNPJ como login
      await pageInstance.fill("#vUSUARIO_SENHA", "923m5koq5");
      await pageInstance.click("#BTN_ENTER3");
      await pageInstance.waitForSelector("#TB_TITULO", { state: "visible" });
      console.log("entrei pref");

      const selectElement = await pageInstance.$("#vPAGESIZE");
      await selectElement.selectOption({ label: "120" });
      await pageInstance.waitForSelector(".Form.gx-masked", { state: "visible" });
      await pageInstance.waitForSelector(".Form.gx-masked", { state: "hidden" });
      console.log("Ponto, carreado os 120 arquivos!");
    } else {
      console.log("Usando navegador já aberto");
    }
    
    return { success: true, message: "Login realizado com sucesso" };
  } catch (error) {
    console.error("Ocorreu um erro:", error);
    return { success: false, error: error.message };
  }
}

// Função para executar a busca de documentos para um CNPJ específico
async function buscarDocumentos(cnpj) {
  try {
    if (!browserInstance || !pageInstance) {
      return { success: false, error: "Navegador não iniciado" };
    }

    console.log(`Iniciando busca para o CNPJ: ${cnpj}`);
    
    // Navegar para a página de busca
    await pageInstance.goto("https://www.gp.srv.br/tributario/sinop/nfs_relatorio");
    await pageInstance.waitForLoadState("networkidle");
    
    // Preencher campo de busca com o CNPJ
    await pageInstance.fill("#vCNPJ", cnpj);
    
    // Clicar no botão de pesquisa 
    await pageInstance.click("#BUTTON1");
    
    // Aguardar o carregamento dos resultados
    await pageInstance.waitForSelector(".Form.gx-masked", { state: "hidden" });
    
    console.log(`Busca realizada para CNPJ: ${cnpj}`);
    return { success: true, message: `Busca realizada para CNPJ: ${cnpj}` };
  } catch (error) {
    console.error(`Erro ao buscar documentos para ${cnpj}:`, error);
    return { success: false, error: error.message };
  }
}

// Função para fechar o navegador
async function fecharNavegador() {
  try {
    if (browserInstance) {
      await browserInstance.close();
      browserInstance = null;
      pageInstance = null;
      console.log("Navegador fechado com sucesso");
      return { success: true, message: "Navegador fechado com sucesso" };
    }
    return { success: true, message: "Nenhum navegador aberto para fechar" };
  } catch (error) {
    console.error("Erro ao fechar navegador:", error);
    return { success: false, error: error.message };
  }
}

// Função para verificar se o navegador está aberto
function isNavegadorAberto() {
  return { aberto: browserInstance !== null };
}

module.exports = { 
  pref, 
  buscarDocumentos,
  fecharNavegador,
  isNavegadorAberto
};