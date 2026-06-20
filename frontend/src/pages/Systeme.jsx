import { useCallback, useEffect, useState } from 'react';
import { Archive, Database, HardDrive, RefreshCw, Server, ShieldCheck, Wifi } from 'lucide-react';
import api from '../api';
import Spinner from '../components/Spinner';

function formatDate(value) {
  if (!value) return 'Aucune sauvegarde enregistrée';
  return new Intl.DateTimeFormat('fr-CM', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala',
  }).format(new Date(value));
}

export default function Systeme() {
  const [status, setStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const [statusResult, backupsResult] = await Promise.allSettled([
      api.get('/exploitation/system-status/'),
      api.get('/exploitation/sauvegardes/'),
    ]);
    if (statusResult.status === 'fulfilled') setStatus(statusResult.value.data);
    if (backupsResult.status === 'fulfilled') setBackups(backupsResult.value.data.results || backupsResult.value.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const createBackupMarker = async () => {
    try {
      await api.post('/exploitation/sauvegardes/', {
        type_sauvegarde: 'MANUELLE',
        commentaire: 'Point de sauvegarde demandé depuis l’interface SIS ENSET. Exécuter pg_dump et copier le dossier media selon la procédure campus.',
      });
      setMessage('Point de sauvegarde enregistré. Effectuez ensuite la sauvegarde base + médias selon la procédure serveur.');
      await load();
    } catch {
      setMessage('Impossible d’enregistrer le point de sauvegarde.');
    }
  };

  if (loading) return <Spinner label="Analyse de l’état du système..." />;

  const counts = status?.counts || {};
  const storage = status?.storage || {};

  return (
    <div className="system-page v11-page">
      <div className="v11-hero">
        <div>
          <span className="eyebrow">Exploitation</span>
          <h2>État du système SIS ENSET</h2>
          <p>Vue de supervision pour suivre la santé du serveur, les données, le stockage et les opérations de maintenance.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => void load()}><RefreshCw size={17} /> Actualiser</button>
      </div>

      {message && <div className="alert alert-info border-0 shadow-sm">{message}</div>}

      <div className="v11-status-grid">
        <div className="v11-status-card ok"><Server size={22} /><span>Serveur</span><strong>{status?.serveur}</strong></div>
        <div className="v11-status-card ok"><Database size={22} /><span>Base de données</span><strong>{status?.database}</strong></div>
        <div className="v11-status-card"><ShieldCheck size={22} /><span>Fuseau horaire</span><strong>{status?.timezone}</strong></div>
        <div className="v11-status-card"><Wifi size={22} /><span>HTTPS WebRTC</span><strong>{status?.https_recommande ? 'Recommandé' : 'Non requis'}</strong></div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-xl-7">
          <div className="v11-card">
            <h3>Indicateurs d’exploitation</h3>
            <div className="v11-kpi-grid">
              <div><span>Utilisateurs</span><strong>{counts.utilisateurs || 0}</strong></div>
              <div><span>Documents</span><strong>{counts.documents || 0}</strong></div>
              <div><span>Mémoires</span><strong>{counts.memoires || 0}</strong></div>
              <div><span>Messages</span><strong>{counts.messages || 0}</strong></div>
              <div><span>Paiements</span><strong>{counts.paiements || 0}</strong></div>
              <div><span>Tickets ouverts</span><strong>{counts.tickets_ouverts || 0}</strong></div>
            </div>
          </div>
        </div>
        <div className="col-xl-5">
          <div className="v11-card">
            <h3><HardDrive size={18} /> Stockage</h3>
            <div className="v11-storage-bar"><div style={{ width: `${storage.pourcentage_utilise || 0}%` }} /></div>
            <p className="mb-1"><b>{storage.utilise_go || 0} Go</b> utilisés sur {storage.total_go || 0} Go</p>
            <p className="text-muted mb-0">Médias stockés : {storage.media_mo || 0} Mo · Libre : {storage.libre_go || 0} Go</p>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-xl-6">
          <div className="v11-card">
            <h3><Archive size={18} /> Sauvegardes</h3>
            <p>Dernière sauvegarde : <b>{formatDate(status?.last_backup?.created_at)}</b></p>
            <button className="btn btn-outline-primary" type="button" onClick={createBackupMarker}>Enregistrer un point de sauvegarde</button>
            <small className="d-block mt-2 text-muted">Ce bouton journalise l’opération. La sauvegarde physique doit être réalisée avec pg_dump et la copie du dossier media selon la procédure campus.</small>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="v11-card">
            <h3>Historique récent</h3>
            <div className="v11-backup-list">
              {backups.length === 0 && <div className="empty-state compact-empty">Aucune sauvegarde enregistrée.</div>}
              {backups.slice(0, 5).map((backup) => (
                <div key={backup.id}>
                  <strong>{backup.type_sauvegarde}</strong>
                  <span>{formatDate(backup.created_at)} · {backup.lancee_par_nom}</span>
                  {backup.chemin_recommande && <small>{backup.chemin_recommande}</small>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="v11-info-strip mt-4">
        <ShieldCheck size={20} />
        <div>
          <strong>Recommandations d’exploitation</strong>
          <span>{(status?.recommendations || []).join(' · ')}</span>
        </div>
      </div>
    </div>
  );
}
