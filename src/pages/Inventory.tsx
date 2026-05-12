import React, { useEffect, useState } from 'react';
import { ArrowLeft, Box } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';

// Common Gen 1 Pokemon colors if we want to use them
const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705898',
  steel: '#B7B7CE', fairy: '#D685AD',
};

export default function Inventory() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState<number[]>([]);
  const [pokemons, setPokemons] = useState<any[]>([]);
  const [pokeballs, setPokeballs] = useState<number>(0);
  const [selectedId, setSelectedId] = useState<number>(4);

  useEffect(() => {
    let unlockedIds = JSON.parse(localStorage.getItem('game_unlocked') || '[4]');
    unlockedIds = Array.from(new Set(unlockedIds.map((id: any) => parseInt(id, 10))));
    setUnlocked(unlockedIds);
    setPokeballs(parseInt(localStorage.getItem('game_pokeballs_count') || '0', 10));
    setSelectedId(parseInt(localStorage.getItem('game_pokemon_id') || '4', 10));

    const loadPokemons = async () => {
        const promises = unlockedIds.map((id: number) => 
            fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
                .then(res => res.ok ? res.json() : null)
                .catch(e => null)
        );
        try {
            const results = await Promise.all(promises);
            setPokemons(results.filter(r => r !== null));
        } catch (e) {
            console.error("Failed to load inventory pokemons", e);
        }
    };
    loadPokemons();
  }, []);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    localStorage.setItem('game_pokemon_id', id.toString());
  };

  return (
    <div className="bg-zinc-950 min-h-screen font-mono text-zinc-100 pb-12">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-3 sticky top-0 z-50 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center active:scale-95 transition-transform text-white/80">
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-lg font-bold uppercase tracking-widest">Inventory</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-4">
         <div className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3 px-2">Items</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                <div className="bg-zinc-900 rounded-xl border-2 border-zinc-800 p-3 flex flex-col items-center gap-2">
                     <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center shadow-inner relative">
                        {/* CSS Pokeball */}
                        <div className="w-8 h-8 rounded-full border-[2px] border-zinc-900 bg-white relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-500 border-b-[2px] border-zinc-900"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full border-[2px] border-zinc-900 z-10"></div>
                        </div>
                     </div>
                     <div className="text-center w-full">
                        <div className="font-bold text-[10px] uppercase tracking-wide">Pokéball</div>
                        <div className="text-zinc-400 font-black text-xs">x{pokeballs}</div>
                     </div>
                </div>
            </div>
         </div>

         <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3 px-2">My Pokémon</h2>
         <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 pb-8">
             {pokemons.map((item) => {
                 const isSelected = selectedId === item.id;
                 const primaryType = item.types[0].type.name;

                 return (
                     <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={item.id} 
                        className={`bg-zinc-900 rounded-xl p-3 flex flex-col items-center gap-2 relative overflow-hidden transition-all duration-300 border-2 active:scale-95 ${isSelected ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-zinc-800 hover:border-zinc-700'}`}
                     >
                         <div className="absolute top-0 left-0 right-0 h-16 opacity-20 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${TYPE_COLORS[primaryType] || '#ccc'}, transparent)` }}></div>
                         
                         <div className="w-full flex justify-between absolute px-2 top-2">
                           <span className="text-[9px] font-black text-zinc-500">#{item.id}</span>
                         </div>

                         <img 
                           src={item.sprites?.other?.['official-artwork']?.front_default || item.sprites?.front_default} 
                           alt={item.name} 
                           className="w-16 h-16 object-contain mt-3 drop-shadow-sm z-10"
                         />
                         
                         <div className="text-center w-full z-10">
                            <h3 className="font-black uppercase tracking-wider text-[10px] mb-1.5 truncate">{item.name}</h3>
                            <button
                                onClick={() => handleSelect(item.id)}
                                className={`w-full py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1 ${isSelected ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                            >
                               {isSelected ? 'Active' : 'Select'}
                            </button>
                         </div>
                     </motion.div>
                 )
             })}
         </div>
         {pokemons.length === 0 && (
            <div className="text-zinc-500 text-center py-10 uppercase tracking-widest font-bold text-sm bg-zinc-900 border border-zinc-800 rounded-xl">Loading...</div>
         )}
      </div>

    </div>
  );
}
