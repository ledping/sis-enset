import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Download, FileText, Search } from 'lucide-react';
import api from '../api';
import Spinner from '../components/Spinner';

export default function Recherche() {
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState([]);
  const [memoires, setMemoires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const download = async (url, filename) => {
    const response = await api.get(url, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
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

      {error && <div className="alert alert-warning border-0 shadow-sm">{error}</div>}
      {loading && <Spinner label="Recherche en cours..." />}

      {!loading && (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card data-card h-100">
              <div className="card-header d-flex align-items-center gap-2"><FileText size={18} /> Documents ({documents.length})</div>
              <div className="card-body p-0">
                {documents.length ? <ul className="list-group list-group-flush">
                  {documents.map((doc) => <li className="list-group-item" key={`doc-${doc.id}`}>
                    <div className="d-flex justify-content-between gap-3">
                      <div><strong>{doc.titre}</strong><div className="text-muted small">{doc.type_doc} · {doc.departement}</div></div>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => download(`/documents/${doc.id}/dl/`, doc.titre)}><Download size={14} /></button>
                    </div>
                  </li>)}
                </ul> : <div className="empty-state m-3">Aucun document trouvé.</div>}
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card data-card h-100">
              <div className="card-header d-flex align-items-center gap-2"><BookOpen size={18} /> Mémoires ({memoires.length})</div>
              <div className="card-body p-0">
                {memoires.length ? <ul className="list-group list-group-flush">
                  {memoires.map((memoire) => <li className="list-group-item" key={`mem-${memoire.id}`}>
                    <div className="d-flex justify-content-between gap-3">
                      <div><strong>{memoire.titre}</strong><div className="text-muted small">{memoire.auteur_nom} · {memoire.filiere} · {memoire.annee_academique}</div></div>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => download(`/memoires/${memoire.id}/dl/`, `${memoire.titre}.pdf`)}><Download size={14} /></button>
                    </div>
                  </li>)}
                </ul> : <div className="empty-state m-3">Aucun mémoire trouvé.</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
