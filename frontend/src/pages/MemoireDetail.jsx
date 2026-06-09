import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText, Mail, Phone, PlayCircle, UserRound } from 'lucide-react';
import api, { API_BASE_URL } from '../api';
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

export default function MemoireDetail() {
  const { id } = useParams();
  const [memoire, setMemoire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get(`/memoires/${id}/`)
      .then((response) => setMemoire(response.data))
      .catch(() => setMessage('Impossible de charger le dossier du mémoire.'))
      .finally(() => setLoading(false));
  }, [id]);

  const download = async () => {
    const response = await api.get(`/memoires/${id}/dl/`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${memoire.titre}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const tools = useMemo(() => {
    if (!memoire?.materiels_outils) return [];
    return Array.isArray(memoire.materiels_outils) ? memoire.materiels_outils : [];
  }, [memoire]);

  if (loading) return <Spinner label="Chargement du dossier mémoire..." />;
  if (message) return <div className="alert alert-warning border-0 shadow-sm">{message}</div>;
  if (!memoire) return null;

  const keyList = keywords(memoire.mots_cles);
  const resultImages = memoire.images_resultats_urls || [];
  const resources = [
    { label: 'Mémoire complet corrigé', file: memoire.fichier_pdf, primary: true },
    { label: 'Support de présentation', file: memoire.support_presentation },
  ].filter((item) => item.file);

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Résumé académique généré</h2>
          <p>Présentation automatique du mémoire sous forme de mini-article inspiré du style IEEE.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => void download()}>
          <Download size={17} /> Télécharger le mémoire
        </button>
      </div>

      <article className="ieee-article data-card">
        <header className="ieee-header">
          <div className="ieee-school">ENSET Douala · Département {memoire.departement}</div>
          <h1>{memoire.titre}</h1>
          <div className="ieee-author-block">
            <div className="profile-photo article-photo">
              {memoire.photo_auteur_url ? <img src={memoire.photo_auteur_url} alt={memoire.auteur_nom} /> : <UserRound size={34} />}
            </div>
            <div>
              <h3>{memoire.auteur_nom}</h3>
              <p>{memoire.niveau} · {memoire.filiere}{memoire.option ? ` · ${memoire.option}` : ''} · {memoire.annee_academique}</p>
              <p>Encadreur : <strong>{memoire.encadreur}</strong></p>
              <div className="article-contact">
                {memoire.auteur_email && <span><Mail size={14} /> {memoire.auteur_email}</span>}
                {memoire.auteur_telephone && <span><Phone size={14} /> {memoire.auteur_telephone}</span>}
              </div>
            </div>
          </div>
        </header>

        <section className="ieee-abstract">
          <h2>Abstract</h2>
          <p>{memoire.resume}</p>
          {keyList.length > 0 && (
            <p className="ieee-keywords"><strong>Index Terms—</strong>{keyList.join(', ')}.</p>
          )}
        </section>

        <div className="ieee-columns">
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
              <div className="table-responsive article-table-wrap">
                <table className="table article-table align-middle">
                  <thead>
                    <tr>
                      <th>Catégorie</th>
                      <th>Matériel / outil</th>
                      <th>Version</th>
                      <th>Description / rôle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tools.map((tool, index) => (
                      <tr key={`${tool.nom || 'outil'}-${index + 1}`}>
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
            <p>{memoire.resultats_discussion || 'Résultats non renseignés.'}</p>
            {resultImages.length > 0 && (
              <figure className={`result-mosaic result-mosaic-${Math.min(resultImages.length, 4)}`}>
                {resultImages.slice(0, 4).map((image, index) => (
                  <img key={image} src={image} alt={`Résultat ${index + 1}`} />
                ))}
                <figcaption>Fig. 1. Mosaïque des résultats visuels du projet.</figcaption>
              </figure>
            )}
          </section>

          <section>
            <h2>V. Conclusion</h2>
            <p>
              Ce travail apporte une réponse structurée à la problématique identifiée en combinant
              conception, implémentation et validation expérimentale. Les livrables associés permettent
              de conserver une trace exploitable du mémoire et de valoriser les résultats obtenus.
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
                <a key={item.label} className={item.primary ? 'btn btn-primary' : 'btn btn-outline-primary'} href={fileUrl(item.file)} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ))}
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
