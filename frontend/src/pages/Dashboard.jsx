import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckSquare,
  Clock3,
  Download,
  FileText,
  GraduationCap,
  MessageSquareText,
  ShieldCheck,
  UsersRound,
  Wifi,
} from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import api from '../api';
import Spinner from '../components/Spinner';

function percent(value, total) {
  if (!total) return 0;
  return Math.max(4, Math.round((Number(value || 0) / total) * 100));
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DistributionBars({ title, items = [], emptyLabel }) {
  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.value || 0), 0), [items]);

  return (
    <div className="card data-card h-100 dashboard-panel">
      <div className="card-header d-flex align-items-center gap-2">
        <BarChart3 size={17} />
        <span>{title}</span>
      </div>
      <div className="card-body">
        {items.length ? items.map((item) => (
          <div className="dash-bar-row" key={`${item.key || item.label}`}>
            <div className="d-flex justify-content-between gap-3">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="dash-progress" aria-label={`${item.label}: ${item.value}`}>
              <div style={{ width: `${percent(item.value, total)}%` }} />
            </div>
          </div>
        )) : <div className="empty-state compact-empty">{emptyLabel}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    api.get('/dashboard/')
      .then((response) => {
        if (!ignore) setStats(response.data);
      })
      .catch(() => {
        if (!ignore) setError('Impossible de charger les statistiques du tableau de bord.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) return <Spinner label="Chargement du tableau de bord..." />;

  const isAdmin = user?.role === 'ADMIN';
  const canValidate = ['ADMIN', 'CHEF_DEPT'].includes(user?.role);
  const waitingCount = (stats?.documents_en_attente || 0) + (stats?.memoires_en_attente || 0);
  const cards = [
    { key: 'total_etudiants', label: 'Etudiants', icon: GraduationCap, color: '#2E75B6', to: isAdmin ? '/utilisateurs' : '/dashboard' },
    { key: 'total_enseignants', label: 'Enseignants', icon: UsersRound, color: '#1E7145', to: isAdmin ? '/utilisateurs' : '/dashboard' },
    { key: 'total_documents', label: 'Documents valides', icon: FileText, color: '#BF5700', to: '/documents' },
    { key: 'total_memoires', label: 'Memoires archives', icon: BookOpen, color: '#6B2D8B', to: '/memoires' },
    { key: 'total_telechargements', label: 'Telechargements', icon: Download, color: '#1F6B75', to: '/documents' },
    { key: 'sessions_actives', label: 'Sessions actives', icon: Wifi, color: '#16A34A', to: canValidate ? '/sessions' : '/dashboard' },
  ];

  return (
    <div className="dashboard-v8">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">SIS ENSET Douala</span>
          <h2>Tableau de bord intelligent</h2>
          <p>
            Bonjour {user?.first_name || user?.username}. Supervisez les ressources, les validations,
            les utilisateurs et l'activite de la plateforme depuis une seule interface.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <Link className="btn btn-light" to="/messages"><MessageSquareText size={17} /> Messagerie</Link>
          {canValidate && <Link className="btn btn-warning" to="/validations"><CheckSquare size={17} /> Validations</Link>}
        </div>
      </div>

      {error && <div className="alert alert-warning border-0 shadow-sm">{error}</div>}

      {canValidate && (
        <Link to="/validations" className="validation-banner validation-banner-v8">
          <ShieldCheck size={24} />
          <div>
            <strong>{waitingCount} elements necessitent une attention</strong>
            <span>{stats?.documents_en_attente || 0} documents, {stats?.memoires_en_attente || 0} memoires soumis/prevalides.</span>
          </div>
        </Link>
      )}

      <div className="row g-3 mb-4">
        {cards.map(({ key, label, icon: Icon, color, to }) => (
          <div key={key} className="col-6 col-lg-4 col-xxl-2">
            <Link to={to} className="stat-card stat-card-link stat-card-v8">
              <div className="stat-icon" style={{ background: color }}><Icon size={23} /></div>
              <div className="stat-value" style={{ color }}>{stats?.[key] ?? 0}</div>
              <div className="stat-label">{label}</div>
            </Link>
          </div>
        ))}
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-4 col-lg-6">
          <DistributionBars
            title="Utilisateurs par role"
            items={stats?.role_distribution || []}
            emptyLabel="Aucun utilisateur enregistre."
          />
        </div>
        <div className="col-xl-4 col-lg-6">
          <DistributionBars
            title="Documents par type"
            items={stats?.documents_by_type || []}
            emptyLabel="Aucun document depose."
          />
        </div>
        <div className="col-xl-4 col-lg-12">
          <DistributionBars
            title="Memoires par niveau"
            items={stats?.memoires_by_niveau || []}
            emptyLabel="Aucun memoire archive."
          />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-7">
          <div className="card data-card h-100 dashboard-panel">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span><Activity size={17} /> Activites recentes</span>
              <small className="text-muted">Audit applicatif</small>
            </div>
            <div className="card-body p-0">
              {stats?.recent_activities?.length ? (
                <div className="activity-timeline">
                  {stats.recent_activities.map((item) => (
                    <div className="activity-item" key={item.id}>
                      <div className="activity-dot" />
                      <div>
                        <strong>{item.action_label}</strong>
                        <p>{item.description}</p>
                        <span>{item.utilisateur || 'Systeme'} · {formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="empty-state compact-empty m-3">Aucune activite journalisee.</div>}
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="card data-card h-100 dashboard-panel">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span><Clock3 size={17} /> A traiter rapidement</span>
              {canValidate && <Link to="/validations">Ouvrir</Link>}
            </div>
            <div className="card-body d-grid gap-3">
              {(stats?.validation_summary || []).map((item) => (
                <Link className="quick-action-card" to={canValidate ? item.to : '/dashboard'} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </Link>
              ))}
              <Link className="quick-action-card accent" to="/recherche">
                <span>Recherche documentaire</span>
                <strong>Ouvrir</strong>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card data-card h-100 dashboard-panel">
            <div className="card-header d-flex justify-content-between align-items-center"><span>Documents les plus telecharges</span><Link to="/documents">Voir tout</Link></div>
            <div className="card-body p-0">
              {stats?.top_documents?.length ? (
                <ul className="list-group list-group-flush rank-list">
                  {stats.top_documents.map((doc, index) => (
                    <li key={doc.id} className="list-group-item d-flex justify-content-between align-items-center gap-3">
                      <div className="rank-index">{index + 1}</div>
                      <div className="flex-grow-1">
                        <span className="fw-semibold">{doc.titre}</span>
                        <small>{doc.type_doc}</small>
                      </div>
                      <span className="badge text-bg-primary rounded-pill">{doc.nb_telechargements} DL</span>
                    </li>
                  ))}
                </ul>
              ) : <div className="empty-state compact-empty m-3">Aucune donnee de telechargement pour le moment.</div>}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card data-card h-100 dashboard-panel">
            <div className="card-header d-flex justify-content-between align-items-center"><span>Memoires les plus consultes</span><Link to="/memoires">Voir tout</Link></div>
            <div className="card-body p-0">
              {stats?.top_memoires?.length ? (
                <ul className="list-group list-group-flush rank-list">
                  {stats.top_memoires.map((memoire, index) => (
                    <li key={memoire.id} className="list-group-item d-flex justify-content-between align-items-center gap-3">
                      <div className="rank-index purple">{index + 1}</div>
                      <div className="flex-grow-1">
                        <Link className="fw-semibold text-decoration-none" to={`/memoires/${memoire.id}`}>{memoire.titre}</Link>
                        <small>{memoire.auteur_nom || memoire.annee_academique}</small>
                      </div>
                      <span className="badge text-bg-secondary rounded-pill">{memoire.nb_telechargements} DL</span>
                    </li>
                  ))}
                </ul>
              ) : <div className="empty-state compact-empty m-3">Aucun memoire telecharge pour le moment.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
