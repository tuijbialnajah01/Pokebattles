import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Gamepad2, Play, Coins, Star, Zap, TrendingUp, LogOut } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({ coins: 0, level: 1, exp: 0 });
  const [username, setUsername] = useState('Trainer');
  
  useEffect(() => {
    const updateStats = () => {
       const c = parseInt(localStorage.getItem('game_coins') || '0', 10);
       const e = parseInt(localStorage.getItem('game_exp') || '0', 10);
       setStats({ coins: c, level: Math.floor(e / 1000) + 1, exp: e });
    };
    updateStats();

    const storedUsername = localStorage.getItem('game_username');
    if (storedUsername) setUsername(storedUsername);
    
    window.addEventListener('coins_updated', updateStats);
    return () => window.removeEventListener('coins_updated', updateStats);
  }, []);

  const handleLogout = () => {
      localStorage.removeItem('game_username');
      navigate('/login');
  };

  return (
    <div className="bg-zinc-950 min-h-screen flex flex-col items-center justify-center font-mono px-6 py-12 text-zinc-100 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black">
      
      <div className="absolute top-6 right-6 flex gap-3 flex-col sm:flex-row items-end">
        <div className="flex gap-3">
          <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
             <Coins size={16} className="text-yellow-400" />
             <span className="text-white font-bold">{stats.coins}</span>
          </div>
          <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg relative overflow-hidden">
             <div className="absolute bottom-0 left-0 h-1 bg-blue-500" style={{width: `${(stats.exp % 1000) / 10}%`}}></div>
             <Star size={16} className="text-blue-400" />
             <span className="text-white font-bold uppercase text-sm tracking-widest">Lv. {stats.level}</span>
          </div>
        </div>
        <button 
           onClick={handleLogout}
           className="mt-2 sm:mt-0 text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800"
        >
           <LogOut size={12} /> Logout
        </button>
      </div>

      <div className="text-center mb-10 w-full max-w-sm mt-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-500/10 text-red-500 mb-6 border border-red-500/20">
          <Gamepad2 size={40} />
        </div>
        <h1 className="text-5xl font-black text-white tracking-tight mb-2 uppercase">
          Pocket<br/><span className="text-red-500">Brawl</span>
        </h1>
        <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Welcome back, <span className="text-white">{username}</span></p>
      </div>

    <div className="w-full max-w-xs space-y-4">
      <div className="space-y-4">
        <button onClick={() => {
            navigate('/matchmaking');
          }} 
          className="w-full bg-red-600 hover:bg-red-500 transition-colors py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-lg shadow-lg shadow-red-900/20 active:scale-95 uppercase tracking-widest">
          <Play fill="currentColor" size={18} />
          Play Now
        </button>
        
        <button onClick={() => navigate('/shop')} 
          className="w-full bg-zinc-800 hover:bg-zinc-700 transition-colors py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-md shadow-lg active:scale-95 uppercase tracking-widest text-zinc-300">
          <Coins size={18} />
          Poké Shop
        </button>
        
        <button onClick={() => navigate('/upgrades')} 
          className="w-full bg-blue-900/50 hover:bg-blue-800/80 border border-blue-500/30 transition-colors py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-md shadow-lg active:scale-95 uppercase tracking-widest text-blue-300">
          <Zap size={18} className="text-blue-400" />
          Upgrades
        </button>

        <button onClick={() => navigate('/invest')} 
          className="w-full bg-green-900/50 hover:bg-green-800/80 border border-green-500/30 transition-colors py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-md shadow-lg active:scale-95 uppercase tracking-widest text-green-300">
          <TrendingUp size={18} className="text-green-400" />
          Invest
        </button>
      </div>
    </div>

    </div>
  );
}
