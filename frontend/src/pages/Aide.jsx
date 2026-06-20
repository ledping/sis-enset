import { BookOpen, CreditCard, FileText, HelpCircle, MessageSquareText, PhoneCall, ShieldCheck, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

const guideSections = [
  {
    icon: FileText,
    title: 'Ressources pédagogiques',
    text: 'Utilisez les filtres par niveau, filière TIC/II et type de document pour trouver rapidement les cours, TD, TP, examens et supports validés.',
    actions: ['Rechercher par mot-clé', 'Filtrer par niveau', 'Télécharger selon vos droits'],
    link: '/documents',
    label: 'Ouvrir les ressources',
  },
  {
    icon: BookOpen,
    title: 'Mémoires archivés',
    text: 'Les articles et fiches de mémoires sont consultables gratuitement. Le téléchargement du PDF complet peut nécessiter un crédit mémoire pour les étudiants.',
    actions: ['Lire l’article', 'Consulter les détails', 'Débloquer le PDF si nécessaire'],
    link: '/memoires',
    label: 'Voir les mémoires',
  },
  {
    icon: MessageSquareText,
    title: 'Messagerie interne',
    text: 'La messagerie permet les textes, fichiers, images, vocaux, photos prises en direct et appels audio/vidéo entre utilisateurs.',
    actions: ['Démarrer une discussion', 'Envoyer un fichier', 'Appeler un contact'],
    link: '/messages',
    label: 'Ouvrir la messagerie',
  },
  {
    icon: CreditCard,
    title: 'Accès premium étudiant',
    text: 'Chaque étudiant dispose de 3 téléchargements gratuits par mois. Au-delà, les crédits documents ou mémoires permettent de poursuivre les téléchargements.',
    actions: ['Acheter un pack', 'Soumettre une preuve', 'Télécharger le reçu après validation'],
    link: '/premium',
    label: 'Voir mes crédits',
  },
  {
    icon: Wifi,
    title: 'Accès réseau et portail captif',
    text: 'Le portail captif contrôle l’entrée dans le réseau local. L’application contrôle ensuite les droits selon le rôle : étudiant, enseignant, chef ou administrateur.',
    actions: ['Se connecter au Wi-Fi', 'S’authentifier', 'Accéder à la plateforme'],
    link: '/dashboard',
    label: 'Retour au tableau de bord',
  },
  {
    icon: ShieldCheck,
    title: 'Bonnes pratiques',
    text: 'Ne partagez pas vos identifiants, évitez les fichiers suspects, signalez les anomalies et déconnectez-vous après usage sur un appareil partagé.',
    actions: ['Mot de passe personnel', 'Fichiers sûrs', 'Signalement rapide'],
    link: '/support',
    label: 'Signaler un problème',
  },
];

function roleAdvice(role) {
  if (role === 'ETUDIANT') {
    return 'Votre espace est orienté consultation, téléchargement contrôlé, messagerie, mémoires et suivi de vos crédits.';
  }
  if (role === 'ENSEIGNANT') {
    return 'Votre espace est orienté dépôt de supports pédagogiques, consultation institutionnelle, collaboration et échanges avec les apprenants.';
  }
  return 'Votre espace permet la supervision, la validation, le support, les sauvegardes et le suivi global de l’exploitation.';
}

export default function Aide() {
  const { user } = useAuth();
  const role = user?.role;
  const visibleSections = guideSections.filter((item) => role !== 'ENSEIGNANT' || item.title !== 'Accès premium étudiant');

  return (
    <div className="help-page v11-page">
      <div className="v11-hero">
        <div>
          <span className="eyebrow">Guide utilisateur</span>
          <h2>Aide et prise en main de SIS ENSET</h2>
          <p>{roleAdvice(role)}</p>
        </div>
        <Link className="btn btn-primary" to="/support"><HelpCircle size={17} /> Contacter le support</Link>
      </div>

      <div className="v11-guide-grid">
        {visibleSections.map(({ icon: Icon, title, text, actions, link, label }) => (
          <div className="v11-guide-card" key={title}>
            <div className="v11-guide-icon"><Icon size={22} /></div>
            <h3>{title}</h3>
            <p>{text}</p>
            <ul>
              {actions.map((action) => <li key={action}>{action}</li>)}
            </ul>
            <Link className="btn btn-sm btn-outline-primary" to={link}>{label}</Link>
          </div>
        ))}
      </div>

      <div className="v11-info-strip">
        <PhoneCall size={20} />
        <div>
          <strong>Appels audio/vidéo</strong>
          <span>Sur smartphone, les appels WebRTC nécessitent idéalement une adresse HTTPS reconnue. En HTTP local, certaines caméras ou micros peuvent être limités par le navigateur.</span>
        </div>
      </div>
    </div>
  );
}
