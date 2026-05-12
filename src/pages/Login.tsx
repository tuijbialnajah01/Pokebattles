import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', username.toLowerCase());
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.password === password) {
          // Success
          localStorage.setItem('game_username', userData.username);
          if (userData.starter) localStorage.setItem('game_pokemon_id', userData.starter.toString());
          if (userData.coins !== undefined) localStorage.setItem('game_coins', userData.coins.toString());
          if (userData.exp !== undefined) localStorage.setItem('game_exp', userData.exp.toString());
          if (userData.unlocked) localStorage.setItem('game_unlocked', JSON.stringify(userData.unlocked));
          if (userData.pokeballs !== undefined) localStorage.setItem('game_pokeballs_count', userData.pokeballs.toString());
          
          if (userData.speedLevel !== undefined) localStorage.setItem('game_speed_level', userData.speedLevel.toString());
          if (userData.attackLevel !== undefined) localStorage.setItem('game_attack_level', userData.attackLevel.toString());
          if (userData.healthLevel !== undefined) localStorage.setItem('game_health_level', userData.healthLevel.toString());
          if (userData.defenseLevel !== undefined) localStorage.setItem('game_defense_level', userData.defenseLevel.toString());
          if (userData.investLevel !== undefined) localStorage.setItem('game_invest_level', userData.investLevel.toString());
          if (userData.passiveRate !== undefined) localStorage.setItem('game_passive_rate', userData.passiveRate.toString());
          
          navigate('/');
        } else {
          setError('Incorrect password');
        }
      } else {
        setError('User not found');
      }
    } catch (err: any) {
      setError(err.message || 'Error logging in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950 min-h-screen font-mono text-zinc-100 flex flex-col items-center justify-center p-6">
      <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-black uppercase tracking-widest text-center mb-2">Login</h1>
        <p className="text-zinc-500 text-xs text-center mb-8 uppercase tracking-widest">Enter your credentials</p>

        {error && <div className="bg-red-500/20 text-red-500 border border-red-500/50 rounded-lg p-3 text-sm mb-4">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="trainer_red"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all text-white font-black uppercase tracking-widest py-4 rounded-xl mt-4 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-zinc-500 text-sm">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="text-red-400 font-bold hover:underline">
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
