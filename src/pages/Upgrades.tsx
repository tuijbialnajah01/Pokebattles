import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Coins, Zap, ChevronUp, Sword, Heart, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const UPGRADE_TYPES = [
  { id: 'speed', title: 'Movement Speed', description: 'Dodge faster and outmaneuver!', icon: Zap, theme: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]', bar: 'bg-blue-500', barShadow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]', btn: 'bg-blue-600 hover:bg-blue-500', btnShadow: 'shadow-blue-900/30' }, storageKey: 'game_speed_level', maxLevel: 10, baseCost: 50, costMult: 50 },
  { id: 'attack', title: 'Attack Damage', description: 'Hit harder and deal more damage!', icon: Sword, theme: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]', bar: 'bg-red-500', barShadow: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]', btn: 'bg-red-600 hover:bg-red-500', btnShadow: 'shadow-red-900/30' }, storageKey: 'game_attack_level', maxLevel: 10, baseCost: 100, costMult: 100 },
  { id: 'health', title: 'Health Points', description: 'Increase your maximum HP!', icon: Heart, theme: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]', bar: 'bg-emerald-500', barShadow: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]', btn: 'bg-emerald-600 hover:bg-emerald-500', btnShadow: 'shadow-emerald-900/30' }, storageKey: 'game_health_level', maxLevel: 10, baseCost: 75, costMult: 75 },
  { id: 'defense', title: 'Shield Defense', description: 'Take less damage from attacks!', icon: Shield, theme: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30', shadow: 'shadow-[0_0_15px_rgba(99,102,241,0.2)]', bar: 'bg-indigo-500', barShadow: 'shadow-[0_0_10px_rgba(99,102,241,0.5)]', btn: 'bg-indigo-600 hover:bg-indigo-500', btnShadow: 'shadow-indigo-900/30' }, storageKey: 'game_defense_level', maxLevel: 10, baseCost: 80, costMult: 80 },
];

export default function Upgrades() {
  const navigate = useNavigate();
  const [coins, setCoins] = useState(0);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  useEffect(() => {
    const updateCoins = () => {
      const currentCoins = parseInt(localStorage.getItem('game_coins') || '0', 10);
      setCoins(currentCoins);
    };
    updateCoins();
    window.addEventListener('coins_updated', updateCoins);
    
    const initialLevels: Record<string, number> = {};
    UPGRADE_TYPES.forEach(u => {
        initialLevels[u.id] = parseInt(localStorage.getItem(u.storageKey) || '0', 10);
    });
    setLevels(initialLevels);
    
    return () => window.removeEventListener('coins_updated', updateCoins);
  }, []);

  const handleUpgrade = (upgradeConfig: typeof UPGRADE_TYPES[0]) => {
    const currentLevel = levels[upgradeConfig.id] || 0;
    const cost = upgradeConfig.baseCost + currentLevel * upgradeConfig.costMult;

    if (currentLevel < upgradeConfig.maxLevel && coins >= cost) {
      const newCoins = coins - cost;
      const newLevel = currentLevel + 1;
      
      setCoins(newCoins);
      setLevels(prev => ({ ...prev, [upgradeConfig.id]: newLevel }));
      
      localStorage.setItem('game_coins', newCoins.toString());
      localStorage.setItem(upgradeConfig.storageKey, newLevel.toString());
      
      setAnimatingId(upgradeConfig.id);
      setTimeout(() => setAnimatingId(null), 500);
    }
  };

  return (
    <div className="bg-zinc-950 min-h-screen font-mono text-zinc-100 flex flex-col pb-12">
      {/* Header */}
      <div className="p-6 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center active:scale-95 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold uppercase tracking-widest">Upgrades</h1>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2 shadow-inner">
           <Coins size={16} className="text-yellow-400" />
           <span className="text-white font-bold">{coins}</span>
        </div>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto px-6 mt-8 space-y-6">
         {UPGRADE_TYPES.map((u) => {
             const Icon = u.icon;
             const currentLevel = levels[u.id] || 0;
             const cost = u.baseCost + currentLevel * u.costMult;
             const isMaxed = currentLevel >= u.maxLevel;
             const canAfford = coins >= cost && !isMaxed;
             const isAnimating = animatingId === u.id;

             return (
                 <motion.div 
                     key={u.id}
                     animate={isAnimating ? { scale: [1, 1.05, 1] } : {}}
                     transition={{ duration: 0.3 }}
                     className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6 flex flex-col gap-6 relative overflow-hidden"
                 >
                    <AnimatePresence>
                        {isAnimating && (
                            <motion.div 
                                initial={{ opacity: 0.5, scale: 0.8 }}
                                animate={{ opacity: 0, scale: 2 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className={`absolute inset-0 ${u.theme.bg} z-0 pointer-events-none`}
                            />
                        )}
                    </AnimatePresence>
                    
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-16 h-16 ${u.theme.bg} ${u.theme.text} rounded-2xl flex items-center justify-center border ${u.theme.border} ${u.theme.shadow}`}>
                         <Icon size={32} />
                      </div>
                      <div className="flex-1">
                         <h2 className="text-lg font-bold uppercase tracking-wide">{u.title}</h2>
                         <p className="text-zinc-500 text-xs">{u.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 relative z-10">
                       {Array.from({ length: u.maxLevel }).map((_, i) => (
                          <div key={i} className={`h-2 flex-1 rounded-sm ${i < currentLevel ? `${u.theme.bar} ${u.theme.barShadow}` : 'bg-zinc-800'}`}></div>
                       ))}
                    </div>

                    <div className="flex items-center justify-between mt-2 relative z-10">
                        <span className="text-zinc-400 font-bold uppercase text-xs">Level {currentLevel} / {u.maxLevel}</span>
                    </div>

                    <button
                       onClick={() => handleUpgrade(u)}
                       disabled={!canAfford}
                       className={`w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all relative z-10 ${
                         isMaxed 
                           ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                           : canAfford 
                             ? `${u.theme.btn} text-white shadow-lg ${u.theme.btnShadow} active:scale-95` 
                             : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                       }`}
                    >
                       {isMaxed ? (
                         'Max Level Reached'
                       ) : (
                         <>
                           <ChevronUp size={20} />
                           Upgrade for <Coins size={16} className={canAfford ? 'text-yellow-400' : 'text-zinc-600'} /> {cost}
                         </>
                       )}
                    </button>
                 </motion.div>
             )
         })}
      </div>
    </div>
  );
}

