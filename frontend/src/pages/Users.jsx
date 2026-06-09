import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, ShieldCheck, UploadCloud, UserCog } from 'lucide-react';
import api from '../api';
import Spinner from '../components/Spinner';

const emptyForm = {
  username: '', password: '', first_name: '', last_name: '', email: '',
  role: 'ETUDIANT', departement: 'Genie Informatique', filiere: '', niveau: '', telephone: '', actif: true,
};

const roleLabels = {
  ADMIN: 'Administrateur',
  CHEF_DEPT: 'Chef de departement',
  ENSEIGNANT: 'Enseignant',
  ETUDIANT: 'Etudiant',
};

const policyLabels = {
  publication_auto_cours: 'Publier automatiquement les cours',
  publication_auto_td: 'Publier automatiquement les TD',
  publication_auto_tp: 'Publier automatiquement les TP',
  publication_auto_support: 'Publier automatiquement les supports pédagogiques',
  validation_obligatoire_examens: 'Garder les examens en validation obligatoire',
  validation_obligatoire_corriges: 'Garder les corrigés en validation obligatoire',
  prevalidation_auto_memoires: 'Prévalider automatiquement les mémoires complets',
  auto_activation_etudiants: 'Autoriser l’auto-inscription des étudiants reconnus',
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [policy, setPolicy] = useState(null);
  const [policySaving, setPolicySaving] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [matricules, setMatricules] = useState([]);

  const fetchPolicy = useCallback(async () => {
    const response = await api.get('/auth/validation-settings/');
    setPolicy(response.data);
  }, []);

  const fetchMatricules = useCallback(async () => {
    const response = await api.get('/auth/matricules/');
    setMatricules(response.data.results || response.data);
  }, []);

  useEffect(() => {
    let ignore = false;
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (role) params.role = role;
    api.get('/auth/users/', { params })
      .then((response) => { if (!ignore) setUsers(response.data.results || response.data); })
      .catch(() => { if (!ignore) setMessage('Impossible de charger les utilisateurs.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [search, role, reloadKey]);

  useEffect(() => {
    let mounted = true;
    const timeoutId = window.setTimeout(() => {
      Promise.all([fetchPolicy(), fetchMatricules()]).catch(() => {
        if (mounted) setMessage('Impossible de charger les paramètres semi-automatiques.');
      });
    }, 0);
    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [fetchPolicy, fetchMatricules, reloadKey]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      username: user.username || '', password: '', first_name: user.first_name || '', last_name: user.last_name || '', email: user.email || '',
      role: user.role || 'ETUDIANT', departement: user.departement || 'Genie Informatique', filiere: user.filiere || '', niveau: user.niveau || '', telephone: user.telephone || '', actif: user.actif !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) payload.append(key, value);
    });
    try {
      if (editing) {
        await api.patch(`/auth/users/${editing.id}/`, payload);
        setMessage('Utilisateur mis a jour avec succes.');
      } else {
        await api.post('/auth/users/', payload);
        setMessage('Utilisateur cree avec succes.');
      }
      setShowModal(false);
      setLoading(true);
      setReloadKey((current) => current + 1);
    } catch (error) {
      setMessage(error.response?.data ? JSON.stringify(error.response.data) : 'Operation impossible.');
    }
  };

  const deactivate = async (user) => {
    if (!window.confirm(`Desactiver le compte ${user.username} ?`)) return;
    await api.delete(`/auth/users/${user.id}/`);
    setLoading(true);
    setReloadKey((current) => current + 1);
  };

  const updatePolicy = async (key, value) => {
    if (!policy) return;
    const nextPolicy = { ...policy, [key]: value };
    setPolicy(nextPolicy);
    setPolicySaving(true);
    try {
      await api.patch('/auth/validation-settings/', { [key]: value });
      setMessage('Paramètre de validation mis à jour.');
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Impossible de modifier ce paramètre.');
      await fetchPolicy();
    } finally {
      setPolicySaving(false);
    }
  };

  const importMatricules = async (event) => {
    event.preventDefault();
    if (!importFile) {
      setMessage('Choisis un fichier Excel (.xlsx) ou CSV avant l’import.');
      return;
    }
    const payload = new FormData();
    payload.append('fichier', importFile);
    setImporting(true);
    try {
      const response = await api.post('/auth/matricules/import/', payload);
      setMessage(`Import terminé : ${response.data.created} créé(s), ${response.data.updated} mis à jour, ${response.data.skipped} ignoré(s).`);
      setImportFile(null);
      setReloadKey((current) => current + 1);
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Import impossible. Vérifie les colonnes du fichier Excel ou CSV.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Gestion des utilisateurs</h2>
          <p>Comptes, rôles, auto-inscription contrôlée et workflow semi-automatique.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Nouvel utilisateur</button>
      </div>

      {message && <div className="alert alert-info border-0 shadow-sm">{message}</div>}

      <div className="row g-4 mb-4">
        <div className="col-lg-7">
          <div className="card data-card h-100">
            <div className="card-header d-flex align-items-center gap-2"><ShieldCheck size={17} /> Workflow semi-automatique</div>
            <div className="card-body">
              <p className="text-muted small mb-3">
                Ces paramètres réduisent les validations manuelles : les contenus ordinaires peuvent être publiés automatiquement,
                tandis que les éléments sensibles restent contrôlés.
              </p>
              {!policy ? <Spinner label="Chargement des paramètres..." /> : (
                <div className="semi-auto-grid">
                  {Object.entries(policyLabels).map(([key, label]) => (
                    <label key={key} className="semi-auto-toggle">
                      <span>{label}</span>
                      <input type="checkbox" checked={Boolean(policy[key])} disabled={policySaving} onChange={(e) => updatePolicy(key, e.target.checked)} />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <form className="card data-card h-100" onSubmit={importMatricules}>
            <div className="card-header d-flex align-items-center gap-2"><UploadCloud size={17} /> Import des matricules étudiants</div>
            <div className="card-body">
              <p className="text-muted small">
                Excel (.xlsx) ou CSV accepté avec les colonnes : <strong>matricule, nom, prenom, email, telephone, departement, filiere/option, niveau</strong>.
                Les étudiants reconnus pourront créer eux-mêmes leur compte depuis la page de connexion.
              </p>
              <input type="file" accept=".xlsx,.xlsm,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="form-control" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
              <div className="small text-muted mt-2">
                Modèle conseillé : <a href="/modele_import_etudiants_sis_enset.xlsx" download>télécharger le fichier Excel d’exemple</a>.
              </div>
              <button className="btn btn-outline-primary mt-3" type="submit" disabled={importing}>{importing ? 'Import...' : 'Importer la liste'}</button>
              <div className="mt-3 small text-muted">
                {matricules.length} matricule(s) visible(s) dans la liste blanche récente.
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="filter-card">
        <div className="row g-2">
          <div className="col-md-7">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0"><Search size={17} /></span>
              <input className="form-control border-start-0" placeholder="Rechercher nom, identifiant, email, filiere..." value={search} onChange={(event) => { setLoading(true); setSearch(event.target.value); }} />
            </div>
          </div>
          <div className="col-md-3">
            <select className="form-select" value={role} onChange={(event) => { setLoading(true); setRole(event.target.value); }}>
              <option value="">Tous les roles</option>
              {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? <Spinner label="Chargement des utilisateurs..." /> : (
        <div className="card data-card">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead><tr><th>Utilisateur</th><th>Role</th><th>Filiere / Niveau</th><th>Contact</th><th>Statut</th><th className="text-end">Actions</th></tr></thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td><div className="d-flex align-items-center gap-2"><div className="mini-avatar">{item.photo_url ? <img src={item.photo_url} alt="" /> : <UserCog size={17} />}</div><div><strong>{item.nom_complet || item.username}</strong><div className="text-muted small">@{item.username}</div></div></div></td>
                    <td><span className="badge text-bg-light border">{roleLabels[item.role] || item.role}</span></td>
                    <td>{item.filiere || '-'} {item.niveau ? ` / N${item.niveau}` : ''}</td>
                    <td><div>{item.email || '-'}</div><div className="text-muted small">{item.telephone || ''}</div></td>
                    <td>{item.actif ? <span className="badge text-bg-success">Actif</span> : <span className="badge text-bg-secondary">Inactif</span>}</td>
                    <td className="text-end"><button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(item)}>Modifier</button><button className="btn btn-sm btn-outline-danger" onClick={() => deactivate(item)}>Desactiver</button></td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan="6"><div className="empty-state">Aucun utilisateur trouve.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(15, 23, 42, 0.58)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <form className="modal-content" onSubmit={handleSubmit}>
              <div className="modal-header"><h5 className="modal-title fw-bold">{editing ? 'Modifier un utilisateur' : 'Creer un utilisateur'}</h5><button type="button" className="btn-close" onClick={() => setShowModal(false)} /></div>
              <div className="modal-body row g-3">
                <div className="col-md-4"><label className="form-label fw-semibold">Identifiant *</label><input className="form-control" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></div>
                <div className="col-md-4"><label className="form-label fw-semibold">Mot de passe {editing ? '' : '*'}</label><input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} placeholder={editing ? 'Laisser vide pour conserver' : ''} /></div>
                <div className="col-md-4"><label className="form-label fw-semibold">Role *</label><select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div className="col-md-6"><label className="form-label fw-semibold">Prenom</label><input className="form-control" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                <div className="col-md-6"><label className="form-label fw-semibold">Nom</label><input className="form-control" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
                <div className="col-md-6"><label className="form-label fw-semibold">Email</label><input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="col-md-6"><label className="form-label fw-semibold">Telephone</label><input className="form-control" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
                <div className="col-md-4"><label className="form-label fw-semibold">Departement</label><input className="form-control" value={form.departement} onChange={(e) => setForm({ ...form, departement: e.target.value })} /></div>
                <div className="col-md-4"><label className="form-label fw-semibold">Filiere</label><input className="form-control" value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })} /></div>
                <div className="col-md-4"><label className="form-label fw-semibold">Niveau</label><input type="number" className="form-control" value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button><button type="submit" className="btn btn-primary">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
