import { useState } from 'react';
import { Camera, KeyRound, Save, UserRound } from 'lucide-react';
import api from '../api';
import { useAuth } from '../contexts/useAuth';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || '', last_name: user?.last_name || '', email: user?.email || '',
    departement: user?.departement || '', filiere: user?.filiere || '', niveau: user?.niveau || '', telephone: user?.telephone || '', photo: null,
  });
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '' });
  const [message, setMessage] = useState('');

  const handleProfile = async (event) => {
    event.preventDefault();
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== undefined) payload.append(key, value);
    });
    try {
      await api.patch('/auth/profile/', payload);
      await refreshUser();
      setMessage('Profil mis a jour avec succes.');
    } catch (error) {
      setMessage(error.response?.data ? JSON.stringify(error.response.data) : 'Mise a jour impossible.');
    }
  };

  const handlePassword = async (event) => {
    event.preventDefault();
    try {
      await api.post('/auth/password/', passwords);
      setPasswords({ old_password: '', new_password: '' });
      setMessage('Mot de passe modifie. Reconnectez-vous si necessaire.');
    } catch (error) {
      setMessage(error.response?.data ? JSON.stringify(error.response.data) : 'Changement de mot de passe impossible.');
    }
  };

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Mon compte</h2>
          <p>Photo de profil, informations personnelles et securite du compte.</p>
        </div>
      </div>

      {message && <div className="alert alert-info border-0 shadow-sm">{message}</div>}

      <div className="row g-4">
        <div className="col-lg-8">
          <form className="card data-card" onSubmit={handleProfile}>
            <div className="card-header">Informations du profil</div>
            <div className="card-body row g-3">
              <div className="col-12 d-flex align-items-center gap-3">
                <div className="profile-photo">{user?.photo_url ? <img src={user.photo_url} alt="Profil" /> : <UserRound size={32} />}</div>
                <div>
                  <label className="btn btn-outline-primary btn-sm mb-1"><Camera size={16} /> Choisir une photo<input type="file" accept="image/*" hidden onChange={(e) => setForm({ ...form, photo: e.target.files?.[0] || null })} /></label>
                  <p className="text-muted small">PNG/JPG recommande. Elle apparaitra dans la barre superieure.</p>
                </div>
              </div>
              <div className="col-md-6"><label className="form-label fw-semibold">Prenom</label><input className="form-control" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
              <div className="col-md-6"><label className="form-label fw-semibold">Nom</label><input className="form-control" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
              <div className="col-md-6"><label className="form-label fw-semibold">Email</label><input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="col-md-6"><label className="form-label fw-semibold">Telephone</label><input className="form-control" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
              <div className="col-md-4"><label className="form-label fw-semibold">Departement</label><input className="form-control" value={form.departement} onChange={(e) => setForm({ ...form, departement: e.target.value })} /></div>
              <div className="col-md-4"><label className="form-label fw-semibold">Filiere</label><input className="form-control" value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })} /></div>
              <div className="col-md-4"><label className="form-label fw-semibold">Niveau</label><input type="number" className="form-control" value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} /></div>
            </div>
            <div className="card-footer bg-white border-0 text-end"><button className="btn btn-primary" type="submit"><Save size={17} /> Enregistrer</button></div>
          </form>
        </div>

        <div className="col-lg-4">
          <form className="card data-card" onSubmit={handlePassword}>
            <div className="card-header"><KeyRound size={17} /> Securite</div>
            <div className="card-body">
              <label className="form-label fw-semibold">Ancien mot de passe</label>
              <input type="password" className="form-control mb-3" value={passwords.old_password} onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })} required />
              <label className="form-label fw-semibold">Nouveau mot de passe</label>
              <input type="password" className="form-control mb-3" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} required />
              <button className="btn btn-outline-primary w-100" type="submit">Changer le mot de passe</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
