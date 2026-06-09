import { useEffect, useState } from 'react';
import { Inbox, MailOpen, Reply, Send, SendHorizonal } from 'lucide-react';
import api from '../api';
import Spinner from '../components/Spinner';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [box, setBox] = useState('inbox');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ destinataire: '', objet: '', contenu: '' });
  const [replyingTo, setReplyingTo] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    api.get('/messages/', { params: { box } })
      .then((response) => { if (!ignore) setMessages(response.data.results || response.data); })
      .catch(() => { if (!ignore) setMessage('Impossible de charger les messages.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [box, reloadKey]);

  useEffect(() => {
    api.get('/messages/contacts/').then((response) => setContacts(response.data.results || response.data)).catch(() => {});
  }, []);

  const openMessage = async (item) => {
    const { data } = await api.get(`/messages/${item.id}/`);
    setSelected(data);
    setReloadKey((current) => current + 1);
  };

  const prepareReply = (item) => {
    const destinataire = item.expediteur_detail?.id || item.expediteur;
    const objet = item.objet?.toLowerCase().startsWith('re:') ? item.objet : `Re: ${item.objet}`;
    setReplyingTo(item);
    setForm({
      destinataire: destinataire ? String(destinataire) : '',
      objet,
      contenu: `\n\n--- Message initial ---\n${item.contenu || ''}`,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setForm({ destinataire: '', objet: '', contenu: '' });
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    try {
      await api.post('/messages/', form);
      setForm({ destinataire: '', objet: '', contenu: '' });
      setReplyingTo(null);
      setMessage(replyingTo ? 'Réponse envoyée avec succès.' : 'Message envoyé avec succès.');
      setBox('sent');
      setLoading(true);
      setReloadKey((current) => current + 1);
    } catch (error) {
      setMessage(error.response?.data ? JSON.stringify(error.response.data) : 'Envoi impossible.');
    }
  };

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Messagerie interne</h2>
          <p>Communication locale entre administrateurs, enseignants, chef de département et étudiants.</p>
        </div>
      </div>

      {message && <div className="alert alert-info border-0 shadow-sm">{message}</div>}

      <div className="row g-4">
        <div className="col-lg-4">
          <form className="card data-card" onSubmit={sendMessage}>
            <div className="card-header"><SendHorizonal size={17} /> {replyingTo ? 'Répondre au message' : 'Nouveau message'}</div>
            <div className="card-body">
              {replyingTo && (
                <div className="alert alert-primary border-0 small">
                  Réponse à : <strong>{replyingTo.expediteur_detail?.nom_complet || replyingTo.expediteur_detail?.username}</strong>
                  <button className="btn btn-sm btn-link float-end p-0" type="button" onClick={cancelReply}>Annuler</button>
                </div>
              )}
              <label className="form-label fw-semibold">Destinataire</label>
              <select className="form-select mb-3" value={form.destinataire} onChange={(e) => setForm({ ...form, destinataire: e.target.value })} required>
                <option value="">Choisir un utilisateur</option>
                {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.nom_complet || contact.username} - {contact.role}</option>)}
              </select>
              <label className="form-label fw-semibold">Objet</label>
              <input className="form-control mb-3" value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })} required />
              <label className="form-label fw-semibold">Message</label>
              <textarea className="form-control mb-3" rows={6} value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} required />
              <button className="btn btn-primary w-100" type="submit"><Send size={17} /> {replyingTo ? 'Envoyer la réponse' : 'Envoyer'}</button>
            </div>
          </form>
        </div>

        <div className="col-lg-8">
          <div className="card data-card">
            <div className="card-header d-flex gap-2">
              <button className={`btn btn-sm ${box === 'inbox' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setLoading(true); setBox('inbox'); }}><Inbox size={15} /> Reçus</button>
              <button className={`btn btn-sm ${box === 'sent' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setLoading(true); setBox('sent'); }}><Send size={15} /> Envoyés</button>
            </div>
            <div className="card-body p-0">
              {loading ? <Spinner label="Chargement des messages..." /> : (
                <div className="message-list">
                  {messages.map((item) => (
                    <button key={item.id} className={`message-row ${!item.lu && box === 'inbox' ? 'unread' : ''}`} onClick={() => void openMessage(item)}>
                      <MailOpen size={18} />
                      <div>
                        <strong>{item.objet}</strong>
                        <span>{box === 'sent' ? `A: ${item.destinataire_detail?.nom_complet || item.destinataire_detail?.username}` : `De: ${item.expediteur_detail?.nom_complet || item.expediteur_detail?.username}`}</span>
                      </div>
                      <small>{new Date(item.created_at).toLocaleString()}</small>
                    </button>
                  ))}
                  {messages.length === 0 && <div className="empty-state m-3">Aucun message dans cette boîte.</div>}
                </div>
              )}
            </div>
          </div>

          {selected && (
            <div className="card data-card mt-3">
              <div className="card-header d-flex justify-content-between align-items-center gap-2">
                <span>{selected.objet}</span>
                <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => prepareReply(selected)}>
                  <Reply size={15} /> Répondre
                </button>
              </div>
              <div className="card-body">
                <p className="text-muted small mb-3">De {selected.expediteur_detail?.nom_complet || selected.expediteur_detail?.username} à {selected.destinataire_detail?.nom_complet || selected.destinataire_detail?.username}</p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{selected.contenu}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
