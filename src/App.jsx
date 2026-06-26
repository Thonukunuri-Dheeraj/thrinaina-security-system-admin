import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { isAuthenticated } from './services/api';

// ProtectedRoute for Admin Dashboard
function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function AppContent() {
  const isAuth = isAuthenticated();

  return (
    <div className="flex flex-col min-h-screen bg-security-bg text-slate-100 selection:bg-security-gold selection:text-security-bg">
      <main className="flex-grow">
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} 
          />
          <Route 
            path="*" 
            element={<Navigate to={isAuth ? "/dashboard" : "/login"} replace />} 
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
