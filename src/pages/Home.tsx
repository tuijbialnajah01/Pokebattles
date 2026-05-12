import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Gamepad2, Play, Coins, Star, Zap, TrendingUp, LogOut, Swords, User, Map, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Home() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({ coins: 0, level: 1, exp: 0 });
  const [username, setUsername] = useState('Trainer');
  const [pokemon, setPokemon] = useState<any>(null);
  
  useEffect(() => {
    const updateStats = () => {
       const c = parseFloat(localStorage.getItem('game_coins') || '0');
       const e = parseInt(localStorage.getItem('game_exp') || '0', 10);
       setStats({ coins: Math.floor(c), level: Math.floor(e / 1000) + 1, exp: e });
    };
    updateStats();

    const storedUsername = localStorage.getItem('game_username');
    if (storedUsername) setUsername(storedUsername);

    const loadPokemon = async () => {
        try {
            const pId = localStorage.getItem('game_pokemon_id') || '4'; // default charmander
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pId}`);
            if (res.ok) {
                const data = await res.json();
                setPokemon({
                    name: data.name,
                    spriteUrl: data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default,
                    types: data.types.map((t: any) => t.type.name)
                });
            }
        } catch(e) {
            console.error("Failed to load pokemon", e);
        }
    };
    loadPokemon();
    
    window.addEventListener('coins_updated', updateStats);
    return () => window.removeEventListener('coins_updated', updateStats);
  }, []);

  const handleLogout = () => {
      localStorage.removeItem('game_username');
      navigate('/login');
  };

  return (
    <div className="bg-zinc-950 min-h-screen flex flex-col items-center justify-center font-mono p-6 text-zinc-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black overflow-hidden relative">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
        <div className="flex gap-3">
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-xl">
             <Coins size={16} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
             <span className="text-white font-black">{stats.coins}</span>
          </div>
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-xl relative overflow-hidden group">
             <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-1000" style={{width: `${(stats.exp % 1000) / 10}%`}}></div>
             <Star size={16} className="text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
             <span className="text-white font-black uppercase tracking-widest text-sm">Lv. {stats.level}</span>
          </div>
        </div>
        
        <button 
           onClick={handleLogout}
           className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-zinc-900/50 backdrop-blur-md px-3 sm:px-4 py-3 rounded-2xl border border-zinc-800 active:scale-95"
        >
           <LogOut size={14} /> <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 mt-8 md:mt-12 z-10 relative">
        
        {/* Left Stats / Pokemon View */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
           <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-red-500/10 text-red-500 mb-3 border border-red-500/20 text-[10px] font-bold uppercase tracking-widest shadow-inner">
             Welcome, {username}
           </div>
           
           <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-6 uppercase leading-[0.9] drop-shadow-xl">
             Pokemon<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Battle Ground</span>
           </h1>
           
           {/* Current Pokemon Display */}
           <div className="relative group w-full max-w-[240px]">
             <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-[40px] group-hover:bg-blue-500/20 transition-all"></div>
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-5 relative overflow-hidden flex flex-col items-center"
             >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
                <div className="absolute -inset-4 bg-gradient-to-b from-transparent via-zinc-800/10 to-transparent pointer-events-none"></div>
                
                {pokemon ? (
                   <>
                     <span className="absolute top-3 left-3 text-[9px] font-black uppercase text-zinc-500 tracking-widest">Active Ally</span>
                     <motion.img 
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        src={pokemon.spriteUrl} 
                        className="w-32 h-32 drop-shadow-[0_15px_15px_rgba(0,0,0,0.5)] z-10 object-contain"
                        alt={pokemon.name}
                     />
                     <div className="mt-2 flex flex-col items-center relative z-10 w-full">
                        <h3 className="text-lg font-black uppercase tracking-wide text-white drop-shadow-md">{pokemon.name}</h3>
                        <div className="flex gap-1 mt-1">
                           {pokemon.types.map((t: string) => (
                             <span key={t} className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-zinc-700/50 bg-zinc-800/50 text-zinc-300 backdrop-blur-sm">
                               {t}
                             </span>
                           ))}
                        </div>
                     </div>
                   </>
                ) : (
                   <div className="w-32 h-32 flex items-center justify-center">
                     <div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-zinc-600 animate-spin"></div>
                   </div>
                )}
             </motion.div>
           </div>
        </div>
        
        {/* Right Menu Grid */}
        <div className="flex-1 w-full max-w-sm flex flex-col gap-2">
           {/* Primary Action */}
           <button onClick={() => navigate('/matchmaking')} 
             className="group relative w-full overflow-hidden bg-red-600 hover:bg-red-500 transition-all rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 font-black text-lg shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:shadow-[0_0_40px_rgba(220,38,38,0.5)] active:scale-95 uppercase tracking-widest border border-red-500/50">
             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
             <Play fill="currentColor" size={20} className="drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
             <span className="drop-shadow-md text-base">Play Now</span>
           </button>
           
           <div className="grid grid-cols-2 gap-2">
             <button onClick={() => navigate('/inventory')} 
               className="group relative bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-lg active:scale-95">
               <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                 <Map size={16} className="text-purple-400" />
               </div>
               <span className="font-bold uppercase text-[9px] tracking-widest text-zinc-300 group-hover:text-white transition-colors">Inventory</span>
             </button>

             <button onClick={() => navigate('/shop')} 
               className="group relative bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-lg active:scale-95">
               <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                 <Coins size={16} className="text-yellow-400" />
               </div>
               <span className="font-bold uppercase text-[9px] tracking-widest text-zinc-300 group-hover:text-white transition-colors">Poké Shop</span>
             </button>
             
             <button onClick={() => navigate('/upgrades')} 
               className="group relative bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-lg active:scale-95">
               <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                 <TrendingUp size={16} className="text-blue-400" />
               </div>
               <span className="font-bold uppercase text-[9px] tracking-widest text-zinc-300 group-hover:text-white transition-colors">My Stats</span>
             </button>

             <button onClick={() => navigate('/invest')} 
               className="group relative bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-lg active:scale-95">
               <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                 <TrendingUp size={16} className="text-emerald-400" />
               </div>
               <span className="font-bold uppercase text-[9px] tracking-widest text-zinc-300 group-hover:text-white transition-colors">Invest</span>
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
