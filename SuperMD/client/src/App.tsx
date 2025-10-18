import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './components/auth/LoginPage';
import './App.css';

// Wrapper component to handle URL parameters
function DocumentRoute({ user, onLogout }: { user: any; onLogout: () => void }) {
  const { documentId } = useParams<{ documentId?: string }>();
  const navigate = useNavigate();

  const handleDocumentSelect = (id: string | null) => {
    if (id) {
      navigate(`/doc/${id}`);
    } else {
      navigate('/');
    }
  };

  return (
    <MainLayout
      currentDocumentId={documentId || null}
      onDocumentSelect={handleDocumentSelect}
      user={user}
      onLogout={onLogout}
    />
  );
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (userData: any, authToken: string) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user || !token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main app with routing if authenticated
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Home route - no document selected */}
          <Route path="/" element={<DocumentRoute user={user} onLogout={handleLogout} />} />

          {/* Document route - specific document selected */}
          <Route path="/doc/:documentId" element={<DocumentRoute user={user} onLogout={handleLogout} />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
