const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, 'empresas.db'));

function clearDatabase() {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM empresas', (err) => {
            if (err) {
                console.error('Error clearing database:', err);
                reject(err);
            } else {
                console.log('Database cleared successfully');
                // Reset the auto-increment counter
                db.run('DELETE FROM sqlite_sequence WHERE name="empresas"', (err) => {
                    if (err) {
                        console.error('Error resetting auto-increment:', err);
                        reject(err);
                    } else {
                        console.log('Auto-increment reset successfully');
                        resolve();
                    }
                });
            }
        });
    });
}

// Execute the clear operation
clearDatabase()
    .then(() => {
        console.log('Database cleanup completed');
        db.close();
    })
    .catch(error => {
        console.error('Failed to clear database:', error);
        db.close();
    });