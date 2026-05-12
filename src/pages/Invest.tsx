import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Coins, TrendingUp, ChevronUp } from 'lucide-react';

export default function Invest() {
  const navigate = useNavigate();
  const [coins, setCoins] = useState(0);
  const [investLevel, setInvestLevel] = useState(0);
  const MAX_LEVEL = 50;

  useEffect(() => {
    const updateCoins = () => {
       setCoins(parseInt(localStorage.getItem('game_coins') || '0', 10));
    };
    updateCoins();
    window.addEventListener('coins_updated', updateCoins);
    
    const currentInvestLevel = parseInt(localStorage.getItem('game_invest_level') || '0', 10);
    setInvestLevel(currentInvestLevel);
    
    return () => {
      window.removeEventListener('coins_updated', updateCoins);
    };
  }, []);

  // cost = 100 * (1.5 ^ level) or similar
  const cost = 100 + investLevel * 150 + Math.floor(Math.pow(1.2, investLevel) * 10);
  const currentRate = investLevel;

  const handleInvest = () => {
    if (investLevel < MAX_LEVEL && coins >= cost) {
      const newCoins = coins - cost;
      const newLevel = investLevel + 1;
      
      setCoins(newCoins);
      setInvestLevel(newLevel);
      
      localStorage.setItem('game_coins', newCoins.toString());
      localStorage.setItem('game_invest_level', newLevel.toString());
      localStorage.setItem('game_passive_rate', newLevel.toString());
    }
  };

  return (
    <div className="bg-zinc-950 min-h-screen font-mono text-zinc-100 flex flex-col">
      {/* Header */}
      <div className="p-6 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center active:scale-95 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold uppercase tracking-widest">Investments</h1>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2 shadow-inner">
           <Coins size={16} className="text-yellow-400" />
           <span className="text-white font-bold">{coins}</span>
        </div>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto px-6 mt-8">
         <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-2xl flex items-center justify-center border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                 <TrendingUp size={32} />
              </div>
              <div className="flex-1">
                 <h2 className="text-lg font-bold uppercase tracking-wide">Coin Factory</h2>
                 <p className="text-zinc-500 text-xs mt-1">Earn coins passively every second, even offline!</p>
              </div>
            </div>
            
            <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 flex flex-col items-center">
               <span className="text-zinc-500 text-xs font-bold uppercase mb-2">Current Income</span>
               <div className="text-3xl font-black text-green-400 flex items-center gap-2">
                 +{currentRate} <span className="text-sm text-green-500/70">/ sec</span>
               </div>
            </div>

            <div className="flex justify-between items-end mt-2">
               <div className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Upgrade to +{currentRate + 1}/s</div>
               <span className="text-zinc-600 font-bold uppercase text-[10px]">Level {investLevel} / {MAX_LEVEL}</span>
            </div>

            <button
               onClick={handleInvest}
               disabled={investLevel >= MAX_LEVEL || coins < cost}
               className={`w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                 investLevel >= MAX_LEVEL 
                   ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                   : coins >= cost 
                     ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30 active:scale-95' 
                     : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
               }`}
            >
               {investLevel >= MAX_LEVEL ? (
                 'Max Level Reached'
               ) : (
                 <>
                   <ChevronUp size={20} />
                   Invest <Coins size={16} className={coins >= cost ? 'text-yellow-400' : 'text-zinc-600'} /> {cost}
                 </>
               )}
            </button>
         </div>
      </div>
    </div>
  );
}
