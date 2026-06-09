import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, GraduationCap, XCircle } from 'lucide-react';
import api from '../api';
import Spinner from '../components/Spinner';

export default function Validations() {
  const [documents, setDocuments] = useState([]);
  const [memoires, setMemoires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.get('/documents/', { params: { statut: 'EN_ATTENTE' } }),
      api.get('/memoires/', { params: { statut: 'SOUMIS,PREVALIDE' } }),
    ])
      .then(([docs, mems]) => {
        if (!ignore) {
          setDocuments(docs.data.results || docs.data);
          setMemoires(mems.data.results || mems.data);
        }
      })
      .catch(() => { if (!ignore) setMessage('Impossible de charger les elements a valider.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [reloadKey]);

  const decideDocument = async (id, decision) => {
    await api.post(`/documents/${id}/${decision}/`);
    setMessage(decision === 'valider' ? 'Document valide.' : 'Document rejete.');
    setLoading(true);
    setReloadKey((current) => current + 1);
  };

  const decideMemoire = async (id, decision) => {
    const commentaire = decision === 'rejeter' ? window.prompt('Motif du rejet du memoire :') || '' : '';
    await api.post(`/memoires/${id}/${decision}/`, { commentaire_validation: commentaire });
    setMessage(decision === 'valider' ? 'Memoire archive.' : 'Memoire rejete.');
    setLoading(true);
    setReloadKey((current) => current + 1);
  };

  if (loading) return <Spinner label="Chargement des validations..." />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Validation academique</h2>
          <p>Validation finale des documents sensibles et des mémoires soumis ou prévalidés automatiquement.</p>
        </div>
      </div>

      {message && <div className="alert alert-info border-0 shadow-sm">{message}</div>}

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card data-card h-100">
            <div className="card-header"><FileText size={17} /> Documents en attente</div>
            <div className="card-body">
              {documents.map((doc) => (
                <div key={doc.id} className="approval-item">
                  <div>
                    <strong>{doc.titre}</strong>
                    <span>{doc.type_doc} - {doc.auteur_detail?.nom_complet || doc.auteur_detail?.username || 'Auteur inconnu'}</span>
                    {doc.description && <p>{doc.description}</p>}
                  </div>
                  <div className="approval-actions">
                    <button className="btn btn-sm btn-success" onClick={() => decideDocument(doc.id, 'valider')}><CheckCircle2 size={15} /> Valider</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => decideDocument(doc.id, 'rejeter')}><XCircle size={15} /> Rejeter</button>
                  </div>
                </div>
              ))}
              {documents.length === 0 && <div className="empty-state">Aucun document en attente.</div>}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card data-card h-100">
            <div className="card-header"><GraduationCap size={17} /> Mémoires soumis / prévalidés</div>
            <div className="card-body">
              {memoires.map((memoire) => (
                <div key={memoire.id} className="approval-item">
                  <div>
                    <strong>{memoire.titre}</strong>
                    <span>{memoire.auteur_nom} - {memoire.encadreur} - {memoire.annee_academique}</span>
                    {memoire.statut === 'PREVALIDE' && <span className="badge text-bg-info mt-2">Prévalidé automatiquement</span>}
                    {memoire.commentaire_validation && <span className="text-success">{memoire.commentaire_validation}</span>}
                    <p>{memoire.resume?.slice(0, 170)}{memoire.resume?.length > 170 ? '...' : ''}</p>
                  </div>
                  <div className="approval-actions">
                    <button className="btn btn-sm btn-success" onClick={() => decideMemoire(memoire.id, 'valider')}><CheckCircle2 size={15} /> Archiver</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => decideMemoire(memoire.id, 'rejeter')}><XCircle size={15} /> Rejeter</button>
                  </div>
                </div>
              ))}
              {memoires.length === 0 && <div className="empty-state">Aucun mémoire soumis ou prévalidé.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
