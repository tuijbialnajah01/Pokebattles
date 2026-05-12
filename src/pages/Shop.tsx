import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Coins, Check, Lock, Play } from 'lucide-react';

const SHOP_ITEMS = [
  { id: 4, name: 'Charmander', cost: 0 }, // Starter
  { id: 1, name: 'Bulbasaur', cost: 100 },
  { id: 7, name: 'Squirtle', cost: 100 },
  { id: 25, name: 'Pikachu', cost: 200 },
  { id: 94, name: 'Gengar', cost: 500 },
  { id: 143, name: 'Snorlax', cost: 500 },
  { id: 448, name: 'Lucario', cost: 800 },
  { id: 149, name: 'Dragonite', cost: 1000 },
  { id: 658, name: 'Greninja', cost: 1500 },
  { id: 150, name: 'Mewtwo', cost: 2000 },
];

export default function Shop() {
  const navigate = useNavigate();
  const [coins, setCoins] = useState(0);
  const [unlocked, setUnlocked] = useState<number[]>([4]);
  const [selectedId, setSelectedId] = useState<number>(4);

  useEffect(() => {
    const updateCoins = () => {
      const currentCoins = parseInt(localStorage.getItem('game_coins') || '0', 10);
      setCoins(currentCoins);
    };
    updateCoins();
    window.addEventListener('coins_updated', updateCoins);
    
    try {
        const storedUnlocks = JSON.parse(localStorage.getItem('game_unlocked') || '[4]');
        setUnlocked(storedUnlocks);
    } catch(e) {
        setUnlocked([4]);
    }

    const currentSelection = parseInt(localStorage.getItem('game_pokemon_id') || '4', 10);
    setSelectedId(currentSelection);
    
    return () => window.removeEventListener('coins_updated', updateCoins);
  }, []);

  const handleBuy = (item: typeof SHOP_ITEMS[0]) => {
      if (unlocked.includes(item.id)) {
          localStorage.setItem('game_pokemon_id', item.id.toString());
          setSelectedId(item.id);
          return;
      }
      
      if (coins >= item.cost) {
          const newCoins = coins - item.cost;
          setCoins(newCoins);
          localStorage.setItem('game_coins', newCoins.toString());
          
          const newUnlocked = [...unlocked, item.id];
          setUnlocked(newUnlocked);
          localStorage.setItem('game_unlocked', JSON.stringify(newUnlocked));
          
          // Auto select on unlock
          localStorage.setItem('game_pokemon_id', item.id.toString());
          setSelectedId(item.id);
      }
  };

  return (
    <div className="bg-zinc-950 min-h-screen font-mono text-zinc-100 pb-12">
      {/* Header */}
      <div className="p-6 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center active:scale-95 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold uppercase tracking-widest">Poké Shop</h1>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2 shadow-inner">
           <Coins size={16} className="text-yellow-400" />
           <span className="text-white font-bold">{coins}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-8">
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
             {SHOP_ITEMS.map((item) => {
                 const isUnlocked = unlocked.includes(item.id);
                 const isSelected = selectedId === item.id;
                 const canAfford = coins >= item.cost;
                 
                 return (
                     <div key={item.id} className={`bg-zinc-900 rounded-2xl border-2 p-4 flex flex-col items-center gap-4 transition-all ${isSelected ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] scale-[1.02]' : isUnlocked ? 'border-zinc-700 hover:border-zinc-500' : 'border-zinc-800 opacity-80'}`}>
                         <div className="w-24 h-24 bg-zinc-800 rounded-xl flex items-center justify-center relative overflow-hidden group">
                            <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${item.id}.png`} alt={item.name} className={`w-32 h-32 object-contain ${!isUnlocked && 'brightness-0 opacity-50'} transition-all`} />
                         </div>
                         <div className="text-center w-full">
                            <div className="font-bold text-sm uppercase tracking-wide mb-1">{item.name}</div>
                            {isUnlocked ? (
                                <button
                                  onClick={() => handleBuy(item)}
                                  className={`w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${isSelected ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                                >
                                    {isSelected ? <><Check size={14} /> Selected</> : 'Select'}
                                </button>
                            ) : (
                                <button
                                  onClick={() => handleBuy(item)}
                                  disabled={!canAfford}
                                  className={`w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${canAfford ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                                >
                                    {canAfford ? <><Coins size={14} /> {item.cost}</> : <><Lock size={14} /> {item.cost}</>}
                                </button>
                            )}
                         </div>
                     </div>
                 )
             })}
         </div>

         {/* Floating Action for selected */}
         <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6 pointer-events-none">
             <button onClick={() => navigate('/matchmaking')} className="pointer-events-auto bg-red-600 hover:bg-red-500 px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-red-900/40 active:scale-95 transition-all text-white">
                 <Play size={20} fill="currentColor" /> Play Game
             </button>
         </div>
      </div>
    </div>
  );
}
