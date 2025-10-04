import { useState, useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './components/auth/LoginPage';
import './App.css';

function App() {
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
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

  // Show main app if authenticated
  return (
    <div className="App">
      <MainLayout
        currentDocumentId={currentDocumentId}
        onDocumentSelect={setCurrentDocumentId}
        user={user}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;
