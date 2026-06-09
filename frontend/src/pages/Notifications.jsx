import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, SendHorizonal } from 'lucide-react';
import api from '../api';
import Spinner from '../components/Spinner';
import { useAuth } from '../contexts/useAuth';

function notifyCountersUpdated() {
  window.dispatchEvent(new Event('sis:notifications-updated'));
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ cible: 'TOUS', utilisateur: '', titre: '', message: '', lien: '' });
  const canBroadcast = ['ADMIN', 'CHEF_DEPT'].includes(user?.role);

  useEffect(() => {
    let ignore = false;

    const loadAndMarkAsRead = async () => {
      try {
        const response = await api.get('/notifications/');
        const items = response.data.results || response.data;
        const hasUnread = items.some((item) => !item.lu);

        if (hasUnread) {
          await api.post('/notifications/read-all/');
          notifyCountersUpdated();
        }

        if (!ignore) {
          setNotifications(items.map((item) => ({ ...item, lu: true })));
        }
      } catch {
        if (!ignore) {
          setMessage('Impossible de charger les notifications.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadAndMarkAsRead();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!canBroadcast) return;

    let ignore = false;

    const loadContacts = async () => {
      try {
        const response = await api.get('/messages/contacts/');
        if (!ignore) {
          setContacts(response.data.results || response.data);
        }
      } catch {
        // Les contacts ne sont pas bloquants pour la lecture des notifications.
      }
    };

    void loadContacts();

    return () => {
      ignore = true;
    };
  }, [canBroadcast]);

  const refreshNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications/');
      const items = response.data.results || response.data;
      setNotifications(items);
    } catch {
      setMessage('Impossible de charger les notifications.');
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all/');
      setNotifications((items) => items.map((item) => ({ ...item, lu: true })));
      notifyCountersUpdated();
      setMessage('Toutes les notifications ont ete marquees comme lues.');
    } catch {
      setMessage('Impossible de marquer les notifications comme lues.');
    }
  };

  const markOneRead = async (item) => {
    try {
      if (!item.lu) {
        await api.post(`/notifications/${item.id}/read/`);
        setNotifications((items) => items.map((notification) => (
          notification.id === item.id ? { ...notification, lu: true } : notification
        )));
        notifyCountersUpdated();
      }

      if (item.lien) {
        navigate(item.lien);
      }
    } catch {
      setMessage('Impossible de marquer cette notification comme lue.');
    }
  };

  const sendNotification = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form };
      if (payload.cible !== 'UTILISATEUR') delete payload.utilisateur;
      await api.post('/notifications/broadcast/', payload);
      setForm({ cible: 'TOUS', utilisateur: '', titre: '', message: '', lien: '' });
      setMessage('Notification envoyee avec succes.');
      await refreshNotifications();
    } catch (error) {
      setMessage(error.response?.data ? JSON.stringify(error.response.data) : 'Envoi impossible.');
    }
  };

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Centre de notifications</h2>
          <p>Alertes de messages, validations, rejets et annonces internes.</p>
        </div>
        <button className="btn btn-outline-primary" type="button" onClick={() => void markAllRead()}><CheckCheck size={17} /> Tout marquer comme lu</button>
      </div>

      {message && <div className="alert alert-info border-0 shadow-sm">{message}</div>}

      <div className="row g-4">
        <div className={canBroadcast ? 'col-lg-7' : 'col-12'}>
          <div className="card data-card">
            <div className="card-header"><Bell size={17} /> Mes notifications</div>
            <div className="card-body p-0">
              {loading ? <Spinner label="Chargement des notifications..." /> : (
                <div className="message-list">
                  {notifications.map((item) => (
                    <button key={item.id} className={`message-row ${!item.lu ? 'unread' : ''}`} type="button" onClick={() => void markOneRead(item)}>
                      <Bell size={18} />
                      <div>
                        <strong>{item.titre}</strong>
                        <span>{item.message}</span>
                      </div>
                      <small>{new Date(item.created_at).toLocaleString()}</small>
                    </button>
                  ))}
                  {notifications.length === 0 && <div className="empty-state m-3">Aucune notification pour le moment.</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        {canBroadcast && (
          <div className="col-lg-5">
            <form className="card data-card" onSubmit={sendNotification}>
              <div className="card-header"><SendHorizonal size={17} /> Envoyer une annonce</div>
              <div className="card-body">
                <label className="form-label fw-semibold">Cible</label>
                <select className="form-select mb-3" value={form.cible} onChange={(e) => setForm({ ...form, cible: e.target.value })}>
                  <option value="TOUS">Tous les utilisateurs</option>
                  <option value="ETUDIANTS">Tous les etudiants</option>
                  <option value="ENSEIGNANTS">Tous les enseignants</option>
                  <option value="CHEF_DEPT">Chefs de departement</option>
                  <option value="ADMIN">Administrateurs</option>
                  <option value="UTILISATEUR">Un utilisateur precis</option>
                </select>
                {form.cible === 'UTILISATEUR' && (
                  <select className="form-select mb-3" value={form.utilisateur} onChange={(e) => setForm({ ...form, utilisateur: e.target.value })} required>
                    <option value="">Choisir un utilisateur</option>
                    {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.nom_complet || contact.username} - {contact.role}</option>)}
                  </select>
                )}
                <label className="form-label fw-semibold">Titre</label>
                <input className="form-control mb-3" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required />
                <label className="form-label fw-semibold">Message</label>
                <textarea className="form-control mb-3" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                <label className="form-label fw-semibold">Lien interne optionnel</label>
                <input className="form-control mb-3" placeholder="ex. /memoires" value={form.lien} onChange={(e) => setForm({ ...form, lien: e.target.value })} />
                <button className="btn btn-primary w-100" type="submit"><SendHorizonal size={17} /> Envoyer</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
