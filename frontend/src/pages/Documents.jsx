import { useEffect, useState } from 'react';
import { Download, FilePlus2, Search, Trash2 } from 'lucide-react';
import api from '../api';
import { useAuth } from '../contexts/useAuth';
import Spinner from '../components/Spinner';

const TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'COURS', label: 'Cours' },
  { value: 'TD', label: 'Travaux dirigés' },
  { value: 'TP', label: 'Travaux pratiques' },
  { value: 'EXAMEN', label: 'Examens' },
  { value: 'CORRIGE', label: 'Corrigés' },
  { value: 'SUPPORT', label: 'Supports' },
];

const typeColors = {
  COURS: '#2E75B6', TD: '#1E7145', TP: '#BF5700', EXAMEN: '#6B2D8B', CORRIGE: '#1F6B75', SUPPORT: '#475569', ADMIN: '#991B1B',
};

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ titre: '', type_doc: 'COURS', description: '', fichier: null, filiere: '', niveau: '', annee_academique: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const canUpload = ['ENSEIGNANT', 'ADMIN', 'CHEF_DEPT'].includes(user?.role);
  const canDelete = (doc) => ['ADMIN', 'CHEF_DEPT'].includes(user?.role) || doc.auteur_id === user?.id || doc.auteur_detail?.id === user?.id;

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const params = {};

    if (search.trim()) {
      params.search = search.trim();
    }

    if (typeFilter) {
      params.type = typeFilter;
    }

    api.get('/documents/', { params })
      .then((response) => {
        if (!ignore) {
          setDocs(response.data.results || response.data);
        }
      })
      .catch(() => {
        if (!ignore) {
          setMessage('Impossible de charger les documents. Vérifiez que le backend Django est lancé.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [search, typeFilter, reloadKey]);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!form.titre || !form.type_doc || !form.fichier) {
      setMessage('Titre, type et fichier sont obligatoires.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== '') fd.append(key, value);
    });
    fd.append('departement', user?.departement || 'Génie Informatique');

    try {
      await api.post('/documents/', fd);
      setShowModal(false);
      setForm({ titre: '', type_doc: 'COURS', description: '', fichier: null, filiere: '', niveau: '', annee_academique: '' });
      setMessage('Document déposé avec succès. Il sera visible publiquement après validation.');
      setLoading(true);
      setReloadKey((current) => current + 1);
    } catch (error) {
      setMessage(error.response?.data ? JSON.stringify(error.response.data) : 'Erreur lors du dépôt du document.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (id, titre) => {
    const response = await api.get(`/documents/${id}/dl/`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = titre;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (doc) => {
    const confirmed = window.confirm(`Supprimer définitivement le document « ${doc.titre} » ? Cette action retirera aussi le fichier.`);
    if (!confirmed) return;

    try {
      await api.delete(`/documents/${doc.id}/`);
      setDocs((current) => current.filter((item) => item.id !== doc.id));
      setMessage('Document supprimé définitivement.');
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Suppression impossible. Vérifiez vos droits.');
    }
  };

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Ressources pédagogiques</h2>
          <p>Cours, TD, TP, examens, corrigés et supports validés du département.</p>
        </div>
        {canUpload && <button className="btn btn-primary" onClick={() => setShowModal(true)}><FilePlus2 size={18} /> Déposer un document</button>}
      </div>

      {message && <div className="alert alert-info border-0 shadow-sm">{message}</div>}

      <div className="filter-card">
        <div className="row g-2">
          <div className="col-md-7">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0"><Search size={17} /></span>
              <input
                className="form-control border-start-0"
                placeholder="Rechercher par titre, description, auteur..."
                value={search}
                onChange={(e) => {
                  setLoading(true);
                  setSearch(e.target.value);
                }}
              />
            </div>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => {
                setLoading(true);
                setTypeFilter(e.target.value);
              }}
            >
              {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? <Spinner label="Chargement des documents..." /> : (
        <div className="row g-3">
          {docs.length === 0 && <div className="col-12"><div className="empty-state">Aucun document validé ne correspond aux filtres.</div></div>}
          {docs.map((doc) => (
            <div key={doc.id} className="col-md-6 col-xl-4">
              <div className="card document-card">
                <div className="card-body">
                  <span className="badge-soft" style={{ background: typeColors[doc.type_doc] || '#64748B' }}>{doc.type_doc}</span>
                  <h5 className="fw-bold mt-3 mb-2">{doc.titre}</h5>
                  <p className="meta-line">Auteur : {doc.auteur_detail?.first_name || doc.auteur_detail?.username || 'Non renseigné'} {doc.auteur_detail?.last_name || ''}</p>
                  <p className="meta-line">Département : {doc.departement || 'ENSET Douala'}</p>
                  {doc.description && <p className="text-muted small mt-3 mb-0">{doc.description}</p>}
                </div>
                <div className="card-footer bg-transparent border-0 d-flex align-items-center gap-2 px-3 pb-3">
                  <button className="btn btn-sm btn-outline-primary" onClick={() => handleDownload(doc.id, doc.titre)}><Download size={15} /> Télécharger</button>
                  {canDelete(doc) && (
                    <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDelete(doc)}>
                      <Trash2 size={15} /> Supprimer
                    </button>
                  )}
                  <span className="ms-auto text-muted small">{doc.nb_telechargements} DL</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(15, 23, 42, 0.58)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <form className="modal-content" onSubmit={handleUpload}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Déposer un document pédagogique</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body row g-3">
                <div className="col-md-8"><label className="form-label fw-semibold">Titre *</label><input className="form-control" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} /></div>
                <div className="col-md-4"><label className="form-label fw-semibold">Type *</label><select className="form-select" value={form.type_doc} onChange={(e) => setForm({ ...form, type_doc: e.target.value })}>{TYPES.slice(1).map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
                <div className="col-md-4"><label className="form-label fw-semibold">Filière</label><input className="form-control" value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })} /></div>
                <div className="col-md-4"><label className="form-label fw-semibold">Niveau</label><input type="number" className="form-control" value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} /></div>
                <div className="col-md-4"><label className="form-label fw-semibold">Année académique</label><input className="form-control" placeholder="2025-2026" value={form.annee_academique} onChange={(e) => setForm({ ...form, annee_academique: e.target.value })} /></div>
                <div className="col-12"><label className="form-label fw-semibold">Description</label><textarea className="form-control" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="col-12"><label className="form-label fw-semibold">Fichier *</label><input type="file" className="form-control" onChange={(e) => setForm({ ...form, fichier: e.target.files?.[0] || null })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Envoi...' : 'Déposer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
