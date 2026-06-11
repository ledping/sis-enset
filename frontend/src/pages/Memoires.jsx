import { useEffect, useState } from 'react';
import { Download, Eye, FilePlus2, Plus, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/useAuth';
import Spinner from '../components/Spinner';

const emptyTool = { categorie: '', nom: '', version: '', description: '' };

const initialForm = {
  titre: '',
  auteur_nom: '',
  auteur_email: '',
  auteur_telephone: '',
  encadreur: '',
  filiere: '',
  option: '',
  niveau: 'DIPET2',
  annee_academique: '2025-2026',
  resume: '',
  introduction: '',
  problematique: '',
  materiels_methodes: '',
  materiels_outils: [{ ...emptyTool }],
  resultats_discussion: '',
  mots_cles: '',
  fichier_pdf: null,
  support_presentation: null,
  photo_auteur: null,
  image_resultat_1: null,
  image_resultat_2: null,
  image_resultat_3: null,
  image_resultat_4: null,
  video_demo: null,
  video_presentation: null,
};

export default function Memoires() {
  const { user } = useAuth();
  const [memoires, setMemoires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [niveau, setNiveau] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [reloadKey, setReloadKey] = useState(0);

  const canSubmit = ['ENSEIGNANT', 'ADMIN', 'CHEF_DEPT'].includes(user?.role);
  const canDelete = (memoire) => ['ADMIN', 'CHEF_DEPT'].includes(user?.role) || memoire.depose_par_id === user?.id || memoire.depose_par_detail?.id === user?.id;

  useEffect(() => {
    let ignore = false;
    const params = {};

    if (search.trim()) {
      params.search = search.trim();
    }

    if (niveau) {
      params.niveau = niveau;
    }

    api.get('/memoires/', { params })
      .then((response) => {
        if (!ignore) {
          setMemoires(response.data.results || response.data);
        }
      })
      .catch(() => {
        if (!ignore) {
          setMessage('Impossible de charger la bibliothèque des mémoires.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [search, niveau, reloadKey]);

  const updateTool = (index, field, value) => {
    setForm((current) => ({
      ...current,
      materiels_outils: current.materiels_outils.map((tool, toolIndex) => (
        toolIndex === index ? { ...tool, [field]: value } : tool
      )),
    }));
  };

  const addTool = () => {
    setForm((current) => ({
      ...current,
      materiels_outils: [...current.materiels_outils, { ...emptyTool }],
    }));
  };

  const removeTool = (index) => {
    setForm((current) => ({
      ...current,
      materiels_outils: current.materiels_outils.length === 1
        ? [{ ...emptyTool }]
        : current.materiels_outils.filter((_, toolIndex) => toolIndex !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.titre || !form.auteur_nom || !form.encadreur || !form.filiere || !form.resume || !form.fichier_pdf) {
      setMessage('Titre, auteur, encadreur, filière, abstract et mémoire PDF sont obligatoires.');
      return;
    }

    const cleanTools = form.materiels_outils.filter((tool) => (
      tool.categorie.trim() || tool.nom.trim() || tool.version.trim() || tool.description.trim()
    ));

    setSubmitting(true);
    setMessage('');
    const fd = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (key === 'materiels_outils') {
        fd.append(key, JSON.stringify(cleanTools));
      } else if (value) {
        fd.append(key, value);
      }
    });
    fd.append('departement', user?.departement || 'Génie Informatique');

    try {
      await api.post('/memoires/', fd);
      setShowModal(false);
      setMessage('Mémoire soumis avec succès. Le résumé article sera généré automatiquement après validation.');
      setForm({ ...initialForm, materiels_outils: [{ ...emptyTool }] });
      setLoading(true);
      setReloadKey((current) => current + 1);
    } catch (error) {
      setMessage(error.response?.data ? JSON.stringify(error.response.data) : 'Erreur lors de la soumission du mémoire.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (id, titre) => {
    try {
      const response = await api.get(`/memoires/${id}/dl/`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${titre}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage('Téléchargement lancé.');
    } catch (error) {
      if (error.response?.status === 402) {
        setMessage(error.response.data?.detail || 'Crédit mémoire requis. Ouvrez Accès premium pour acheter un pack mémoire.');
      } else {
        setMessage('Téléchargement impossible.');
      }
    }
  };

  const handleDelete = async (memoire) => {
    const confirmed = window.confirm(`Supprimer définitivement le mémoire « ${memoire.titre} » ? Cette action supprimera aussi ses fichiers.`);
    if (!confirmed) return;

    try {
      await api.delete(`/memoires/${memoire.id}/`);
      setMemoires((current) => current.filter((item) => item.id !== memoire.id));
      setMessage('Mémoire supprimé définitivement.');
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Suppression impossible. Vérifiez vos droits.');
    }
  };

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Bibliothèque numérique des mémoires</h2>
          <p>Archivage structuré avec résumé automatiquement présenté au format article académique.</p>
        </div>
        {canSubmit && (
          <button className="btn btn-primary" type="button" onClick={() => setShowModal(true)}>
            <FilePlus2 size={18} /> Soumettre un mémoire
          </button>
        )}
      </div>

      {message && <div className="alert alert-info border-0 shadow-sm">{message}</div>}

      <div className="filter-card">
        <div className="row g-2">
          <div className="col-md-7">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0"><Search size={17} /></span>
              <input
                className="form-control border-start-0"
                placeholder="Titre, auteur, encadreur, mots-clés..."
                value={search}
                onChange={(e) => {
                  setLoading(true);
                  setSearch(e.target.value);
                }}
              />
            </div>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={niveau}
              onChange={(e) => {
                setLoading(true);
                setNiveau(e.target.value);
              }}
            >
              <option value="">Tous les niveaux</option>
              <option value="DIPET1">DIPET I (Niveau 3)</option>
              <option value="DIPET2">DIPET II (Niveau 5)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? <Spinner label="Chargement des mémoires..." /> : (
        <div className="row g-3">
          {memoires.length === 0 && (
            <div className="col-12">
              <div className="empty-state">Aucun mémoire archivé ne correspond aux filtres.</div>
            </div>
          )}
          {memoires.map((memoire) => (
            <div className="col-lg-4 col-md-6" key={memoire.id}>
              <div className="card document-card h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <span className="badge text-bg-primary">{memoire.niveau}</span>
                    <span className="badge text-bg-light text-muted">{memoire.annee_academique}</span>
                  </div>
                  <h5 className="fw-bold mb-2">{memoire.titre}</h5>
                  <p className="meta-line mb-1">Auteur : {memoire.auteur_nom}</p>
                  <p className="meta-line mb-1">Encadreur : {memoire.encadreur}</p>
                  <p className="meta-line mb-3">{memoire.filiere}{memoire.option ? ` · ${memoire.option}` : ''}</p>
                  <p className="text-muted small flex-grow-1">{memoire.resume?.slice(0, 170)}{memoire.resume?.length > 170 ? '...' : ''}</p>
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <Link className="btn btn-outline-primary btn-sm" to={`/memoires/${memoire.id}`}>
                      <Eye size={15} /> Article
                    </Link>
                    {memoire.fichier_pdf && (
                      <button className="btn btn-primary btn-sm" type="button" onClick={() => void handleDownload(memoire.id, memoire.titre)}>
                        <Download size={15} /> Débloquer PDF
                      </button>
                    )}
                    {canDelete(memoire) && (
                      <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void handleDelete(memoire)}>
                        <Trash2 size={15} /> Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(15,23,42,.55)' }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <form className="modal-content" onSubmit={handleSubmit}>
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Soumettre un dossier mémoire</h5>
                  <p className="text-muted small mb-0">Les informations saisies généreront automatiquement une page résumé au format article académique.</p>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label="Fermer" />
              </div>
              <div className="modal-body">
                <div className="alert alert-primary border-0">
                  <strong>Principe :</strong> ne téléverse plus de résumé PDF/HTML. La plateforme formalise elle-même la fiche article à partir du titre, de l'abstract, des outils, des résultats et des images.
                </div>
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label fw-semibold">Titre officiel du mémoire *</label>
                    <input className="form-control" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Niveau *</label>
                    <select className="form-select" value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })}>
                      <option value="DIPET1">DIPET I (Niveau 3)</option>
                      <option value="DIPET2">DIPET II (Niveau 5)</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Auteur *</label>
                    <input className="form-control" value={form.auteur_nom} onChange={(e) => setForm({ ...form, auteur_nom: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Email</label>
                    <input type="email" className="form-control" value={form.auteur_email} onChange={(e) => setForm({ ...form, auteur_email: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Téléphone</label>
                    <input className="form-control" value={form.auteur_telephone} onChange={(e) => setForm({ ...form, auteur_telephone: e.target.value })} />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label fw-semibold">Encadreur *</label>
                    <input className="form-control" value={form.encadreur} onChange={(e) => setForm({ ...form, encadreur: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Filière *</label>
                    <input className="form-control" value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })} />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold">Option</label>
                    <input className="form-control" value={form.option} onChange={(e) => setForm({ ...form, option: e.target.value })} />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold">Année</label>
                    <input className="form-control" value={form.annee_academique} onChange={(e) => setForm({ ...form, annee_academique: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Photo professionnelle auteur</label>
                    <input type="file" accept="image/*" className="form-control" onChange={(e) => setForm({ ...form, photo_auteur: e.target.files?.[0] || null })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Mots-clés</label>
                    <input className="form-control" value={form.mots_cles} onChange={(e) => setForm({ ...form, mots_cles: e.target.value })} placeholder="portail captif, intranet, Django, MikroTik..." />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold">Abstract / Résumé synthétique *</label>
                    <textarea className="form-control" rows={4} value={form.resume} onChange={(e) => setForm({ ...form, resume: e.target.value })} placeholder="150 à 300 mots : objectif, méthode, résultats majeurs et apport du projet." />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Introduction</label>
                    <textarea className="form-control" rows={4} value={form.introduction} onChange={(e) => setForm({ ...form, introduction: e.target.value })} placeholder="Contexte général et intérêt du sujet." />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Problématique</label>
                    <textarea className="form-control" rows={4} value={form.problematique} onChange={(e) => setForm({ ...form, problematique: e.target.value })} placeholder="Difficulté principale résolue par le travail." />
                  </div>

                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label fw-semibold mb-0">Matériels, logiciels, outils et méthodes utilisés</label>
                      <button className="btn btn-outline-primary btn-sm" type="button" onClick={addTool}><Plus size={14} /> Ajouter une ligne</button>
                    </div>
                    <div className="table-responsive tools-editor">
                      <table className="table align-middle mb-0">
                        <thead>
                          <tr>
                            <th style={{ width: '18%' }}>Catégorie</th>
                            <th style={{ width: '22%' }}>Outil / matériel</th>
                            <th style={{ width: '14%' }}>Version</th>
                            <th>Description / rôle dans le projet</th>
                            <th style={{ width: '48px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.materiels_outils.map((tool, index) => (
                            <tr key={`tool-${index + 1}`}>
                              <td><input className="form-control form-control-sm" value={tool.categorie} onChange={(e) => updateTool(index, 'categorie', e.target.value)} placeholder="Logiciel" /></td>
                              <td><input className="form-control form-control-sm" value={tool.nom} onChange={(e) => updateTool(index, 'nom', e.target.value)} placeholder="Django" /></td>
                              <td><input className="form-control form-control-sm" value={tool.version} onChange={(e) => updateTool(index, 'version', e.target.value)} placeholder="6.x" /></td>
                              <td><input className="form-control form-control-sm" value={tool.description} onChange={(e) => updateTool(index, 'description', e.target.value)} placeholder="API REST, authentification, logique métier..." /></td>
                              <td><button className="btn btn-light btn-sm" type="button" onClick={() => removeTool(index)} aria-label="Retirer"><Trash2 size={14} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">Méthodologie complémentaire</label>
                    <textarea className="form-control" rows={3} value={form.materiels_methodes} onChange={(e) => setForm({ ...form, materiels_methodes: e.target.value })} placeholder="Décrire brièvement la démarche : analyse, conception, développement, tests, déploiement..." />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold">Résultats & discussions</label>
                    <textarea className="form-control" rows={5} value={form.resultats_discussion} onChange={(e) => setForm({ ...form, resultats_discussion: e.target.value })} placeholder="Présenter les résultats majeurs, leur interprétation et l'apport concret du projet." />
                  </div>
                  {[1, 2, 3, 4].map((number) => (
                    <div className="col-md-3" key={`result-image-${number}`}>
                      <label className="form-label fw-semibold">Image résultat {number}</label>
                      <input type="file" accept="image/*" className="form-control" onChange={(e) => setForm({ ...form, [`image_resultat_${number}`]: e.target.files?.[0] || null })} />
                    </div>
                  ))}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Mémoire complet corrigé PDF *</label>
                    <input type="file" accept=".pdf,application/pdf" className="form-control" onChange={(e) => setForm({ ...form, fichier_pdf: e.target.files?.[0] || null })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Support PowerPoint de soutenance</label>
                    <input type="file" accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="form-control" onChange={(e) => setForm({ ...form, support_presentation: e.target.files?.[0] || null })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Vidéo simulation / démonstration</label>
                    <input type="file" accept="video/*" className="form-control" onChange={(e) => setForm({ ...form, video_demo: e.target.files?.[0] || null })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Vidéo présentation étudiant</label>
                    <input type="file" accept="video/*" className="form-control" onChange={(e) => setForm({ ...form, video_presentation: e.target.files?.[0] || null })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Envoi...' : 'Soumettre'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
