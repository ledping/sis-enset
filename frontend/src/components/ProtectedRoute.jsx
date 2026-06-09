import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import Spinner from './Spinner';

export default function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner label="Chargement de la session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger shadow-sm border-0">
          Accès refusé : votre profil ne permet pas d’ouvrir cette section.
        </div>
      </div>
    );
  }

  return children;
}
