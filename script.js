(() => {
    const API_URL = '';

    async function apiFetch(url, options = {}) {
        try {
            const res = await fetch(API_URL + url, {
                headers: { 'Content-Type': 'application/json' },
                ...options
            });
            if (!res.ok) throw new Error(`Erreur ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error('API Error:', err);
            showToast('Erreur connexion serveur', 'error');
            return null;
        }
    }

    // ==================== DATA LOADERS ====================
    const loadParcels = async () => {
        const data = await apiFetch('/api/parcelles');
        if (!data) return [];
        return data.map(p => ({
            id: p.id.toString(),
            name: p.nom || '',
            location: p.localisation || '',
            surface: p.surface_ha || 0,
            culture: p.culture_type || 'Non défini'
        }));
    };

    const saveParcel = async (parcel) => {
        const body = {
            nom: parcel.name,
            localisation: parcel.location,
            surface_ha: parcel.surface,
            culture_type: parcel.culture
        };
        if (parcel.id && !parcel.id.startsWith('temp_')) {
            return await apiFetch('/api/parcelles/' + parcel.id, { method: 'PUT', body: JSON.stringify(body) });
        } else {
            const result = await apiFetch('/api/parcelles', { method: 'POST', body: JSON.stringify(body) });
            if (result && result.id) parcel.id = result.id.toString();
            return result;
        }
    };

    const deleteParcelDB = async (id) => {
        return await apiFetch('/api/parcelles/' + id, { method: 'DELETE' });
    };

    const loadObs = async () => {
        const data = await apiFetch('/api/observations');
        if (!data) return [];
        return data.map(o => ({
            id: o.id.toString(),
            parcelId: o.parcelle_id ? o.parcelle_id.toString() : '',
            date: o.date || '',
            temperature: 0,
            humidity: 0,
            notes: o.commentaire || o.etat || '',
            etat: o.etat || ''
        }));
    };

    const saveObs = async (obs) => {
        const body = {
            date: obs.date,
            etat: obs.notes || obs.etat || 'OK',
            parcelle_id: parseInt(obs.parcelId),
            commentaire: obs.notes || ''
        };
        const result = await apiFetch('/api/observations', { method: 'POST', body: JSON.stringify(body) });
        if (result && result.id) obs.id = result.id.toString();
        return result;
    };

    const deleteObsDB = async (id) => {
        return await apiFetch('/api/observations/' + id, { method: 'DELETE' });
    };

    const loadAlerts = async () => {
        const data = await apiFetch('/api/alertes');
        if (!data) return [];
        return data.map(a => ({
            id: a.id.toString(),
            parcelId: a.parcelle_id ? a.parcelle_id.toString() : '',
            parcelName: a.parcelle_nom || '',
            culture: a.culture_type || '',
            type: a.niveau >= 3 ? 'danger' : a.niveau >= 2 ? 'warning' : 'info',
            title: a.type || 'Alerte',
            description: `${a.type || 'Risque'} - Niveau ${a.niveau || '?'}`,
            rule: 'Base de données',
            date: a.date || '',
            icon: a.niveau >= 3 ? '🔴' : a.niveau >= 2 ? '🟡' : '🔵'
        }));
    };

    // ==================== STATE ====================
    let parcels = [], observations = [], alerts = [];
    let currentPage = 'dashboard', pendingDelete = null;

    function showToast(msg, type = 'success') {
        const icons = { success: '✓', error: '✗', warning: '⚠' };
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<span>${icons[type] || '•'}</span> ${msg}`;
        document.getElementById('toastContainer').appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    // ==================== NAVIGATION ====================
    function navigateTo(page) {
        currentPage = page;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById('page-' + page);
        if (target) target.classList.add('active');
        document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.sidebar-nav button[data-page="${page}"]`);
        if (btn) btn.classList.add('active');
        document.getElementById('pageTitle').textContent = {
            dashboard: 'Tableau de bord', parcelles: 'Parcelles',
            observations: 'Observations', alertes: 'Alertes'
        }[page] || 'AgriSupApp';
        document.getElementById('searchBox').style.display =
            (page === 'parcelles' || page === 'observations') ? 'flex' : 'none';
        refreshAll();
    }

    async function refreshAll() {
        parcels = await loadParcels();
        observations = await loadObs();
        const dbAlerts = await loadAlerts();
        alerts = dbAlerts;
        document.getElementById('parcelCountBadge').textContent = parcels.length;
        const dangerCount = alerts.filter(a => a.type === 'danger').length;
        const badge = document.getElementById('alertCountBadge');
        badge.style.display = dangerCount > 0 ? 'inline' : 'none';
        badge.textContent = dangerCount;
        updateWelcomeBanner();
        if (currentPage === 'dashboard') renderDashboard();
        if (currentPage === 'parcelles') renderParcels();
        if (currentPage === 'observations') renderObservations();
        if (currentPage === 'alertes') renderAlerts();
    }

    function updateWelcomeBanner() {
        const now = new Date(), h = now.getHours();
        document.getElementById('welcomeGreeting').textContent =
            (h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir') + ', bienvenue sur AgriSupApp';
        document.getElementById('welcomeDate').textContent =
            now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('welcomeMiniStats').innerHTML = `
            <div class="welcome-mini-stat"><div class="mini-val">${parcels.length}</div><div class="mini-lbl">Parcelles</div></div>
            <div class="welcome-mini-stat"><div class="mini-val">${observations.length}</div><div class="mini-lbl">Observations</div></div>
            <div class="welcome-mini-stat"><div class="mini-val">${alerts.filter(a=>a.type==='danger').length}</div><div class="mini-lbl">Alertes</div></div>
        `;
    }

    // ==================== RENDER ====================
    function renderDashboard() {
        const dangerCount = alerts.filter(a => a.type === 'danger').length;
        document.getElementById('dashboardStats').innerHTML = `
            <div class="stat-card"><div class="stat-icon emerald">🌍</div><div class="stat-info"><div class="stat-value">${parcels.length}</div><div class="stat-label">Parcelles</div></div></div>
            <div class="stat-card"><div class="stat-icon blue">📝</div><div class="stat-info"><div class="stat-value">${observations.length}</div><div class="stat-label">Observations</div></div></div>
            <div class="stat-card"><div class="stat-icon ${dangerCount>0?'red':'emerald'}">⚠️</div><div class="stat-info"><div class="stat-value">${dangerCount}</div><div class="stat-label">Risques critiques</div></div></div>
            <div class="stat-card"><div class="stat-icon amber">🌡️</div><div class="stat-info"><div class="stat-value">--°C</div><div class="stat-label">Temp. moyenne</div></div></div>
            <div class="stat-card"><div class="stat-icon blue">💧</div><div class="stat-info"><div class="stat-value">--%</div><div class="stat-label">Humidité moyenne</div></div></div>
        `;
        document.getElementById('barChart').innerHTML = parcels.length === 0
            ? '<div class="empty-state"><p>Données chargées depuis la base.</p></div>'
            : parcels.map(p => `<div class="bar-col"><div class="bar-value">${observations.filter(o=>o.parcelId===p.id).length}</div><div class="bar-fill" style="height:${Math.max(6,observations.filter(o=>o.parcelId===p.id).length*20)}px;background:#68a578;"></div><div class="bar-label">${p.name.substring(0,8)}</div></div>`).join('');
        const recent = [...observations].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
        document.getElementById('timelineObs').innerHTML = recent.length
            ? recent.map(o => `<div class="timeline-item"><div class="tl-date">${o.date}</div><strong>${parcels.find(p=>p.id===o.parcelId)?.name||'—'}</strong> · ${o.notes}</div>`).join('')
            : '<div class="empty-state"><p>Observations chargées depuis la base.</p></div>';
        document.getElementById('dashboardRisks').innerHTML = alerts.length
            ? alerts.slice(0, 6).map(a => `<div class="alert-banner ${a.type==='danger'?'danger':a.type==='warning'?'warning':'info'}"><span>${a.icon}</span><div><strong>${a.title}</strong> — ${a.parcelName} (${a.culture})<br><small>${a.description}</small></div></div>`).join('')
            : '<div class="empty-state"><div class="empty-icon">✅</div><p>Aucune alerte.</p></div>';
    }

    function renderParcels(filter = '') {
        const grid = document.getElementById('parcelsGrid'), empty = document.getElementById('parcelsEmpty');
        let filtered = filter ? parcels.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.culture.toLowerCase().includes(filter.toLowerCase()) || p.location.toLowerCase().includes(filter.toLowerCase())) : parcels;
        if (filtered.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); }
        else {
            empty.classList.add('hidden');
            grid.innerHTML = filtered.map(p => {
                const alert = alerts.find(a => a.parcelId === p.id);
                const cls = alert ? (alert.type === 'danger' ? 'risky' : 'warning-card') : '';
                return `<div class="parcel-card ${cls}" onclick="window._viewObs('${p.id}')">
                    ${alert ? `<span class="risk-flag">${alert.icon}</span>` : ''}
                    <div class="parcel-name">${p.name}</div>
                    <span class="parcel-culture">${p.culture}</span>
                    <div class="parcel-details">📍 ${p.location} · 📐 ${p.surface} ha</div>
                    ${alert ? `<span class="risk-ring ${alert.type==='danger'?'critical':'warning-ring'}">${alert.title}</span>` : '<span class="risk-ring clear">✅ Sain</span>'}
                    <div class="parcel-actions" onclick="event.stopPropagation();">
                        <button class="btn btn-sm btn-outline" onclick="window._editParcel('${p.id}')">✏️</button>
                        <button class="btn btn-sm btn-ghost" onclick="window._deleteParcel('${p.id}')" style="color:#dc2626;">🗑️</button>
                        <button class="btn btn-sm btn-accent" onclick="window._addObs('${p.id}')">+ Obs</button>
                    </div></div>`;
            }).join('');
        }
    }

    function renderObservations(filter = '') {
        const tbody = document.getElementById('observationsTableBody'), empty = document.getElementById('obsEmpty');
        let sorted = [...observations].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (filter) { const q = filter.toLowerCase(); sorted = sorted.filter(o => o.notes.toLowerCase().includes(q) || (parcels.find(p=>p.id===o.parcelId)?.name||'').toLowerCase().includes(q)); }
        if (sorted.length === 0) { tbody.innerHTML = ''; empty.classList.remove('hidden'); }
        else {
            empty.classList.add('hidden');
            tbody.innerHTML = sorted.map(o => {
                const p = parcels.find(pp => pp.id === o.parcelId);
                return `<tr><td>${o.date}</td><td><strong>${p?.name||'—'}</strong> <span class="badge badge-info">${p?.culture||''}</span></td><td>--</td><td>--</td><td>${o.notes||'—'}</td><td><button class="btn btn-xs btn-ghost" onclick="window._deleteObs('${o.id}')" style="color:#dc2626;">🗑️</button></td></tr>`;
            }).join('');
        }
    }

    function renderAlerts() {
        const list = document.getElementById('alertsList'), empty = document.getElementById('alertsEmpty');
        if (alerts.length === 0) { list.innerHTML = ''; empty.classList.remove('hidden'); }
        else {
            empty.classList.add('hidden');
            list.innerHTML = alerts.map(a => `<div class="alert-banner ${a.type==='danger'?'danger':a.type==='warning'?'warning':'info'}"><span>${a.icon}</span><div><strong>${a.title}</strong> — ${a.parcelName} (${a.culture})<br><small>${a.description} · ${a.date}</small></div></div>`).join('');
        }
    }

    // ==================== MODALS ====================
    function openModalParcel(id = null) {
        document.getElementById('formParcel').reset(); document.getElementById('parcelId').value = '';
        if (id) { const p = parcels.find(pp => pp.id === id); if (p) { document.getElementById('parcelId').value = p.id; document.getElementById('parcelName').value = p.name; document.getElementById('parcelLocation').value = p.location; document.getElementById('parcelSurface').value = p.surface; document.getElementById('parcelCulture').value = p.culture; } }
        document.getElementById('modalParcel').classList.remove('hidden');
    }
    function closeParcelModal() { document.getElementById('modalParcel').classList.add('hidden'); }

    document.getElementById('formParcel').addEventListener('submit', async e => {
        e.preventDefault();
        const id = document.getElementById('parcelId').value;
        const data = { id: id || 'temp_' + Date.now(), name: document.getElementById('parcelName').value.trim(), location: document.getElementById('parcelLocation').value.trim(), surface: parseFloat(document.getElementById('parcelSurface').value), culture: document.getElementById('parcelCulture').value };
        if (!data.name || !data.location || isNaN(data.surface) || !data.culture) return showToast('Champs requis.', 'error');
        await saveParcel(data); closeParcelModal(); await refreshAll(); showToast('Parcelle enregistrée.');
    });

    function openModalObs(parcelId = null) {
        document.getElementById('formObs').reset(); document.getElementById('obsId').value = ''; document.getElementById('obsDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('obsParcel').innerHTML = '<option value="">-- Sélectionner --</option>' + parcels.map(p => `<option value="${p.id}" ${p.id===parcelId?'selected':''}>${p.name} (${p.culture})</option>`).join('');
        document.getElementById('modalObs').classList.remove('hidden');
    }
    function closeObsModal() { document.getElementById('modalObs').classList.add('hidden'); }

    document.getElementById('formObs').addEventListener('submit', async e => {
        e.preventDefault();
        const parcelId = document.getElementById('obsParcel').value, date = document.getElementById('obsDate').value, notes = document.getElementById('obsNotes').value.trim();
        if (!parcelId || !date) return showToast('Champs obligatoires.', 'error');
        await saveObs({ id: 'temp_' + Date.now(), parcelId, date, notes }); closeObsModal(); await refreshAll(); showToast('Observation enregistrée.');
    });

    function openConfirm(type, id, msg) { pendingDelete = { type, id }; document.getElementById('confirmMsg').textContent = msg; document.getElementById('modalConfirm').classList.remove('hidden'); }
    function closeConfirm() { document.getElementById('modalConfirm').classList.add('hidden'); pendingDelete = null; }

    document.getElementById('confirmDelete').addEventListener('click', async () => {
        if (!pendingDelete) return;
        if (pendingDelete.type === 'parcel') await deleteParcelDB(pendingDelete.id);
        else await deleteObsDB(pendingDelete.id);
        closeConfirm(); await refreshAll(); showToast('Supprimé.');
    });

    window._editParcel = id => openModalParcel(id);
    window._deleteParcel = id => openConfirm('parcel', id, 'Supprimer cette parcelle ?');
    window._addObs = id => openModalObs(id);
    window._deleteObs = id => openConfirm('obs', id, 'Supprimer cette observation ?');
    window._viewObs = id => { navigateTo('observations'); };
    window.closeSidebar = () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('show'); };

    // ==================== EVENT LISTENERS ====================
    document.querySelectorAll('.sidebar-nav button[data-page]').forEach(b => b.addEventListener('click', () => navigateTo(b.dataset.page)));
    document.getElementById('btnAddParcel')?.addEventListener('click', () => openModalParcel());
    document.getElementById('btnAddParcel2')?.addEventListener('click', () => openModalParcel());
    document.getElementById('btnAddParcelEmpty')?.addEventListener('click', () => openModalParcel());
    document.getElementById('btnAddObservation')?.addEventListener('click', () => openModalObs());
    document.getElementById('btnAddObsPage')?.addEventListener('click', () => openModalObs());
    document.getElementById('closeModalParcel')?.addEventListener('click', closeParcelModal);
    document.getElementById('cancelParcel')?.addEventListener('click', closeParcelModal);
    document.getElementById('closeModalObs')?.addEventListener('click', closeObsModal);
    document.getElementById('cancelObs')?.addEventListener('click', closeObsModal);
    document.getElementById('cancelConfirm')?.addEventListener('click', closeConfirm);
    document.getElementById('searchInput')?.addEventListener('input', e => { if (currentPage === 'parcelles') renderParcels(e.target.value); if (currentPage === 'observations') renderObservations(e.target.value); });

    // Init
    (async () => {
        await refreshAll();
        updateWelcomeBanner();
        console.log('✅ AgriSupApp prêt —', parcels.length, 'parcelles,', observations.length, 'observations,', alerts.length, 'alertes');
    })();
})();