import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Download, Eye, FileText, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';
import Spinner from '../components/Spinner';

const TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'COURS', label: 'Cours' },
  { value: 'TD', label: 'TD' },
  { value: 'TP', label: 'TP' },
  { value: 'EXAMEN', label: 'Examens' },
  { value: 'CORRIGE', label: 'Corrigés' },
  { value: 'SUPPORT', label: 'Supports' },
];

const FILIERES = [
  { value: '', label: 'Toutes les filières' },
  { value: 'TIC', label: 'TIC' },
  { value: 'II', label: 'II' },
];

const NIVEAUX = [
  { value: '', label: 'Tous les niveaux' },
  { value: '1', label: 'Niveau 1' },
  { value: '2', label: 'Niveau 2' },
  { value: '3', label: 'Niveau 3' },
  { value: '4', label: 'Niveau 4' },
  { value: '5', label: 'Niveau 5' },
];

export default function Recherche() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [niveauFilter, setNiveauFilter] = useState('');
  const [filiereFilter, setFiliereFilter] = useState('');
  const [documents, setDocuments] = useState([]);
  const [memoires, setMemoires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const params = useMemo(() => {
    const next = {};
    if (query.trim()) next.search = query.trim();
    if (niveauFilter) next.niveau = niveauFilter;
    if (filiereFilter) next.filiere = filiereFilter;
    return next;
  }, [query, niveauFilter, filiereFilter]);

  const documentParams = useMemo(() => {
    const next = { ...params };
    if (typeFilter) next.type = typeFilter;
    return next;
  }, [params, typeFilter]);

  const filtersActive = Boolean(query.trim() || typeFilter || niveauFilter || filiereFilter);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      Promise.all([
        api.get('/documents/', { params: documentParams }),
        api.get('/memoires/', { params }),
      ])
        .then(([docsResponse, memoiresResponse]) => {
          setDocuments(docsResponse.data.results || docsResponse.data);
          setMemoires(memoiresResponse.data.results || memoiresResponse.data);
        })
        .catch(() => setError('La recherche n’a pas pu être effectuée. Vérifiez la disponibilité de l’API.'))
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [params, documentParams]);

  const resetFilters = () => {
    setQuery('');
    setTypeFilter('');
    setNiveauFilter('');
    setFiliereFilter('');
  };

  const download = async (url, filename, premiumLabel) => {
    setMessage('');
    try {
      const response = await api.get(url, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      setMessage('Téléchargement lancé.');
    } catch (downloadError) {
      if (downloadError.response?.status === 402) {
        setMessage(downloadError.response.data?.detail || `${premiumLabel} : crédit premium requis. Ouvrez Accès premium pour acheter un pack.`);
      } else {
        setMessage('Téléchargement impossible pour le moment.');
      }
    }
  };

  return (
    <div className="search-page">
      <div className="page-title page-title-responsive">
        <div>
          <h2>Moteur de recherche</h2>
          <p>Recherche transversale dans les ressources pédagogiques et les mémoires archivés.</p>
        </div>
      </div>

      <div className="filter-card search-filter-card">
        <div className="row g-2 align-items-end">
          <div className="col-lg-5 col-md-12">
            <label className="form-label small fw-bold text-muted">Recherche globale</label>
            <div className="input-group input-group-lg search-mobile-input">
              <span className="input-group-text bg-white border-end-0"><Search size={20} /></span>
              <input className="form-control border-start-0" placeholder="Titre, auteur, filière, mot-clé..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-2 col-md-4 col-6">
            <label className="form-label small fw-bold text-muted">Type document</label>
            <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          <div className="col-lg-2 col-md-4 col-6">
            <label className="form-label small fw-bold text-muted">Niveau</label>
            <select className="form-select" value={niveauFilter} onChange={(e) => setNiveauFilter(e.target.value)}>
              {NIVEAUX.map((niveau) => <option key={niveau.value} value={niveau.value}>{niveau.label}</option>)}
            </select>
          </div>
          <div className="col-lg-2 col-md-4 col-8">
            <label className="form-label small fw-bold text-muted">Filière</label>
            <select className="form-select" value={filiereFilter} onChange={(e) => setFiliereFilter(e.target.value)}>
              {FILIERES.map((filiere) => <option key={filiere.value} value={filiere.value}>{filiere.label}</option>)}
            </select>
          </div>
          <div className="col-lg-1 col-md-4 col-4 d-grid">
            <button type="button" className="btn btn-outline-secondary" disabled={!filtersActive} onClick={resetFilters}><X size={16} /></button>
          </div>
        </div>
      </div>

      {message && <div className="alert alert-info border-0 shadow-sm">{message}</div>}
      {error && <div className="alert alert-warning border-0 shadow-sm">{error}</div>}
      {loading && <Spinner label="Recherche en cours..." />}

      {!loading && (
        <div className="search-results-grid search-results-grid-responsive">
          <section className="search-result-panel">
            <div className="search-panel-head"><FileText size={18} /><h3>Documents ({documents.length})</h3></div>
            <div className="search-result-list">
              {documents.map((doc) => (
                <article className="search-result-card search-result-card-responsive" key={`doc-${doc.id}`}>
                  <div className="search-result-icon"><FileText size={21} /></div>
                  <div className="search-result-body">
                    <strong>{doc.titre}</strong>
                    <span>{doc.type_doc} · {doc.filiere || 'Filière non précisée'} · Niveau {doc.niveau || '-'}</span>
                    <p>{doc.description?.slice(0, 140) || 'Document pédagogique validé.'}</p>
                  </div>
                  <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => void download(`/documents/${doc.id}/dl/`, doc.titre, 'Document')}><Download size={14} /> Télécharger</button>
                </article>
              ))}
              {documents.length === 0 && <div className="empty-state m-3">Aucun document trouvé.</div>}
            </div>
          </section>

          <section className="search-result-panel">
            <div className="search-panel-head"><BookOpen size={18} /><h3>Mémoires ({memoires.length})</h3></div>
            <div className="search-result-list">
              {memoires.map((memoire) => (
                <article className="search-result-card search-result-card-responsive" key={`mem-${memoire.id}`}>
                  <div className="search-result-icon"><BookOpen size={21} /></div>
                  <div className="search-result-body">
                    <strong>{memoire.titre}</strong>
                    <span>{memoire.auteur_nom} · {memoire.filiere} · Niveau {memoire.niveau || '-'} · {memoire.annee_academique}</span>
                    <p>{memoire.resume?.slice(0, 150) || 'Mini-article disponible gratuitement.'}</p>
                  </div>
                  <div className="search-result-actions">
                    <Link className="btn btn-sm btn-outline-primary" to={`/memoires/${memoire.id}`}><Eye size={14} /> Article</Link>
                    <button className="btn btn-sm btn-primary" type="button" onClick={() => void download(`/memoires/${memoire.id}/dl/`, `${memoire.titre}.pdf`, 'Mémoire complet')}><Download size={14} /> PDF</button>
                  </div>
                </article>
              ))}
              {memoires.length === 0 && <div className="empty-state m-3">Aucun mémoire trouvé.</div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
