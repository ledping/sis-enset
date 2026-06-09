import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckSquare, Download, FileText, GraduationCap, MessageSquareText, UsersRound, Wifi } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import api from '../api';
import Spinner from '../components/Spinner';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/')
      .then((response) => setStats(response.data))
      .catch(() => setError('Impossible de charger les statistiques du tableau de bord.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Chargement du tableau de bord..." />;

  const isAdmin = user?.role === 'ADMIN';
  const canValidate = ['ADMIN', 'CHEF_DEPT'].includes(user?.role);
  const cards = [
    { key: 'total_etudiants', label: 'Etudiants', icon: GraduationCap, color: '#2E75B6', to: isAdmin ? '/utilisateurs' : '/dashboard' },
    { key: 'total_enseignants', label: 'Enseignants', icon: UsersRound, color: '#1E7145', to: isAdmin ? '/utilisateurs' : '/dashboard' },
    { key: 'total_documents', label: 'Documents valides', icon: FileText, color: '#BF5700', to: '/documents' },
    { key: 'total_memoires', label: 'Memoires archives', icon: BookOpen, color: '#6B2D8B', to: '/memoires' },
    { key: 'total_telechargements', label: 'Telechargements', icon: Download, color: '#1F6B75', to: '/documents' },
    { key: 'sessions_actives', label: 'Sessions actives', icon: Wifi, color: '#16A34A', to: canValidate ? '/sessions' : '/dashboard' },
  ];

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Tableau de bord</h2>
          <p>Bienvenue, {user?.first_name || user?.username}. Cliquez sur une carte pour ouvrir le module correspondant.</p>
        </div>
        <Link className="btn btn-outline-primary" to="/messages"><MessageSquareText size={17} /> Messagerie interne</Link>
      </div>

      {error && <div className="alert alert-warning border-0 shadow-sm">{error}</div>}

      {canValidate && (
        <Link to="/validations" className="validation-banner">
          <CheckSquare size={22} />
          <div>
            <strong>{(stats?.documents_en_attente || 0) + (stats?.memoires_en_attente || 0)} elements attendent une validation</strong>
            <span>{stats?.documents_en_attente || 0} documents et {stats?.memoires_en_attente || 0} memoires soumis.</span>
          </div>
        </Link>
      )}

      <div className="row g-3 mb-4">
        {cards.map(({ key, label, icon: Icon, color, to }) => (
          <div key={key} className="col-6 col-lg-4 col-xxl-2">
            <Link to={to} className="stat-card stat-card-link">
              <div className="stat-icon" style={{ background: color }}><Icon size={23} /></div>
              <div className="stat-value" style={{ color }}>{stats?.[key] ?? 0}</div>
              <div className="stat-label">{label}</div>
            </Link>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card data-card h-100">
            <div className="card-header d-flex justify-content-between align-items-center"><span>Documents les plus telecharges</span><Link to="/documents">Voir tout</Link></div>
            <div className="card-body p-0">
              {stats?.top_documents?.length ? (
                <ul className="list-group list-group-flush">
                  {stats.top_documents.map((doc) => (
                    <li key={doc.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <span className="fw-semibold">{doc.titre}</span>
                      <span className="badge text-bg-primary rounded-pill">{doc.nb_telechargements} DL</span>
                    </li>
                  ))}
                </ul>
              ) : <div className="empty-state m-3">Aucune donnee de telechargement pour le moment.</div>}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card data-card h-100">
            <div className="card-header d-flex justify-content-between align-items-center"><span>Memoires les plus consultes</span><Link to="/memoires">Voir tout</Link></div>
            <div className="card-body p-0">
              {stats?.top_memoires?.length ? (
                <ul className="list-group list-group-flush">
                  {stats.top_memoires.map((memoire) => (
                    <li key={memoire.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <span className="fw-semibold">{memoire.titre}</span>
                      <span className="badge text-bg-secondary rounded-pill">{memoire.nb_telechargements} DL</span>
                    </li>
                  ))}
                </ul>
              ) : <div className="empty-state m-3">Aucun memoire telecharge pour le moment.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
