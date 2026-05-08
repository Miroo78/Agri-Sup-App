# AgriSupApp – Dossier de projet

**Application de suivi agricole – MVP fonctionnel**  
**Équipe :** Amir Bouma (chef de projet, full-stack frontend/backend), Rouida (infrastructure et réseau), Inès (modélisation et base de données)  
**Contexte :** Projet d’études Bachelor 2 Sup de Vinci, en réponse à une demande de la Chambre d’Agriculture

---

## 1. Présentation du besoin et du contexte

### 1.1 Compréhension de la problématique
La Chambre d’Agriculture a exprimé le besoin de disposer d’un outil numérique permettant aux exploitants de mieux suivre leurs cultures et de prendre des décisions éclairées. Le cahier des charges (document `CDC_projet_d'études_Bachelor_2_25-26_1.pdf`) détaille les attentes : centraliser des données agricoles (météo, observations, parcelles), appliquer des règles métier simples pour détecter des risques, et fournir des indicateurs visuels.

### 1.2 Identification du besoin client
L’application doit offrir :
- Une visualisation synthétique des données (tableau de bord)
- La gestion des parcelles et de leurs cultures
- La saisie d’observations terrain (température, humidité, état)
- Un système d’alertes basé sur des seuils (mildiou, gel, stress hydrique…)
- Une interface accessible sur tout écran (responsive)

Ces exigences sont directement issues de la section IV du cahier des charges.

---

## 2. Organisation de l’équipe et répartition des tâches

### 2.1 Répartition initiale
- **Amir (chef de projet)** : Développement frontend complet, architecture de l’application, logique métier (moteur d’alertes), intégration des technologies, coordination de l’équipe, résolution des problèmes de communication backend.
- **Rouida** : Infrastructure et réseau, mise en place de la première stack Flask + MySQL, tests de connectivité, documentation réseau, analyse des erreurs de déploiement.
- **Inès** : Modélisation des données (MCD, MLD), création de la base de données, importation des fichiers CSV, documentation de la structure de données.

### 2.2 Planification et méthodologie
- Phase 1 : Analyse du cahier des charges et définition des besoins fonctionnels.
- Phase 2 : Conception de la maquette UI/UX (Amir) et modélisation des données (Inès).
- Phase 3 : Développement parallèle du frontend statique (Amir) et de la première version backend Flask/MySQL (Rouida, Inès).
- Phase 4 : Face aux difficultés de la version Flask, décision de basculer sur une stack alternative Node.js/SQLite (Amir).
- Phase 5 : Intégration finale, tests, correction des bugs, mise en place de l’historique Git propre.

### 2.3 Historique Git et gestion de version
Un dépôt Git a été créé dès le début du projet. Les premiers commits ont été réalisés directement sur `main`. Par la suite, pour refléter le développement progressif, des branches distinctes ont été créées :
- `frontend-static` : interface utilisateur pure (HTML/CSS/JS)
- `data-csv` : intégration des fichiers CSV fournis
- `backend-api` : mise en place du serveur Express et de la base SQLite
- `integration` : connexion frontend/API et corrections finales
- `main` : fusion de la version finale stable

Des difficultés ont été rencontrées lors de la manipulation de Git (fichier `agri.db` verrouillé par le serveur empêchant certains `checkout`, nombre initialement faible de commits). L’historique a été reconstruit de manière cohérente pour livrer un dépôt compréhensible.

---

## 3. Solution proposée et architecture technique

### 3.1 Schéma d’architecture
┌──────────────┐ HTTP/API REST ┌─────────────────┐ SQLite ┌───────────┐
│ Navigateur │ ◄──────────────────────► │ Node.js/Express │ ◄──────────────► │ SQLite │
│ (frontend) │ │ (backend) │ │ (agri.db) │
└──────────────┘ └─────────────────┘ └───────────┘

text

Le serveur Express sert à la fois l’API et les fichiers statiques du frontend. Aucune configuration réseau complexe n’est nécessaire en local.

### 3.2 Stack technique finale et justifications
| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Frontend | HTML5, CSS3, JavaScript vanilla | Gain de légèreté, aucun framework superflu, maîtrise totale du rendu et des interactions, conformité avec le cahier des charges qui préconise HTML/CSS/JS |
| Backend | Node.js + Express | Langage unique (JS) facilitant l’intégration, API REST rapide à mettre en œuvre, compatibilité avec SQLite, déploiement simplifié |
| Base de données | SQLite (via `better-sqlite3`) | Base embarquée sans installation, idéale pour un MVP local, pas de service externe, transition facile vers PostgreSQL si besoin |
| Données | CSV importés via script dédié | Respect du format fourni, import automatisé pour peupler la base |

La première tentative avec Flask + MySQL a été abandonnée suite à des erreurs récurrentes (Failed to fetch, HTTP 500) dont la résolution aurait dépassé les délais. SQLite offrait un MVP immédiatement fonctionnel, priorité du projet.

### 3.3 Cohérence et respect des contraintes
- Le frontend est responsive et utilise exclusivement HTML/CSS/JS.
- Le backend couvre les aspects API et logique métier.
- La base de données est relationnelle (SQL).
- L’environnement est local (Windows), prêt pour une migration cloud ultérieure.

---

## 4. Développement du MVP – Frontend

### 4.1 Conception UI/UX
Amir a réalisé la maquette complète avant tout code, en étudiant les besoins d’un exploitant agricole : lisibilité, simplicité, indicateurs clairs. Le thème graphique utilise des tons verts et bruns, une typographie sobre, et un style de tableau de bord moderne inspiré des outils SaaS. L’approche « desktop first » a été adoptée, avec un responsive soigné grâce aux media queries.

### 4.2 Architecture du frontend
Le frontend fonctionne comme une SPA (Single Page Application) :
- Une seule page HTML, plusieurs sections (dashboard, parcelles, observations, alertes).
- Navigation par affichage/masquage de conteneurs, sans rechargement.
- Modales personnalisées pour les formulaires de création/modification.
- Stockage initial des données via `localStorage` pour la phase de prototypage, puis migration complète vers l’API REST.

### 4.3 Fonctionnalités implémentées
- **Tableau de bord** : cartes statistiques (nombre de parcelles, observations, alertes critiques), moyennes de température et d’humidité, graphique en barres du nombre d’observations par parcelle, liste des dernières observations, affichage des risques détectés.
- **Gestion des parcelles et cultures** : CRUD complet, association d’une culture (Blé, Vigne, Tomate…), cartes colorées selon le niveau de risque.
- **Observations terrain** : formulaire de saisie (date, température, humidité, notes), tableau d’historique triable et filtrable, suppression.
- **Système d’alertes** : moteur de règles métier intégré côté client analysant les observations récentes (mildiou, gel, stress thermique, sécheresse, etc.), affichage des alertes issues de la base de données (`alertes.csv`).

### 4.4 Version démo et tests
Une version entièrement fonctionnelle avec des données fictives a été réalisée avec `localStorage`, permettant de valider l’ergonomie et la robustesse avant l’intégration avec le backend réel. Tous les cas d’usage (création, modification, suppression, alertes) ont été testés.

---

## 5. Développement du MVP – Backend et base de données

### 5.1 Backend (Amir, avec support de Rouida)
Le serveur Express expose des endpoints REST :
- `GET/POST /api/parcelles`, `PUT/DELETE /api/parcelles/:id`
- `GET/POST /api/observations`, `DELETE /api/observations/:id`
- `GET /api/alertes`
- `GET /api/meteo`

Il sert également les fichiers statiques du frontend. Un script `import-csv.js` lit les fichiers CSV du dossier `data/` et les injecte dans SQLite.

### 5.2 Base de données (Inès)
- **MCD/MLD** : réalisés avec Analyse.SI, puis optimisés visuellement pour la documentation.
- **Tables** : `parcelles`, `cultures`, `observations`, `alertes`, `meteo`.
- **Relations** : une parcelle possède une culture, plusieurs observations, plusieurs alertes. Les données météo sont jointes par date pour enrichir les observations.

### 5.3 Problèmes rencontrés et solutions
- **Erreurs « Failed to fetch » et HTTP 500 sur la première version Flask** : après diagnostic, il s’est avéré que la configuration CORS et le déploiement local de MySQL posaient problème. La décision collégiale a été de migrer vers Node.js/SQLite, ce qui a immédiatement résolu les erreurs.
- **Température et humidité non affichées pour certaines observations** : les fichiers CSV d’origine ne contenaient pas ces champs. Une jointure avec la table `meteo` a été ajoutée (`COALESCE`), et pour les nouvelles observations saisies manuellement, les champs sont désormais enregistrés.
- **Fichier `agri.db` verrouillé lors des changements de branche Git** : le serveur Node.js maintenait une connexion active. La solution a été de systématiquement arrêter le serveur avec `Ctrl+C` avant toute manipulation Git.

---

## 6. Organisation et difficultés de l’équipe

- **Répartition du travail** : chaque membre a été autonome sur sa partie, avec des points réguliers pour synchroniser les avancements.
- **Gestion de crise** : le blocage rencontré sur la stack Flask/MySQL a été absorbé par la mise en place rapide d’une solution alternative (Amir), pendant que Rouida et Inès documentaient les problèmes et préparaient les schémas. Aucun retard bloquant n’a été subi.
- **Commits Git** : l’historique a été nettoyé et structuré en branches pour montrer une évolution logique (frontend statique → données → backend → intégration). Les examinateurs peuvent suivre la progression.

---

## 7. Analyse critique et recul

### 7.1 Limites actuelles du MVP
- **Affichage de la température/humidité** : pour les observations sans correspondance météo (postérieures au fichier CSV météo), les valeurs restent à 0°C et 0%. Cela fausse légèrement les moyennes.
- **Absence d’authentification** : l’application est accessible sans restriction sur le réseau local.
- **Pas de carte interactive** : la localisation des parcelles n’est pas visualisable sur une carte.
- **Importation des CSV manuelle** : l’alimentation initiale de la base est réalisée en ligne de commande, pas via l’interface.
- **Tests unitaires inexistants** : faute de temps, aucune couverture de tests automatisés n’a été mise en place.

### 7.2 Améliorations futures
- **Intégration d’une API météo externe** pour obtenir automatiquement température et humidité du jour, supprimant ainsi les valeurs nulles.
- **Système d’authentification** : gestion des utilisateurs avec rôles, sessions, et sécurisation des API.
- **Cartographie** : implémentation de Leaflet pour géolocaliser chaque parcelle.
- **Visualisations avancées** : remplacement des graphiques CSS par Chart.js pour des courbes de tendance.
- **Déploiement cloud** : migration de SQLite vers PostgreSQL et hébergement du serveur sur une VM Azure ou un service serverless.
- **Tests automatisés** : ajout de tests unitaires sur les endpoints API avec Jest ou Mocha.

---

## 8. Comment reprendre le projet

1. Cloner le dépôt : `git clone https://github.com/Miroo78/Agri-Sup-App.git`
2. Suivre le guide `EXECUTER.md` pour l’installation et le lancement.
3. Le code source est découpé en fichiers distincts et commenté. Les schémas de base de données sont disponibles dans le dossier `docs/`.
4. La structure des branches reflète les étapes du projet, facilitant la compréhension de l’évolution.

---

## 9. Bilan et conclusion

Ce projet a permis de mobiliser l’ensemble des compétences acquises durant le Bachelor : développement frontend/backend, modélisation de bases de données, gestion de projet, résolution de problèmes en temps réel, et travail d’équipe.  
La décision pragmatique de changer de stack pour garantir un MVP fonctionnel illustre notre capacité d’adaptation face aux imprévus, qualité essentielle dans un environnement professionnel.  
Le résultat est une application opérationnelle, cohérente avec le cahier des charges, et conçue pour être facilement reprise et étendue.

---

**Projet réalisé dans le cadre du Bachelor 2 Sup de Vinci – Mai 2026**