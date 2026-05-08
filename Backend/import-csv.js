const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('./database');

function importCSV(filePath, tableName, transformFn = null) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        if (transformFn) {
          results.push(transformFn(row));
        } else {
          results.push(row);
        }
      })
      .on('end', () => {
        // Vider la table avant d'importer
        db.exec(`DELETE FROM ${tableName}`);
        
        const insert = db.prepare(`
          INSERT INTO ${tableName} (${Object.keys(results[0]).join(', ')})
          VALUES (${Object.keys(results[0]).map(() => '?').join(', ')})
        `);
        
        const insertMany = db.transaction((rows) => {
          for (const row of rows) {
            insert.run(...Object.values(row));
          }
        });
        
        insertMany(results);
        console.log(`✅ ${results.length} enregistrements importés dans ${tableName}`);
        resolve();
      })
      .on('error', reject);
  });
}

async function importAll() {
  const dataDir = path.join(__dirname, '..', 'data');
  
  try {
    await importCSV(path.join(dataDir, 'parcelles.csv'), 'parcelles', (row) => ({
      id: parseInt(row.id),
      nom: row.nom,
      localisation: row.localisation,
      surface_ha: parseFloat(row.surface_ha)
    }));
    
    await importCSV(path.join(dataDir, 'cultures.csv'), 'cultures', (row) => ({
      id: parseInt(row.id),
      type: row.type,
      date_semis: row.date_semis,
      parcelle_id: parseInt(row.parcelle_id)
    }));
    
    await importCSV(path.join(dataDir, 'meteo.csv'), 'meteo', (row) => ({
      date: row.date,
      temperature: parseFloat(row.temperature),
      humidite: parseInt(row.humidite),
      pluie_mm: parseFloat(row.pluie_mm)
    }));
    
    await importCSV(path.join(dataDir, 'observations.csv'), 'observations', (row) => ({
      date: row.date,
      etat: row.etat,
      parcelle_id: parseInt(row.parcelle_id),
      commentaire: row.commentaire
    }));
    
    await importCSV(path.join(dataDir, 'alertes.csv'), 'alertes', (row) => ({
      date: row.date,
      type: row.type,
      parcelle_id: parseInt(row.parcelle_id),
      niveau: parseInt(row.niveau)
    }));
    
    console.log('✅ Importation terminée !');
  } catch (err) {
    console.error('❌ Erreur d\'importation:', err);
  }
}

importAll();