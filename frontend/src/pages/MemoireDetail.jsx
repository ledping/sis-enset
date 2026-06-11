import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CreditCard, Download, FileText, Lock, Mail, Phone, PlayCircle, Trash2, UserRound } from 'lucide-react';
import api, { API_BASE_URL } from '../api';
import { useAuth } from '../contexts/useAuth';
import Spinner from '../components/Spinner';

function fileUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL.replace('/api', '')}${path}`;
}

function keywords(value) {
  if (!value) return [];
  return value.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
}

function paragraphs(value) {
  if (!value) return [];
  return value
    .split(/\n+|(?:^|\s)[0-9]+[).]\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function readingStats(memoire, tools, images) {
  const checks = [
    memoire?.resume,
    memoire?.introduction,
    memoire?.problematique,
    tools.length > 0,
    memoire?.resultats_discussion,
    images.length > 0,
    memoire?.support_presentation,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function MemoireDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [memoire, setMemoire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [premiumInfo, setPremiumInfo] = useState(null);

  useEffect(() => {
    let ignore = false;

    api.get(`/memoires/${id}/`)
      .then((response) => {
        if (!ignore) setMemoire(response.data);
      })
      .catch(() => {
        if (!ignore) setMessage('Impossible de charger le dossier du mémoire.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    let ignore = false;
    api.get('/premium/me/')
      .then((response) => {
        if (!ignore) setPremiumInfo(response.data.summary);
      })
      .catch(() => {
        if (!ignore) setPremiumInfo(null);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const tools = useMemo(() => {
    if (!memoire?.materiels_outils) return [];
    return Array.isArray(memoire.materiels_outils) ? memoire.materiels_outils : [];
  }, [memoire]);

  const canDelete = (item) => ['ADMIN', 'CHEF_DEPT'].includes(user?.role) || item?.depose_par_id === user?.id || item?.depose_par_detail?.id === user?.id;

  const download = async () => {
    try {
      const response = await api.get(`/memoires/${id}/dl/`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${memoire.titre}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      const info = await api.get('/premium/me/');
      setPremiumInfo(info.data.summary);
    } catch (error) {
      if (error.response?.status === 402) {
        setMessage(error.response.data?.detail || 'Crédit mémoire requis pour télécharger le document complet.');
      } else {
        setMessage('Téléchargement impossible.');
      }
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(`Supprimer définitivement le mémoire « ${memoire.titre} » ? Cette action retirera aussi les fichiers associés.`);
    if (!confirmed) return;

    try {
      await api.delete(`/memoires/${id}/`);
      navigate('/memoires', { replace: true });
    } catch {
      setMessage('Suppression impossible. Vérifiez vos droits.');
    }
  };

  if (loading) return <Spinner label="Chargement du dossier mémoire..." />;
  if (!memoire) {
    return message ? <div className="alert alert-warning border-0 shadow-sm">{message}</div> : null;
  }

  const keyList = keywords(memoire.mots_cles);
  const resultImages = memoire.images_resultats_urls || [];
  const resultParagraphs = paragraphs(memoire.resultats_discussion);
  const articleScore = readingStats(memoire, tools, resultImages);
  const authorPhoto = memoire.photo_auteur_url || fileUrl(memoire.photo_auteur);
  const resources = [
    { label: 'Mémoire complet corrigé', file: memoire.fichier_pdf, primary: true },
    { label: 'Support de présentation', file: memoire.support_presentation },
  ].filter((item) => item.file);

  return (
    <div className="memoire-detail-v8">
      <div className="page-title">
        <div>
          <Link to="/memoires" className="back-link"><ArrowLeft size={16} /> Retour à la bibliothèque</Link>
          <h2>Article académique généré</h2>
          <p>Présentation institutionnelle du mémoire, générée à partir des informations saisies.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-primary" type="button" onClick={() => void download()}>
            <Download size={17} /> Télécharger le mémoire
          </button>
          {canDelete(memoire) && (
            <button className="btn btn-outline-danger" type="button" onClick={() => void handleDelete()}>
              <Trash2 size={17} /> Supprimer
            </button>
          )}
        </div>
      </div>

      {message && <div className="alert alert-warning border-0 shadow-sm">{message}</div>}

      <div className="article-summary-strip">
        <div><span>Qualité de complétude</span><strong>{articleScore}%</strong></div>
        <div><span>Outils renseignés</span><strong>{tools.length}</strong></div>
        <div><span>Images résultats</span><strong>{resultImages.length}/4</strong></div>
        <div><span>Année académique</span><strong>{memoire.annee_academique}</strong></div>
      </div>

      <div className="premium-access-strip">
        <span className="premium-access-chip"><BookOpen size={15} /> Article consultable gratuitement</span>
        <span className="premium-access-chip"><Lock size={15} /> PDF complet : 1 crédit mémoire</span>
        {premiumInfo && <span className="premium-access-chip"><CreditCard size={15} /> Crédits mémoires : {premiumInfo.credits_memoires}</span>}
        <Link className="btn btn-sm btn-outline-primary ms-auto" to="/premium">Acheter des crédits</Link>
      </div>

      <article className="ieee-article ieee-article-v8 data-card">
        <header className="ieee-header article-cover">
          <div className="ieee-school">ENSET Douala · Département {memoire.departement}</div>
          <h1>{memoire.titre}</h1>
          <p className="article-subtitle">Mini-article de valorisation scientifique et technique du mémoire soutenu</p>
          <div className="ieee-author-block author-card-v8">
            <div className="profile-photo article-photo">
              {authorPhoto ? <img src={authorPhoto} alt={memoire.auteur_nom} /> : <UserRound size={34} />}
            </div>
            <div>
              <h3>{memoire.auteur_nom}</h3>
              <p>{memoire.niveau} · {memoire.filiere}{memoire.option ? ` · ${memoire.option}` : ''}</p>
              <p>Encadreur : <strong>{memoire.encadreur}</strong></p>
              <div className="article-contact">
                {memoire.auteur_email && <span><Mail size={14} /> {memoire.auteur_email}</span>}
                {memoire.auteur_telephone && <span><Phone size={14} /> {memoire.auteur_telephone}</span>}
              </div>
            </div>
          </div>
        </header>

        <section className="ieee-abstract abstract-v8">
          <h2>Abstract</h2>
          <p>{memoire.resume}</p>
          {keyList.length > 0 && (
            <p className="ieee-keywords"><strong>Index Terms—</strong>{keyList.join(', ')}.</p>
          )}
        </section>

        <div className="article-navigation-card">
          <BookOpen size={18} />
          <div>
            <strong>Plan de lecture</strong>
            <span>Introduction · Problématique · Méthodologie · Résultats · Conclusion · Livrables</span>
          </div>
        </div>

        <div className="ieee-columns article-body-v8">
          <section>
            <h2>I. Introduction</h2>
            <p>{memoire.introduction || 'Introduction non renseignée.'}</p>
          </section>

          <section>
            <h2>II. Problématique</h2>
            <p>{memoire.problematique || 'Problématique non renseignée.'}</p>
          </section>

          <section className="ieee-wide">
            <h2>III. Matériels, outils et méthodes</h2>
            {tools.length > 0 ? (
              <div className="table-responsive article-table-wrap article-table-wrap-v8">
                <table className="table article-table align-middle">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Catégorie</th>
                      <th>Matériel / outil</th>
                      <th>Version</th>
                      <th>Description / rôle dans le projet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tools.map((tool, index) => (
                      <tr key={`${tool.nom || 'outil'}-${index + 1}`}>
                        <td><span className="tool-index">{index + 1}</span></td>
                        <td>{tool.categorie || '—'}</td>
                        <td><strong>{tool.nom || '—'}</strong></td>
                        <td>{tool.version || '—'}</td>
                        <td>{tool.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Aucun matériel ou outil structuré n'a été renseigné.</p>
            )}
            {memoire.materiels_methodes && <p>{memoire.materiels_methodes}</p>}
          </section>

          <section className="ieee-wide">
            <h2>IV. Résultats et discussion</h2>
            {resultParagraphs.length > 0 ? (
              <div className="results-grid-v8">
                {resultParagraphs.map((result, index) => (
                  <div className="result-card-v8" key={`${result.slice(0, 20)}-${index + 1}`}>
                    <span>Résultat {index + 1}</span>
                    <p>{result}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>{memoire.resultats_discussion || 'Résultats non renseignés.'}</p>
            )}
            {resultImages.length > 0 && (
              <figure className={`result-mosaic result-mosaic-v8 result-mosaic-${Math.min(resultImages.length, 4)}`}>
                {resultImages.slice(0, 4).map((image, index) => (
                  <img key={image} src={image} alt={`Résultat ${index + 1}`} />
                ))}
                <figcaption>Fig. 1. Mosaïque des résultats visuels majeurs du projet.</figcaption>
              </figure>
            )}
          </section>

          <section>
            <h2>V. Conclusion</h2>
            <p>
              Ce mémoire présente une contribution structurée à la problématique étudiée. Les résultats obtenus
              montrent l'intérêt de la solution proposée et ouvrent la voie à des améliorations futures,
              notamment en matière d'industrialisation, d'extension fonctionnelle et de déploiement institutionnel.
            </p>
          </section>
        </div>
      </article>

      <div className="row g-4 mt-1">
        <div className="col-lg-6">
          <div className="card data-card h-100">
            <div className="card-header"><FileText size={17} /> Livrables du dossier</div>
            <div className="card-body d-flex flex-wrap gap-2">
              {resources.map((item) => (
                item.primary ? (
                  <button key={item.label} type="button" className="btn btn-primary" onClick={() => void download()}>
                    <Lock size={16} /> {item.label}
                  </button>
                ) : (
                  <a key={item.label} className="btn btn-outline-primary" href={fileUrl(item.file)} target="_blank" rel="noreferrer">
                    {item.label}
                  </a>
                )
              ))}
              {!resources.length && <div className="empty-state compact-empty w-100">Aucun livrable disponible.</div>}
            </div>
          </div>
        </div>
        {(memoire.video_demo || memoire.video_presentation) && (
          <div className="col-lg-6">
            <div className="card data-card h-100">
              <div className="card-header"><PlayCircle size={17} /> Vitrine multimédia</div>
              <div className="card-body d-grid gap-3">
                {memoire.video_demo && <video controls className="w-100 rounded-4" src={fileUrl(memoire.video_demo)} />}
                {memoire.video_presentation && <video controls className="w-100 rounded-4" src={fileUrl(memoire.video_presentation)} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
