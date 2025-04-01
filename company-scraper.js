const { chromium } = require("playwright");
const sqlite3 = require('sqlite3').verbose();

// Function to create a SQLite database and table if they don't exist
function initDatabase() {
  return new Promise((resolve, reject) => {
    // Create or open SQLite database
    const db = new sqlite3.Database('./empresas.db', (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Create companies table if it doesn't exist
      db.run(`CREATE TABLE IF NOT EXISTS empresas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cnpj TEXT UNIQUE,
        nome TEXT,
        status TEXT DEFAULT 'ATIVO',
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(db);
      });
    });
  });
}

// Function to save company to database
async function saveCompany(db, cnpj, nome) {
  return new Promise((resolve, reject) => {
    // Remove special characters from CNPJ
    const cnpjClean = cnpj.replace(/[^\d]/g, '');
    
    // Insert or ignore if already exists
    const stmt = db.prepare(`INSERT OR IGNORE INTO empresas (cnpj, nome) VALUES (?, ?)`);
    stmt.run(cnpjClean, nome, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this.changes); // Return number of rows affected
    });
    stmt.finalize();
  });
}

// Main function to scrape company data
async function scrapeCompanies() {
  let db;
  try {
    // Initialize database
    db = await initDatabase();
    console.log("Database initialized");
    
    // Get current browser context instead of launching a new one
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = await browser.contexts();
    const context = contexts[0]; // Use the first browser context
    
    // Get the existing page
    const pages = await context.pages();
    const page = pages[0]; // Use the first page
    
    // Check if we're already on the correct page
    const currentUrl = page.url();
    if (!currentUrl.includes('gp.srv.br/tributario/sinop')) {
      // If not on the correct page, navigate there
      await page.goto("https://www.gp.srv.br/tributario/sinop/portal_login?1");
      await page.waitForLoadState("networkidle");
      await page.waitForLoadState("domcontentloaded");
      await page.fill("#vUSUARIO_LOGIN", "03.300.663/0001-10");
      await page.fill("#vUSUARIO_SENHA", "923m5koq5");
      await page.click("#BTN_ENTER3");
      await page.waitForSelector("#TB_TITULO", { state: "visible" });
      console.log("Logged in successfully");
    }
    
    // Set page size to 120
    const selectElement = await page.$("#vPAGESIZE");
    await selectElement.selectOption({ label: "120" });
    await page.waitForSelector(".Form.gx-masked", { state: "visible" });
    await page.waitForSelector(".Form.gx-masked", { state: "hidden" });
    console.log("Set page size to 120");
    
    let hasMorePages = true;
    let pageCount = 0;
    let totalCompanies = 0;
    
    // Loop through all pages
    while (hasMorePages) {
      pageCount++;
      console.log(`Processing page ${pageCount}...`);
      
      // Wait for the grid to be visible
      await page.waitForSelector('[id^="span_vGRID_CONTRIBUINTE_PESSOA_CPF_CNPJ_MASC_"]', { state: "visible" });
      
      // Check if we have companies on this page
      const firstCompanySelector = await page.$('#span_vGRID_CONTRIBUINTE_PESSOA_CPF_CNPJ_MASC_0001');
      if (!firstCompanySelector) {
        console.log('No more companies found.');
        hasMorePages = false;
        break;
      }
      
      // Collect all companies from current page
      let companiesCount = 0;
      let missingCount = 0;
      
      // Process up to 120 companies per page
      for (let i = 1; i <= 120; i++) {
        // Format the index with leading zeros
        const index = i.toString().padStart(4, '0');
        
        // Check if the element exists
        const cnpjElement = await page.$(`#span_vGRID_CONTRIBUINTE_PESSOA_CPF_CNPJ_MASC_${index}`);
        
        if (!cnpjElement) {
          missingCount++;
          // If we miss 5 consecutive companies, assume we've reached the end
          if (missingCount >= 5) {
            console.log(`Reached end of data after ${companiesCount} companies on page ${pageCount}`);
            break;
          }
          continue;
        }
        
        missingCount = 0; // Reset missing count when we find a valid company
        
        // Get CNPJ and name
        const cnpj = await cnpjElement.textContent();
        
        const nameElement = await page.$(`#vGRID_CONTRIBUINTE_PESSOA_NOME_${index}`);
        if (!nameElement) continue;
        
        const nome = await nameElement.textContent();
        
        // Save to database
        const changed = await saveCompany(db, cnpj, nome);
        if (changed > 0) {
          companiesCount++;
          totalCompanies++;
        }
      }
      
      console.log(`Saved ${companiesCount} companies from page ${pageCount}`);
      
      // If we processed less than 120 companies, we might be on the last page
      if (companiesCount < 120) {
        // Check if there's a next page button and it's not disabled
        const nextButton = await page.$('#vBTN_NEXT_PAGE');
        const isDisabled = nextButton ? await nextButton.evaluate(el => el.disabled) : true;
        
        if (!nextButton || isDisabled) {
          console.log('Reached the last page. No more data available.');
          hasMorePages = false;
          break;
        }
      }
      
      // If we have more pages, click the next page button
      if (hasMorePages) {
        await page.click('#vBTN_NEXT_PAGE');
        await page.waitForSelector(".Form.gx-masked", { state: "visible" });
        await page.waitForSelector(".Form.gx-masked", { state: "hidden" });
        console.log("Navigated to next page");
        
        // Small delay to ensure page is fully loaded
        await page.waitForTimeout(1000);
      }
    }
    
    console.log(`Scraping completed. Total companies saved: ${totalCompanies}`);
    
    // Keep the browser open but close database connection
    if (db) {
      await new Promise(resolve => db.close(resolve));
      console.log("Database connection closed");
    }
    
    return totalCompanies;
    
  } catch (error) {
    console.error("Error during scraping:", error);
    
    // Close database connection on error
    if (db) {
      await new Promise(resolve => db.close(resolve));
      console.log("Database connection closed after error");
    }
    
    throw error;
  }
}

module.exports = { scrapeCompanies };