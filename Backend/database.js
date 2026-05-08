const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'agri.db'));

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS parcelles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    localisation TEXT,
    surface_ha REAL
  );

  CREATE TABLE IF NOT EXISTS cultures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    date_semis TEXT,
    parcelle_id INTEGER,
    FOREIGN KEY (parcelle_id) REFERENCES parcelles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS meteo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    temperature REAL,
    humidite INTEGER,
    pluie_mm REAL
  );

  CREATE TABLE IF NOT EXISTS observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    etat TEXT,
    parcelle_id INTEGER,
    commentaire TEXT,
    FOREIGN KEY (parcelle_id) REFERENCES parcelles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS alertes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    type TEXT,
    parcelle_id INTEGER,
    niveau INTEGER,
    FOREIGN KEY (parcelle_id) REFERENCES parcelles(id) ON DELETE CASCADE
  );
`);

module.exports = db;