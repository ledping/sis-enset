import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import RegisterStudent from './pages/RegisterStudent';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Memoires from './pages/Memoires';
import MemoireDetail from './pages/MemoireDetail';
import Recherche from './pages/Recherche';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Sessions from './pages/Sessions';
import Validations from './pages/Validations';
import Premium from './pages/Premium';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/inscription-etudiant" element={<RegisterStudent />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/memoires" element={<Memoires />} />
            <Route path="/memoires/:id" element={<MemoireDetail />} />
            <Route path="/recherche" element={<Recherche />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/premium" element={<ProtectedRoute roles={["ADMIN", "CHEF_DEPT", "ETUDIANT"]}><Premium /></ProtectedRoute>} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/validations" element={<ProtectedRoute roles={["ADMIN", "CHEF_DEPT"]}><Validations /></ProtectedRoute>} />
            <Route path="/sessions" element={<ProtectedRoute roles={["ADMIN", "CHEF_DEPT"]}><Sessions /></ProtectedRoute>} />
            <Route path="/utilisateurs" element={<ProtectedRoute roles={["ADMIN"]}><Users /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
