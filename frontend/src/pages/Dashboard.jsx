import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckSquare,
  Clock3,
  CreditCard,
  Download,
  FilePlus2,
  FileSearch,
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

function StatCard({ to, icon: Icon, color, value, label }) {
  return (
    <Link to={to} className="stat-card stat-card-link stat-card-v8">
      <div className="stat-icon" style={{ background: color }}><Icon size={23} /></div>
      <div className="stat-value" style={{ color }}>{value ?? 0}</div>
      <div className="stat-label">{label}</div>
    </Link>
  );
}

function QuickAccessCard({ to, icon: Icon, title, text, badge }) {
  return (
    <Link to={to} className="quick-action-card dashboard-role-action">
      <div className="dashboard-role-action-icon"><Icon size={18} /></div>
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      {badge !== undefined && <b>{badge}</b>}
    </Link>
  );
}

function RecentActivities({ activities = [] }) {
  return (
    <div className="card data-card h-100 dashboard-panel">
      <div className="card-header d-flex justify-content-between align-items-center">
        <span><Activity size={17} /> Activites recentes</span>
        <small className="text-muted">Audit applicatif</small>
      </div>
      <div className="card-body p-0">
        {activities.length ? (
          <div className="activity-timeline">
            {activities.map((item) => (
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

  const role = user?.role;
  const isStudent = role === 'ETUDIANT';
  const isTeacher = role === 'ENSEIGNANT';
  const isAdmin = role === 'ADMIN';
  const canValidate = ['ADMIN', 'CHEF_DEPT'].includes(role);
  const waitingCount = (stats?.documents_en_attente || 0) + (stats?.memoires_en_attente || 0);

  const adminCards = [
    { key: 'total_etudiants', label: 'Etudiants', icon: GraduationCap, color: '#2E75B6', to: isAdmin ? '/utilisateurs' : '/dashboard' },
    { key: 'total_enseignants', label: 'Enseignants', icon: UsersRound, color: '#1E7145', to: isAdmin ? '/utilisateurs' : '/dashboard' },
    { key: 'total_documents', label: 'Documents valides', icon: FileText, color: '#BF5700', to: '/documents' },
    { key: 'total_memoires', label: 'Memoires archives', icon: BookOpen, color: '#6B2D8B', to: '/memoires' },
    { key: 'total_telechargements', label: 'Telechargements', icon: Download, color: '#1F6B75', to: '/documents' },
    { key: 'sessions_actives', label: 'Sessions actives', icon: Wifi, color: '#16A34A', to: canValidate ? '/sessions' : '/dashboard' },
  ];

  const studentCards = [
    { key: 'total_documents', label: 'Ressources disponibles', icon: FileText, color: '#2E75B6', to: '/documents' },
    { key: 'total_memoires', label: 'Memoires consultables', icon: BookOpen, color: '#6B2D8B', to: '/memoires' },
    { key: 'total_telechargements', label: 'Mes acces documentaires', icon: Download, color: '#1F6B75', to: '/premium' },
    { key: 'sessions_actives', label: 'Acces reseau actif', icon: Wifi, color: '#16A34A', to: '/dashboard' },
  ];

  const teacherCards = [
    { key: 'total_documents', label: 'Ressources publiees', icon: FileText, color: '#2E75B6', to: '/documents' },
    { key: 'total_memoires', label: 'Memoires archives', icon: BookOpen, color: '#6B2D8B', to: '/memoires' },
    { key: 'total_telechargements', label: 'Consultations globales', icon: Download, color: '#1F6B75', to: '/documents' },
    { key: 'sessions_actives', label: 'Presence reseau', icon: Wifi, color: '#16A34A', to: '/sessions' },
  ];

  const cards = isStudent ? studentCards : isTeacher ? teacherCards : adminCards;

  return (
    <div className={`dashboard-v8 ${isStudent ? 'dashboard-student' : ''} ${isTeacher ? 'dashboard-teacher' : ''}`}>
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">SIS ENSET Douala</span>
          <h2>{canValidate ? 'Tableau de bord de supervision' : isTeacher ? 'Espace enseignant' : 'Mon espace documentaire'}</h2>
          <p>
            {canValidate
              ? 'Pilotez les validations, les ressources, les utilisateurs, le réseau et les indicateurs clés de la plateforme.'
              : isTeacher
                ? 'Accédez rapidement aux ressources pédagogiques, aux mémoires, à la messagerie et au dépôt de documents.'
                : 'Consultez les ressources autorisées, suivez vos accès premium et retrouvez rapidement les mémoires disponibles.'}
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <Link className="btn btn-light" to="/messages"><MessageSquareText size={17} /> Messagerie</Link>
          {isStudent && <Link className="btn btn-warning" to="/premium"><CreditCard size={17} /> Mes credits</Link>}
          {isTeacher && <Link className="btn btn-warning" to="/documents"><FilePlus2 size={17} /> Deposer</Link>}
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
        {cards.map(({ key, label, icon, color, to }) => (
          <div key={key} className={canValidate ? 'col-6 col-lg-4 col-xxl-2' : 'col-6 col-xl-3'}>
            <StatCard to={to} icon={icon} color={color} value={stats?.[key]} label={label} />
          </div>
        ))}
      </div>

      {(isStudent || isTeacher) && (
        <div className="dashboard-role-grid mb-4">
          <div className="card data-card dashboard-panel">
            <div className="card-header d-flex align-items-center gap-2">
              <FileSearch size={17} /> <span>Actions utiles</span>
            </div>
            <div className="card-body d-grid gap-3">
              <QuickAccessCard to="/recherche" icon={FileSearch} title="Rechercher une ressource" text="Trouver rapidement un document ou un memoire." />
              <QuickAccessCard to="/memoires" icon={BookOpen} title="Lire les articles de memoires" text="Consultation gratuite des fiches et articles." />
              {isStudent && <QuickAccessCard to="/premium" icon={CreditCard} title="Gerer mes credits" text="Acheter des packs et suivre mes telechargements." />}
              {isTeacher && <QuickAccessCard to="/documents" icon={FilePlus2} title="Deposer un document" text="Publier un cours, TD, TP, sujet ou support." />}
            </div>
          </div>

          <div className="card data-card dashboard-panel">
            <div className="card-header d-flex align-items-center gap-2">
              <ShieldCheck size={17} /> <span>{isStudent ? 'Regles d acces' : 'Acces enseignant'}</span>
            </div>
            <div className="card-body">
              {isStudent ? (
                <div className="dashboard-role-note">
                  <strong>Quota mensuel étudiant</strong>
                  <p>Vous disposez de 3 téléchargements gratuits de documents par mois. Au-delà, un pack document ajoute 5 téléchargements. Les articles de mémoires restent consultables gratuitement ; le PDF complet nécessite un crédit mémoire.</p>
                  <Link className="btn btn-sm btn-outline-primary" to="/premium">Voir mes crédits</Link>
                </div>
              ) : (
                <div className="dashboard-role-note">
                  <strong>Accès institutionnel enseignant</strong>
                  <p>Votre profil n’est pas soumis au système premium. Vous pouvez consulter les ressources autorisées et déposer des supports pédagogiques selon le processus de validation institutionnel.</p>
                  <Link className="btn btn-sm btn-outline-primary" to="/documents">Gérer les ressources</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {canValidate && (
        <>
          <div className="row g-4 mb-4">
            <div className="col-xl-4 col-lg-6">
              <DistributionBars title="Utilisateurs par role" items={stats?.role_distribution || []} emptyLabel="Aucun utilisateur enregistre." />
            </div>
            <div className="col-xl-4 col-lg-6">
              <DistributionBars title="Documents par type" items={stats?.documents_by_type || []} emptyLabel="Aucun document depose." />
            </div>
            <div className="col-xl-4 col-lg-12">
              <DistributionBars title="Memoires par niveau" items={stats?.memoires_by_niveau || []} emptyLabel="Aucun memoire archive." />
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-xl-7"><RecentActivities activities={stats?.recent_activities || []} /></div>
            <div className="col-xl-5">
              <div className="card data-card h-100 dashboard-panel">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span><Clock3 size={17} /> A traiter rapidement</span>
                  <Link to="/validations">Ouvrir</Link>
                </div>
                <div className="card-body d-grid gap-3">
                  {(stats?.validation_summary || []).map((item) => (
                    <Link className="quick-action-card" to={item.to} key={item.label}>
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
        </>
      )}

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
