import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Map } from 'lucide-react';

export default function Matchmaking() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Looking for Wild Pokemon...');
  const [opponent, setOpponent] = useState<{name: string, sprite: string, type: string} | null>(null);

  useEffect(() => {
    let timer: any;
    
    const findOpponent = () => {
      const myIdLocal = parseInt(localStorage.getItem('game_pokemon_id') || '4', 10);
      let oppId = Math.floor(Math.random() * 151) + 1;
      while (oppId === myIdLocal) {
          oppId = Math.floor(Math.random() * 151) + 1;
      }
      
      fetch(`https://pokeapi.co/api/v2/pokemon/${oppId}`)
        .then(res => res.json())
        .then(data => {
          setOpponent({ 
             name: data.name, 
             sprite: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
             type: data.types[0].type.name
          });
          setStatus('Wild Pokemon Appeared!');
          localStorage.setItem('game_opponent_id', oppId.toString());
          
          timer = setTimeout(() => {
             navigate('/game');
          }, 3500);
        })
        .catch(err => {
            console.error("Matchmaking error", err);
            navigate('/game');
        });
    };
    
    timer = setTimeout(findOpponent, 1500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="bg-zinc-950 min-h-screen flex flex-col items-center justify-center font-mono p-6 text-white text-center">
      <div className="w-full max-w-sm flex flex-col items-center">
        {!opponent ? (
          <>
            <div className="w-24 h-24 rounded-full border-4 border-zinc-800 border-t-red-500 animate-spin mb-8"></div>
            <h2 className="text-2xl font-black uppercase tracking-widest text-zinc-300 animate-pulse">{status}</h2>
            <p className="text-zinc-500 mt-4 text-sm flex items-center justify-center gap-2">
              <Search size={16} /> Scanning tall grass...
            </p>
          </>
        ) : (
          <div className="animate-in zoom-in fade-in duration-500 flex flex-col items-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
              <img src={opponent.sprite} alt={opponent.name} className="w-48 h-48 object-contain relative z-10 drop-shadow-2xl" />
            </div>
            
            <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-2">{status}</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mt-6 w-full relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2"></div>
              <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest mb-1">A wild</p>
              <p className="text-4xl font-black mt-1 text-red-500 uppercase tracking-tighter drop-shadow-sm">{opponent.name}</p>
              <p className="text-zinc-400 text-xs uppercase mt-3 font-bold bg-zinc-950 inline-block px-4 py-1.5 rounded-lg border border-zinc-800 shadow-inner">{opponent.type} type</p>
            </div>
            <p className="text-zinc-500 mt-8 text-xs flex items-center justify-center gap-2 font-bold uppercase tracking-widest">
              <Map size={16} /> Entering battle...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
