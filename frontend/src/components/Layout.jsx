import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, BookOpen, CheckSquare, CreditCard, FileSearch, FileText, HelpCircle, LifeBuoy, LogOut, Menu, MessageSquareText, Network, Server, ShieldCheck, UserCog, UserRound, X } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import api from '../api';

function getRoleLabel(role) {
  return {
    ADMIN: 'Administrateur systeme',
    CHEF_DEPT: 'Chef de Departement',
    ENSEIGNANT: 'Enseignant',
    ETUDIANT: 'Etudiant',
  }[role] || role || 'Utilisateur';
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const isAdmin = user?.role === 'ADMIN';
  const canValidate = ['ADMIN', 'CHEF_DEPT'].includes(user?.role);

  const loadCounters = useCallback(async () => {
    const [notifResult, msgResult] = await Promise.allSettled([
      api.get('/notifications/unread/'),
      api.get('/messages/unread/'),
    ]);

    if (notifResult.status === 'fulfilled') {
      setUnreadNotifications(notifResult.value.data.unread || 0);
    }

    if (msgResult.status === 'fulfilled') {
      setUnreadMessages(msgResult.value.data.unread || 0);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void loadCounters();
    }, 0);

    const timer = window.setInterval(() => {
      void loadCounters();
    }, 30000);

    const refreshCounters = () => {
      void loadCounters();
    };

    window.addEventListener('sis:notifications-updated', refreshCounters);
    window.addEventListener('sis:messages-updated', refreshCounters);
    window.addEventListener('focus', refreshCounters);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      window.removeEventListener('sis:notifications-updated', refreshCounters);
      window.removeEventListener('sis:messages-updated', refreshCounters);
      window.removeEventListener('focus', refreshCounters);
    };
  }, [loadCounters]);

  const navItems = [
    { to: '/dashboard', label: 'Tableau de bord', icon: BarChart3 },
    { to: '/documents', label: 'Ressources', icon: FileText },
    { to: '/memoires', label: 'Memoires', icon: BookOpen },
    { to: '/recherche', label: 'Recherche', icon: FileSearch },
    canValidate ? { to: '/validations', label: 'Validations', icon: CheckSquare } : null,
    canValidate ? { to: '/sessions', label: 'Sessions reseau', icon: Network } : null,
    isAdmin ? { to: '/utilisateurs', label: 'Utilisateurs', icon: UserCog } : null,
    { to: '/messages', label: 'Messagerie', icon: MessageSquareText, badge: unreadMessages },
    user?.role === 'ETUDIANT' ? { to: '/premium', label: 'Acces premium', icon: CreditCard } : null,
    canValidate ? { to: '/premium', label: 'Gestion premium', icon: CreditCard } : null,
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
    { to: '/support', label: 'Support', icon: LifeBuoy },
    { to: '/aide', label: 'Aide', icon: HelpCircle },
    canValidate ? { to: '/systeme', label: 'Etat systeme', icon: Server } : null,
    { to: '/profil', label: 'Mon compte', icon: UserRound },
  ].filter(Boolean);

  const handleLogout = async () => {
    try {
      await api.post('/sessions/close/');
    } catch {
      // La fermeture reseau peut echouer hors MikroTik ; la deconnexion applicative reste prioritaire.
    }
    logout();
    navigate('/login', { replace: true });
  };

  const openNotifications = () => {
    navigate('/notifications');
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <img className="brand-logo" src="/enset-logo.png" alt="Logo ENSET" />
          <div>
            <p className="brand-title">ENSET Douala</p>
            <p className="brand-subtitle">Portail intranet captif</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon, badge }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Icon size={19} />
              <span>{label}</span>
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <Network size={20} />
          <div>
            <strong>Reseau local</strong>
            <span>Wi-Fi MikroTik / mode simulation disponible</span>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button d-lg-none" type="button" aria-label="Menu"><Menu size={20} /></button>
            <div>
              <p className="topbar-kicker">SIS ENSET</p>
              <h1>Gestion documentaire et portail captif</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="notification-button" type="button" onClick={openNotifications} title="Notifications">
              <Bell size={19} />
              {unreadNotifications > 0 && <span>{unreadNotifications}</span>}
            </button>
            <div className="user-chip-wrap">
              <div className="user-chip" onClick={() => setProfileOpen((current) => !current)} role="button" tabIndex={0}>
                <div className="user-avatar">
                  {user?.photo_url ? <img src={user.photo_url} alt="Profil" /> : <UserRound size={18} />}
                </div>
                <div className="user-meta">
                  <strong>{user?.first_name || user?.username || 'Utilisateur'}</strong>
                  <span><ShieldCheck size={13} /> {getRoleLabel(user?.role)}</span>
                </div>
                <button className="logout-button" type="button" onClick={(event) => { event.stopPropagation(); void handleLogout(); }} title="Se deconnecter">
                  <LogOut size={18} />
                </button>
              </div>
              {profileOpen && (
                <div className="user-info-popover">
                  <button className="user-popover-close" type="button" onClick={() => setProfileOpen(false)}><X size={15} /></button>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="user-avatar large">{user?.photo_url ? <img src={user.photo_url} alt="Profil" /> : <UserRound size={22} />}</div>
                    <div><strong>{user?.first_name || user?.username}</strong><span>{getRoleLabel(user?.role)}</span></div>
                  </div>
                  <p>Connecté en tant que <b>{getRoleLabel(user?.role)}</b>. Les droits affichés dans le menu dépendent de ce profil.</p>
                  <div className="d-flex flex-wrap gap-2">
                    <button className="btn btn-sm btn-primary" type="button" onClick={() => { setProfileOpen(false); navigate('/profil'); }}>Voir mon compte</button>
                    {user?.role === 'ETUDIANT' && <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => { setProfileOpen(false); navigate('/premium'); }}>Mes crédits</button>}
                    {canValidate && <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => { setProfileOpen(false); navigate('/premium'); }}>Gestion premium</button>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
