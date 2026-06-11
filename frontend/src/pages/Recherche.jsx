import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Download, Eye, FileText, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';
import Spinner from '../components/Spinner';

export default function Recherche() {
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState([]);
  const [memoires, setMemoires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const params = useMemo(() => (query.trim() ? { search: query.trim() } : {}), [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      Promise.all([
        api.get('/documents/', { params }),
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
  }, [params]);

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
    <div>
      <div className="page-title">
        <div>
          <h2>Moteur de recherche</h2>
          <p>Recherche transversale dans les ressources pédagogiques et les mémoires archivés.</p>
        </div>
      </div>

      <div className="filter-card">
        <div className="input-group input-group-lg">
          <span className="input-group-text bg-white border-end-0"><Search size={20} /></span>
          <input className="form-control border-start-0" placeholder="Saisir un titre, auteur, filière, mot-clé..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {message && <div className="alert alert-info border-0 shadow-sm">{message}</div>}
      {error && <div className="alert alert-warning border-0 shadow-sm">{error}</div>}
      {loading && <Spinner label="Recherche en cours..." />}

      {!loading && (
        <div className="search-results-grid">
          <section className="search-result-panel">
            <div className="search-panel-head"><FileText size={18} /><h3>Documents ({documents.length})</h3></div>
            <div className="search-result-list">
              {documents.map((doc) => (
                <article className="search-result-card" key={`doc-${doc.id}`}>
                  <div className="search-result-icon"><FileText size={21} /></div>
                  <div className="search-result-body">
                    <strong>{doc.titre}</strong>
                    <span>{doc.type_doc} · {doc.departement || 'Département'} · {doc.niveau || 'Niveau non précisé'}</span>
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
                <article className="search-result-card" key={`mem-${memoire.id}`}>
                  <div className="search-result-icon"><BookOpen size={21} /></div>
                  <div className="search-result-body">
                    <strong>{memoire.titre}</strong>
                    <span>{memoire.auteur_nom} · {memoire.filiere} · {memoire.annee_academique}</span>
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
