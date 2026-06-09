import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wifi, ShieldCheck, LibraryBig } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(username, password);
    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.message || 'Identifiants incorrects.');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-overlay" />
      <div className="login-shell">
        <section className="login-hero-panel">
          <img src="/enset-logo.png" alt="Logo ENSET" className="login-logo" />
          <p className="topbar-kicker text-white">SIS ENSET DOUALA</p>
          <h1>Portail intranet documentaire et captif</h1>
          <p>
            Acces securise aux ressources pedagogiques, aux memoires academiques,
            a la messagerie interne et au reseau Wi-Fi departemental.
          </p>
          <div className="login-features">
            <span><LibraryBig size={17} /> Archives centralisees</span>
            <span><ShieldCheck size={17} /> Validation academique</span>
            <span><Wifi size={17} /> Controle MikroTik</span>
          </div>
        </section>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="text-center mb-4">
            <img src="/enset-logo.png" alt="Logo ENSET" className="login-card-logo" />
            <h2>SIS ENSET</h2>
            <p>Connectez-vous a votre espace intranet</p>
          </div>

          {error && <div className="alert alert-danger border-0 py-2">{error}</div>}

          <div className="mb-3">
            <label className="form-label fw-semibold">Identifiant</label>
            <input className="form-control form-control-lg" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ex. ENSET_ADMIN" autoFocus />
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold">Mot de passe</label>
            <input type="password" className="form-control form-control-lg" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" />
          </div>

          <button className="btn btn-primary btn-lg w-100 fw-bold" type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
          <div className="login-secondary-actions">
            <Link to="/inscription-etudiant">Créer mon compte étudiant avec mon matricule</Link>
          </div>
          <p className="login-help">Plateforme locale ENSET Douala - Genie Informatique</p>
        </form>
      </div>
    </div>
  );
}
