import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onAuthenticated: () => void;
}

export default function PasswordGate({ onAuthenticated }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: 'trongtb90@gmail.com',
      password,
    });

    if (authError) {
      setError('Sai mật khẩu. Vui lòng thử lại.');
    } else {
      onAuthenticated();
    }
    setLoading(false);
  };

  return (
    <div className="password-gate">
      <form className="password-form" onSubmit={handleSubmit}>
        <h1>🌳 Họ hàng của Nam</h1>
        <input
          type="password"
          placeholder="Nhập mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
