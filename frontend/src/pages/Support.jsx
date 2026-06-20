import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, LifeBuoy, Send, Wrench } from 'lucide-react';
import api from '../api';
import { useAuth } from '../contexts/useAuth';
import Spinner from '../components/Spinner';

const TYPES = [
  ['CONNEXION', 'Connexion'],
  ['DOCUMENT', 'Document ou ressource'],
  ['MEMOIRE', 'Mémoire'],
  ['PAIEMENT', 'Paiement / crédit'],
  ['MESSAGERIE', 'Messagerie / appel'],
  ['RESEAU', 'Réseau / portail captif'],
  ['AUTRE', 'Autre'],
];

const PRIORITES = [
  ['BASSE', 'Basse'],
  ['NORMALE', 'Normale'],
  ['HAUTE', 'Haute'],
  ['URGENTE', 'Urgente'],
];

const STATUTS = {
  OUVERT: 'Ouvert',
  EN_COURS: 'En cours',
  RESOLU: 'Résolu',
  FERME: 'Fermé',
};

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('fr-CM', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala',
  }).format(new Date(value));
}

export default function Support() {
  const { user } = useAuth();
  const canManage = ['ADMIN', 'CHEF_DEPT'].includes(user?.role);
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ type_probleme: 'DOCUMENT', priorite: 'NORMALE', sujet: '', description: '' });

  const loadTickets = useCallback(async () => {
    const [ticketsResult, summaryResult] = await Promise.allSettled([
      api.get('/exploitation/tickets/'),
      api.get('/exploitation/tickets/summary/'),
    ]);
    if (ticketsResult.status === 'fulfilled') {
      setTickets(ticketsResult.value.data.results || ticketsResult.value.data);
    }
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTickets(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTickets]);

  const stats = useMemo(() => summary || {
    ouverts: tickets.filter((ticket) => ticket.statut === 'OUVERT').length,
    en_cours: tickets.filter((ticket) => ticket.statut === 'EN_COURS').length,
    resolus: tickets.filter((ticket) => ['RESOLU', 'FERME'].includes(ticket.statut)).length,
    total: tickets.length,
  }, [summary, tickets]);

  const submitTicket = async (event) => {
    event.preventDefault();
    if (!form.sujet.trim() || !form.description.trim()) {
      setMessage('Veuillez renseigner le sujet et la description du problème.');
      return;
    }
    try {
      await api.post('/exploitation/tickets/', form);
      setForm({ type_probleme: 'DOCUMENT', priorite: 'NORMALE', sujet: '', description: '' });
      setMessage('Votre ticket a été transmis au support.');
      await loadTickets();
    } catch {
      setMessage('Impossible de créer le ticket. Vérifiez le backend.');
    }
  };

  const updateTicket = async (ticket, statut) => {
    try {
      await api.patch(`/exploitation/tickets/${ticket.id}/`, { statut, priorite: ticket.priorite, reponse_admin: ticket.reponse_admin || '' });
      await loadTickets();
    } catch {
      setMessage('Mise à jour impossible.');
    }
  };

  if (loading) return <Spinner label="Chargement du support..." />;

  return (
    <div className="support-page v11-page">
      <div className="v11-hero">
        <div>
          <span className="eyebrow">Support technique</span>
          <h2>{canManage ? 'Centre de support utilisateurs' : 'Signaler un problème'}</h2>
          <p>{canManage ? 'Suivez les demandes, priorisez les incidents et accompagnez les utilisateurs.' : 'Décrivez clairement votre difficulté afin que l’administration puisse vous aider rapidement.'}</p>
        </div>
      </div>

      {message && <div className="alert alert-info border-0 shadow-sm">{message}</div>}

      <div className="v11-stat-grid mb-4">
        <div className="v11-mini-stat"><AlertCircle size={18} /><span>Ouverts</span><strong>{stats.ouverts}</strong></div>
        <div className="v11-mini-stat"><Wrench size={18} /><span>En cours</span><strong>{stats.en_cours}</strong></div>
        <div className="v11-mini-stat"><CheckCircle2 size={18} /><span>Résolus</span><strong>{stats.resolus}</strong></div>
        <div className="v11-mini-stat"><LifeBuoy size={18} /><span>Total</span><strong>{stats.total}</strong></div>
      </div>

      <div className="row g-4">
        <div className="col-xl-5">
          <form className="v11-card" onSubmit={submitTicket}>
            <h3>Nouveau ticket</h3>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.type_probleme} onChange={(e) => setForm({ ...form, type_probleme: e.target.value })}>
                  {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Priorité</label>
                <select className="form-select" value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value })}>
                  {PRIORITES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Sujet</label>
                <input className="form-control" value={form.sujet} onChange={(e) => setForm({ ...form, sujet: e.target.value })} placeholder="Ex : Je n’arrive pas à télécharger un mémoire" />
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Expliquez ce qui se passe, votre rôle, la page concernée et le message affiché." />
              </div>
            </div>
            <button className="btn btn-primary mt-3" type="submit"><Send size={16} /> Envoyer le ticket</button>
          </form>
        </div>
        <div className="col-xl-7">
          <div className="v11-card">
            <h3>{canManage ? 'Tickets utilisateurs' : 'Mes tickets'}</h3>
            <div className="v11-ticket-list">
              {tickets.length === 0 && <div className="empty-state">Aucun ticket enregistré.</div>}
              {tickets.map((ticket) => (
                <div className="v11-ticket" key={ticket.id}>
                  <div className="v11-ticket-head">
                    <div>
                      <strong>{ticket.sujet}</strong>
                      <span>{ticket.utilisateur_nom} · {formatDate(ticket.updated_at)}</span>
                    </div>
                    <span className={`v11-status ${ticket.statut.toLowerCase()}`}>{STATUTS[ticket.statut] || ticket.statut}</span>
                  </div>
                  <p>{ticket.description}</p>
                  <div className="v11-ticket-meta"><span>{ticket.type_probleme}</span><span>{ticket.priorite}</span></div>
                  {ticket.reponse_admin && <div className="v11-reply"><b>Réponse :</b> {ticket.reponse_admin}</div>}
                  {canManage && (
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => updateTicket(ticket, 'EN_COURS')} type="button">En cours</button>
                      <button className="btn btn-sm btn-outline-success" onClick={() => updateTicket(ticket, 'RESOLU')} type="button">Résolu</button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => updateTicket(ticket, 'FERME')} type="button">Fermer</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
