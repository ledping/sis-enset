import { useEffect, useState } from 'react';
import { Network, PlusCircle, Power } from 'lucide-react';
import api from '../api';
import Spinner from '../components/Spinner';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadSessions = () => {
    setLoading(true);
    api.get('/sessions/')
      .then((response) => setSessions(response.data.results || response.data))
      .catch(() => setMessage('Impossible de charger les sessions reseau.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    api.get('/sessions/')
      .then((response) => { if (!ignore) setSessions(response.data.results || response.data); })
      .catch(() => { if (!ignore) setMessage('Impossible de charger les sessions reseau.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const simulate = async () => {
    await api.post('/sessions/simulate/');
    setMessage('Session reseau simulee creee. Le mode reel sera connecte au MikroTik sur le campus.');
    loadSessions();
  };

  const closeSession = async (id) => {
    await api.post(`/sessions/${id}/close/`);
    loadSessions();
  };

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Sessions réseau</h2>
          <p>Suivi des connexions IP/MAC. Mode simulation disponible hors MikroTik.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => void simulate()}><PlusCircle size={17} /> Simuler une session</button>
      </div>

      {message && <div className="alert alert-info border-0 shadow-sm">{message}</div>}

      <div className="card data-card">
        <div className="card-header"><Network size={17} /> Historique des sessions</div>
        <div className="card-body p-0">
          {loading ? <Spinner label="Chargement des sessions..." /> : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead><tr><th>Utilisateur</th><th>IP</th><th>MAC</th><th>Début</th><th>Durée</th><th>Statut</th><th></th></tr></thead>
                <tbody>
                  {sessions.map((item) => (
                    <tr key={item.id}>
                      <td className="fw-semibold">{item.utilisateur_detail?.nom_complet || item.utilisateur_detail?.username || 'Utilisateur supprime'}</td>
                      <td>{item.ip_address}</td>
                      <td>{item.mac_address || 'Non renseignee'}</td>
                      <td>{new Date(item.debut).toLocaleString()}</td>
                      <td>{item.duree}</td>
                      <td><span className={`badge ${item.statut === 'ACTIVE' ? 'text-bg-success' : 'text-bg-secondary'}`}>{item.statut}</span></td>
                      <td>{item.statut === 'ACTIVE' && <button className="btn btn-sm btn-outline-danger" onClick={() => void closeSession(item.id)}><Power size={14} /> Fermer</button>}</td>
                    </tr>
                  ))}
                  {sessions.length === 0 && <tr><td colSpan="7"><div className="empty-state m-3">Aucune session reseau enregistree.</div></td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
