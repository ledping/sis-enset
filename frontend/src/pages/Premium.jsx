import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Medal,
  Phone,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../contexts/useAuth';
import Spinner from '../components/Spinner';
import '../premium.css';

const MOYENS = [
  { value: 'MTN_MOMO', label: 'MTN Mobile Money' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'BANQUE', label: 'Dépôt bancaire' },
  { value: 'CAISSE', label: 'Caisse départementale' },
  { value: 'AUTRE', label: 'Autre' },
];

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
}

function statusBadge(statut) {
  if (statut === 'VALIDE') return <span className="premium-status success"><CheckCircle2 size={14} /> Validé</span>;
  if (statut === 'REJETE') return <span className="premium-status danger"><XCircle size={14} /> Rejeté</span>;
  return <span className="premium-status warning"><Clock3 size={14} /> En attente</span>;
}


function filenameFromDisposition(disposition, fallback) {
  const match = /filename="?([^";]+)"?/i.exec(disposition || '');
  return match?.[1] || fallback;
}

function saveBlob(data, filename) {
  const blobUrl = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function Premium() {
  const { user } = useAuth();
  const isAdmin = ['ADMIN', 'CHEF_DEPT'].includes(user?.role);
  const isTeacher = user?.role === 'ENSEIGNANT';
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [settings, setSettings] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [settingsForm, setSettingsForm] = useState({ orange_money_numero: '', mtn_momo_numero: '', beneficiaire: '', note_paiement: '' });
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [audit, setAudit] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [form, setForm] = useState({ moyen: 'MTN_MOMO', numero_payeur: '', reference: '', preuve: null, commentaire: '' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [api.get('/premium/plans/'), api.get('/premium/me/'), api.get('/premium/parametres/'), api.get('/premium/politique/')];
      if (isAdmin) {
        requests.push(api.get('/premium/stats/'));
        requests.push(api.get('/premium/paiements/'));
        requests.push(api.get('/premium/audit/'));
      }
      const [plansRes, meRes, settingsRes, policyRes, statsRes, paymentsRes, auditRes] = await Promise.all(requests);
      const settingsData = settingsRes.data || {};
      setPlans(plansRes.data.results || plansRes.data || []);
      setMe(meRes.data);
      setSettings(settingsData);
      setPolicy(policyRes.data || null);
      setSettingsForm({
        orange_money_numero: settingsData.orange_money_numero || '',
        mtn_momo_numero: settingsData.mtn_momo_numero || '',
        beneficiaire: settingsData.beneficiaire || '',
        note_paiement: settingsData.note_paiement || '',
      });
      if (statsRes) setStats(statsRes.data);
      if (paymentsRes) setPayments(paymentsRes.data.results || paymentsRes.data || []);
      if (auditRes) setAudit(auditRes.data.results || auditRes.data || []);
    } catch {
      setMessage('Impossible de charger le module premium. Vérifiez que le backend est lancé et migré.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedPlanData = useMemo(() => plans.find((plan) => String(plan.id) === String(selectedPlan)), [plans, selectedPlan]);
  const summary = me?.summary || {};
  const paymentNumber = form.moyen === 'ORANGE_MONEY' ? settings?.orange_money_numero : form.moyen === 'MTN_MOMO' ? settings?.mtn_momo_numero : '';

  const seedPlans = async () => {
    try {
      await api.post('/premium/plans/seed/');
      setMessage('Packs premium initialisés.');
      void load();
    } catch {
      setMessage('Initialisation impossible. Réservée à l’administration.');
    }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    try {
      const response = await api.patch('/premium/parametres/', settingsForm);
      setSettings(response.data);
      setMessage('Paramètres de paiement mis à jour.');
      void load();
    } catch {
      setMessage('Modification des paramètres impossible.');
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!selectedPlanData) {
      setMessage('Choisissez d’abord un pack premium.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    const fd = new FormData();
    fd.append('plan', selectedPlanData.id);
    fd.append('montant', selectedPlanData.prix);
    fd.append('moyen', form.moyen);
    fd.append('numero_payeur', form.numero_payeur);
    fd.append('reference', form.reference);
    fd.append('commentaire', form.commentaire);
    if (form.preuve) fd.append('preuve', form.preuve);

    try {
      await api.post('/premium/paiements/', fd);
      setMessage('Demande envoyée. L’administration validera la preuve avant activation des crédits.');
      setSelectedPlan('');
      setForm({ moyen: 'MTN_MOMO', numero_payeur: '', reference: '', preuve: null, commentaire: '' });
      void load();
    } catch (error) {
      setMessage(error.response?.data ? JSON.stringify(error.response.data) : 'Envoi du paiement impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const decidePayment = async (payment, decision) => {
    const motif = decision === 'rejeter' ? window.prompt('Motif du rejet :') || '' : '';
    try {
      await api.post(`/premium/paiements/${payment.id}/${decision}/`, { motif_rejet: motif });
      setMessage(decision === 'valider' ? 'Paiement validé, crédits ajoutés et reçu PDF disponible.' : 'Paiement rejeté.');
      void load();
    } catch {
      setMessage('Décision impossible. Vérifiez vos droits.');
    }
  };

  const exportPayments = async () => {
    try {
      const response = await api.get('/premium/paiements/export/', { responseType: 'blob' });
      saveBlob(response.data, filenameFromDisposition(response.headers['content-disposition'], 'export_paiements_premium.xlsx'));
    } catch {
      setMessage('Export Excel impossible. Vérifiez vos droits administratifs.');
    }
  };

  const downloadReceipt = async (payment) => {
    try {
      const response = await api.get(`/premium/paiements/${payment.id}/recu/`, { responseType: 'blob' });
      saveBlob(response.data, filenameFromDisposition(response.headers['content-disposition'], `recu_premium_${payment.id}.pdf`));
    } catch {
      setMessage('Téléchargement du reçu impossible. Le paiement doit être validé.');
    }
  };

  if (loading) return <Spinner label="Chargement du module premium..." />;

  if (isTeacher) {
    return (
      <div className="premium-page">
        <div className="premium-panel premium-institutional-panel">
          <ShieldCheck size={34} />
          <div>
            <p className="premium-kicker">Accès institutionnel</p>
            <h2>Accès complet enseignant</h2>
            <p>Votre profil enseignant dispose déjà d’un accès pédagogique complet aux ressources autorisées. Le module premium concerne principalement les étudiants et les utilisateurs soumis aux quotas de téléchargement.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-page">
      <div className="page-title premium-title">
        <div>
          <p className="premium-kicker">{isAdmin ? 'Supervision financière' : 'Accès numérique contrôlé'}</p>
          <h2>{isAdmin ? 'Gestion Premium, reçus et audit' : 'Accès Premium et paiements'}</h2>
          <p>{isAdmin ? 'Contrôle des paiements, reçus PDF, export Excel, audit et valeur documentaire.' : 'Trois documents gratuits par mois, crédits supplémentaires et mémoires complets premium.'}</p>
        </div>
        {isAdmin && (
          <div className="premium-actions-row">
            <button className="btn btn-outline-primary" type="button" onClick={() => void seedPlans()}><ShieldCheck size={17} /> Initialiser les packs</button>
            <button className="btn btn-primary" type="button" onClick={() => void exportPayments()}><FileSpreadsheet size={17} /> Export Excel</button>
          </div>
        )}
      </div>

      {message && <div className="alert alert-info border-0 shadow-sm">{message}</div>}

      <div className="premium-grid premium-wallet-grid">
        <div className="premium-card highlight"><div className="premium-card-icon"><FileText size={21} /></div><span>Documents gratuits ce mois-ci</span><strong>{summary.documents_gratuits_restants ?? 0} / {summary.documents_gratuits_mois ?? 3}</strong><small>{summary.documents_gratuits_utilises ?? 0} utilisés</small></div>
        <div className="premium-card"><div className="premium-card-icon"><Download size={21} /></div><span>Documents via crédits</span><strong>{summary.telechargements_documents_credits ?? 0}</strong><small>1 pack document = 5 téléchargements</small></div>
        <div className="premium-card"><div className="premium-card-icon"><Award size={21} /></div><span>Crédits mémoires</span><strong>{summary.credits_memoires ?? 0}</strong><small>1 crédit = 1 mémoire complet</small></div>
        <div className="premium-card"><div className="premium-card-icon"><Wallet size={21} /></div><span>{isAdmin ? 'Total collecté validé' : 'Total payé validé'}</span><strong>{money(isAdmin ? stats?.total_collecte : summary.total_depense)}</strong><small>Traçabilité financière</small></div>
      </div>

      {isAdmin ? (
        <>
          <section className="premium-admin-section">
            <div className="premium-panel-head"><div><h3>Centre de contrôle administratif</h3><p>L’administration valide, supervise et ajuste les paramètres financiers.</p></div><BarChart3 size={24} /></div>
            <div className="premium-grid premium-admin-kpis">
              <div className="premium-card"><span>Paiements en attente</span><strong>{stats?.paiements_en_attente || 0}</strong></div>
              <div className="premium-card"><span>Paiements validés</span><strong>{stats?.paiements_valides || 0}</strong></div>
              <div className="premium-card"><span>Mémoires achetés</span><strong>{stats?.memoires_achetes || 0}</strong></div>
              <div className="premium-card"><span>Part auteur estimée</span><strong>{money(stats?.part_auteur_estimee)}</strong></div>
            </div>

            <div className="premium-admin-grid">
              <div className="premium-panel nested">
                <h4>Paiements à contrôler</h4>
                <div className="table-responsive">
                  <table className="table align-middle premium-table">
                    <thead><tr><th>Utilisateur</th><th>Pack</th><th>Montant</th><th>Preuve</th><th>Statut</th><th>Reçu</th><th>Action</th></tr></thead>
                    <tbody>
                      {payments.slice(0, 12).map((payment) => (
                        <tr key={payment.id}>
                          <td>{payment.utilisateur_nom}</td><td>{payment.plan_detail?.nom || '—'}</td><td>{money(payment.montant)}</td>
                          <td>{payment.preuve_url ? <a href={payment.preuve_url} target="_blank" rel="noreferrer">Voir</a> : <span className="text-muted">—</span>}</td>
                          <td>{statusBadge(payment.statut)}</td>
                          <td>{payment.recu_url ? <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => void downloadReceipt(payment)}><Receipt size={14} /> PDF</button> : <span className="text-muted small">—</span>}</td>
                          <td>{payment.statut === 'EN_ATTENTE' ? <div className="d-flex flex-wrap gap-1"><button className="btn btn-sm btn-success" type="button" onClick={() => void decidePayment(payment, 'valider')}>Valider</button><button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void decidePayment(payment, 'rejeter')}>Rejeter</button></div> : <span className="text-muted small">Traité</span>}</td>
                        </tr>
                      ))}
                      {payments.length === 0 && <tr><td colSpan={7}><div className="empty-state compact-empty">Aucun paiement enregistré.</div></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="premium-panel nested">
                <h4>Paramètres de dépôt</h4>
                <form className="premium-settings-form" onSubmit={saveSettings}>
                  <label>Orange Money</label><input className="form-control" value={settingsForm.orange_money_numero} onChange={(e) => setSettingsForm({ ...settingsForm, orange_money_numero: e.target.value })} />
                  <label>MTN Mobile Money</label><input className="form-control" value={settingsForm.mtn_momo_numero} onChange={(e) => setSettingsForm({ ...settingsForm, mtn_momo_numero: e.target.value })} />
                  <label>Bénéficiaire officiel</label><input className="form-control" value={settingsForm.beneficiaire} onChange={(e) => setSettingsForm({ ...settingsForm, beneficiaire: e.target.value })} />
                  <label>Note affichée aux utilisateurs</label><textarea className="form-control" rows={3} value={settingsForm.note_paiement} onChange={(e) => setSettingsForm({ ...settingsForm, note_paiement: e.target.value })} />
                  <button className="btn btn-primary mt-2" type="submit"><Settings size={16} /> Enregistrer</button>
                </form>
              </div>
            </div>
          </section>

          <section className="premium-admin-grid premium-admin-grid-bottom">
            <div className="premium-panel">
              <div className="premium-panel-head"><div><h3>Mémoires les plus achetés</h3><p>Indicateur de valeur documentaire et base future de reversement aux auteurs.</p></div><Medal size={24} /></div>
              <div className="premium-top-list">
                {(stats?.top_memoires || []).map((item, index) => <div className="premium-top-item" key={item.memoire_id}><span className="rank">#{index + 1}</span><div><strong>{item.memoire__titre}</strong><small>{item.memoire__auteur_nom} · {item.achats} achats · part auteur estimée {money(item.part_auteur_estimee)}</small></div><b>{money(item.revenu_estime)}</b></div>)}
                {(stats?.top_memoires || []).length === 0 && <div className="empty-state compact-empty">Aucun achat de mémoire pour le moment.</div>}
              </div>
            </div>

            <div className="premium-panel">
              <div className="premium-panel-head"><div><h3>Audit financier</h3><p>Dernières opérations premium tracées.</p></div><ScrollText size={24} /></div>
              <div className="premium-audit-list">
                {audit.slice(0, 10).map((item) => <div className="premium-audit-item" key={item.id}><strong>{item.action}</strong><span>{item.description || 'Opération premium'}</span><small>{item.acteur_nom} · {formatDate(item.created_at)}</small></div>)}
                {audit.length === 0 && <div className="empty-state compact-empty">Aucune opération auditée.</div>}
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="premium-two-cols">
          <section className="premium-panel">
            <div className="premium-panel-head"><div><h3>Acheter des crédits</h3><p>Paiement semi-automatique avec preuve. Les crédits sont activés après validation.</p></div><CreditCard size={22} /></div>

            <div className="premium-payment-instructions"><Phone size={18} /><div><strong>Numéros officiels de dépôt</strong><span>Orange Money : {settings?.orange_money_numero || '—'} · MTN Mobile Money : {settings?.mtn_momo_numero || '—'}</span><small>Bénéficiaire : {settings?.beneficiaire || 'Département ENSET Douala'}. {settings?.note_paiement}</small></div></div>

            <div className="premium-plans">
              {plans.map((plan) => <button key={plan.id} type="button" className={`premium-plan ${String(selectedPlan) === String(plan.id) ? 'selected' : ''}`} onClick={() => setSelectedPlan(plan.id)}><strong>{plan.nom}</strong><span>{plan.description}</span><b>{money(plan.prix)}</b><small>{plan.credits_documents} docs · {plan.credits_memoires} mémoires</small></button>)}
              {!plans.length && <div className="empty-state compact-empty">Aucun pack configuré.</div>}
            </div>

            <form className="premium-payment-form" onSubmit={submitPayment}>
              {paymentNumber && <div className="alert alert-success border-0">Déposez le montant sur : <strong>{paymentNumber}</strong></div>}
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label fw-semibold">Moyen de paiement</label><select className="form-select" value={form.moyen} onChange={(e) => setForm({ ...form, moyen: e.target.value })}>{MOYENS.map((moyen) => <option key={moyen.value} value={moyen.value}>{moyen.label}</option>)}</select></div>
                <div className="col-md-6"><label className="form-label fw-semibold">Numéro ayant payé</label><input className="form-control" value={form.numero_payeur} onChange={(e) => setForm({ ...form, numero_payeur: e.target.value })} placeholder="Ex : 6XX XXX XXX" /></div>
                <div className="col-md-6"><label className="form-label fw-semibold">Référence transaction</label><input className="form-control" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Référence MoMo/OM" /></div>
                <div className="col-md-6"><label className="form-label fw-semibold">Preuve de paiement</label><input type="file" className="form-control" accept="image/*,.pdf" onChange={(e) => setForm({ ...form, preuve: e.target.files?.[0] || null })} /></div>
                <div className="col-12"><label className="form-label fw-semibold">Commentaire</label><textarea className="form-control" rows={2} value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} placeholder="Informations complémentaires" /></div>
              </div>
              <button className="btn btn-primary mt-3" type="submit" disabled={submitting || !selectedPlanData}><Receipt size={17} /> Soumettre le paiement {selectedPlanData ? `(${money(selectedPlanData.prix)})` : ''}</button>
            </form>
          </section>

          <section className="premium-panel">
            <div className="premium-panel-head"><div><h3>Historique personnel</h3><p>Paiements, reçus, mémoires achetés et derniers téléchargements.</p></div><Clock3 size={22} /></div>
            <div className="premium-history-list">
              {(me?.paiements_recents || []).map((payment) => <div className="premium-history-item" key={payment.id}><div><strong>{payment.plan_detail?.nom || 'Pack'}</strong><span>{money(payment.montant)} · {payment.moyen}</span>{payment.recu_url && <button className="premium-receipt-link premium-link-button" type="button" onClick={() => void downloadReceipt(payment)}><Receipt size={14} /> Télécharger le reçu</button>}</div>{statusBadge(payment.statut)}</div>)}
              {(me?.paiements_recents || []).length === 0 && <div className="empty-state compact-empty">Aucun paiement enregistré.</div>}
            </div>
            <div className="premium-mini-section"><h4>Mémoires débloqués</h4>{(me?.memoires_achetes || []).map((achat) => <div className="premium-history-item compact" key={achat.id}><div><strong>{achat.memoire_titre}</strong><span>Auteur : {achat.auteur_nom}</span></div><Medal size={17} /></div>)}{(me?.memoires_achetes || []).length === 0 && <p className="text-muted small mb-0">Aucun mémoire acheté.</p>}</div>
          </section>
        </div>
      )}

      <section className="premium-panel premium-policy-panel">
        <div className="premium-panel-head"><div><h3>Politique d’accès premium</h3><p>Règles institutionnelles affichées aux utilisateurs.</p></div><ScrollText size={22} /></div>
        <div className="premium-policy-grid">
          <p><strong>Documents.</strong> {policy?.documents}</p>
          <p><strong>Mémoires.</strong> {policy?.memoires}</p>
          <p><strong>Paiements.</strong> {policy?.paiements}</p>
          <p><strong>Reçus.</strong> {policy?.recu}</p>
          <p><strong>Valorisation auteur.</strong> {policy?.auteurs}</p>
          <p><strong>Responsabilité.</strong> {policy?.responsabilite}</p>
        </div>
      </section>
    </div>
  );
}
