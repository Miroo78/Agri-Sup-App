const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ==================== PARCELLES ====================

// Lire toutes les parcelles
app.get('/api/parcelles', (req, res) => {
    try {
        const parcelles = db.prepare(`
            SELECT p.id, p.nom, p.localisation, p.surface_ha, c.type as culture_type
            FROM parcelles p
            LEFT JOIN cultures c ON p.id = c.parcelle_id
        `).all();
        res.json(parcelles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ajouter une parcelle
app.post('/api/parcelles', (req, res) => {
    try {
        const { nom, localisation, surface_ha, culture_type } = req.body;
        console.log('📥 POST parcelle reçu:', req.body);

        if (!nom || !localisation || !surface_ha) {
            return res.status(400).json({ error: 'Champs obligatoires manquants: nom, localisation, surface_ha' });
        }

        // Insérer la parcelle
        const result = db.prepare('INSERT INTO parcelles (nom, localisation, surface_ha) VALUES (?, ?, ?)').run(nom, localisation, surface_ha);
        const newId = result.lastInsertRowid;

        // Insérer la culture si fournie
        if (culture_type) {
            db.prepare('INSERT INTO cultures (type, date_semis, parcelle_id) VALUES (?, date("now"), ?)').run(culture_type, newId);
        }

        console.log('✅ Parcelle créée, ID:', newId);
        res.json({ id: newId, message: 'Parcelle créée avec succès' });
    } catch (err) {
        console.error('❌ Erreur POST parcelle:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Modifier une parcelle
app.put('/api/parcelles/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { nom, localisation, surface_ha, culture_type } = req.body;
        console.log('📥 PUT parcelle reçu:', id, req.body);

        db.prepare('UPDATE parcelles SET nom = ?, localisation = ?, surface_ha = ? WHERE id = ?').run(nom, localisation, surface_ha, id);

        if (culture_type) {
            const existing = db.prepare('SELECT id FROM cultures WHERE parcelle_id = ?').get(id);
            if (existing) {
                db.prepare('UPDATE cultures SET type = ? WHERE parcelle_id = ?').run(culture_type, id);
            } else {
                db.prepare('INSERT INTO cultures (type, date_semis, parcelle_id) VALUES (?, date("now"), ?)').run(culture_type, id);
            }
        }

        console.log('✅ Parcelle modifiée');
        res.json({ message: 'Parcelle modifiée avec succès' });
    } catch (err) {
        console.error('❌ Erreur PUT parcelle:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Supprimer une parcelle
app.delete('/api/parcelles/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM cultures WHERE parcelle_id = ?').run(id);
        db.prepare('DELETE FROM observations WHERE parcelle_id = ?').run(id);
        db.prepare('DELETE FROM alertes WHERE parcelle_id = ?').run(id);
        db.prepare('DELETE FROM parcelles WHERE id = ?').run(id);
        console.log('✅ Parcelle supprimée:', id);
        res.json({ message: 'Parcelle supprimée avec succès' });
    } catch (err) {
        console.error('❌ Erreur DELETE parcelle:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ==================== OBSERVATIONS ====================

// Lire toutes les observations
app.get('/api/observations', (req, res) => {
    try {
        const observations = db.prepare(`
            SELECT o.id, o.date, o.etat, o.commentaire, o.parcelle_id,
                   p.nom as parcelle_nom, c.type as culture_type
            FROM observations o
            LEFT JOIN parcelles p ON o.parcelle_id = p.id
            LEFT JOIN cultures c ON p.id = c.parcelle_id
            ORDER BY o.date DESC
        `).all();
        res.json(observations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ajouter une observation
app.post('/api/observations', (req, res) => {
    try {
        const { date, etat, parcelle_id, commentaire } = req.body;
        console.log('📥 POST observation reçu:', req.body);

        if (!date || !parcelle_id) {
            return res.status(400).json({ error: 'Champs obligatoires: date, parcelle_id' });
        }

        // Vérifier que la parcelle existe
        const parcelle = db.prepare('SELECT id FROM parcelles WHERE id = ?').get(parcelle_id);
        if (!parcelle) {
            return res.status(400).json({ error: 'La parcelle spécifiée n\'existe pas' });
        }

        const result = db.prepare('INSERT INTO observations (date, etat, parcelle_id, commentaire) VALUES (?, ?, ?, ?)').run(date, etat || 'OK', parcelle_id, commentaire || '');
        console.log('✅ Observation créée, ID:', result.lastInsertRowid);
        res.json({ id: result.lastInsertRowid, message: 'Observation créée avec succès' });
    } catch (err) {
        console.error('❌ Erreur POST observation:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Supprimer une observation
app.delete('/api/observations/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM observations WHERE id = ?').run(id);
        console.log('✅ Observation supprimée:', id);
        res.json({ message: 'Observation supprimée avec succès' });
    } catch (err) {
        console.error('❌ Erreur DELETE observation:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ==================== ALERTES ====================

app.get('/api/alertes', (req, res) => {
    try {
        const alertes = db.prepare(`
            SELECT a.id, a.date, a.type, a.niveau, a.parcelle_id,
                   p.nom as parcelle_nom, c.type as culture_type
            FROM alertes a
            LEFT JOIN parcelles p ON a.parcelle_id = p.id
            LEFT JOIN cultures c ON p.id = c.parcelle_id
            ORDER BY a.date DESC
        `).all();
        res.json(alertes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== DÉMARRAGE ====================
app.listen(PORT, () => {
    console.log('🚀 AgriSupApp serveur démarré sur http://localhost:' + PORT);
    console.log('📋 Endpoints disponibles:');
    console.log('   GET    /api/parcelles');
    console.log('   POST   /api/parcelles');
    console.log('   PUT    /api/parcelles/:id');
    console.log('   DELETE /api/parcelles/:id');
    console.log('   GET    /api/observations');
    console.log('   POST   /api/observations');
    console.log('   DELETE /api/observations/:id');
    console.log('   GET    /api/alertes');
});