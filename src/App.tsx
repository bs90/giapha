import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import PasswordGate from './components/PasswordGate';
import FamilyCanvas from './components/FamilyCanvas';
import './App.css';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="password-gate">
        <p style={{ color: 'white', fontSize: '1.2rem' }}>Đang tải...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return <FamilyCanvas />;
}
