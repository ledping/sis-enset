import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import api from '../api';

export default function RegisterStudent() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ matricule: '', password: '', confirm: '', email: '', telephone: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (form.password !== form.confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register/student/', {
        matricule: form.matricule,
        password: form.password,
        email: form.email,
        telephone: form.telephone,
      });
      setMessage('Compte créé avec succès. Redirection vers la connexion...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.detail || data?.matricule || JSON.stringify(data) || 'Inscription impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-overlay" />
      <div className="student-register-shell">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="text-center mb-4">
            <img src="/enset-logo.png" alt="Logo ENSET" className="login-card-logo" />
            <p className="topbar-kicker">Auto-inscription contrôlée</p>
            <h2>Créer mon compte étudiant</h2>
            <p>Le compte est activé uniquement si ton matricule figure dans la liste importée par le département.</p>
          </div>

          {message && <div className="alert alert-success border-0 py-2">{message}</div>}
          {error && <div className="alert alert-danger border-0 py-2">{error}</div>}

          <div className="mb-3">
            <label className="form-label fw-semibold">Matricule *</label>
            <input className="form-control form-control-lg" value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} placeholder="ex. 24GI0001" required autoFocus />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Email</label>
            <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="adresse@email.com" />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Téléphone</label>
            <input className="form-control" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="6XXXXXXXX" />
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Mot de passe *</label>
              <input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Confirmer *</label>
              <input type="password" className="form-control" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
            </div>
          </div>

          <button className="btn btn-primary btn-lg w-100 fw-bold mt-4" type="submit" disabled={loading}>
            {loading ? 'Création...' : 'Activer mon compte'}
          </button>
          <div className="semi-auto-note mt-3">
            <ShieldCheck size={18} />
            <span>Ce mécanisme évite la création manuelle des comptes un par un tout en empêchant les inscriptions non autorisées.</span>
          </div>
          <div className="login-secondary-actions mt-3">
            <Link to="/login"><GraduationCap size={16} /> Retour à la connexion</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
