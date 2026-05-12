import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router';
import Home from './pages/Home';
import Matchmaking from './pages/Matchmaking';
import Game from './pages/Game';
import Shop from './pages/Shop';
import Upgrades from './pages/Upgrades';
import Invest from './pages/Invest';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const username = localStorage.getItem('game_username');
      if (!username && location.pathname !== '/login' && location.pathname !== '/signup') {
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate, location.pathname]);

  // Periodic Sync to Firebase
  useEffect(() => {
    const syncToFirebase = async () => {
      const username = localStorage.getItem('game_username');
      if (username) {
        try {
           const coins = parseInt(localStorage.getItem('game_coins') || '0', 10);
           const exp = parseInt(localStorage.getItem('game_exp') || '0', 10);
           const pokemonId = parseInt(localStorage.getItem('game_pokemon_id') || '4', 10);
           const unlockedStr = localStorage.getItem('game_unlocked') || '[]';
           
           const speedLevel = parseInt(localStorage.getItem('game_speed_level') || '0', 10);
           const attackLevel = parseInt(localStorage.getItem('game_attack_level') || '0', 10);
           const healthLevel = parseInt(localStorage.getItem('game_health_level') || '0', 10);
           const defenseLevel = parseInt(localStorage.getItem('game_defense_level') || '0', 10);
           
           const investLevel = parseInt(localStorage.getItem('game_invest_level') || '0', 10);
           const passiveRate = parseInt(localStorage.getItem('game_passive_rate') || '0', 10);

           const userRef = doc(db, 'users', username.toLowerCase());
           await updateDoc(userRef, {
             coins,
             exp,
             starter: pokemonId,
             unlocked: JSON.parse(unlockedStr),
             speedLevel,
             attackLevel,
             healthLevel,
             defenseLevel,
             investLevel,
             passiveRate,
             lastSync: new Date().toISOString()
           });
        } catch (e) {
           console.error("Failed to sync", e);
        }
      }
    };

    const syncInterval = setInterval(syncToFirebase, 15000); // Sync every 15s
    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    let lastTime = parseInt(localStorage.getItem('game_last_time') || Date.now().toString(), 10);
    
    // Catch up on offline earnings
    const incomeRate = parseInt(localStorage.getItem('game_passive_rate') || '0', 10);
    const now = Date.now();
    if (incomeRate > 0) {
      const deltaSeconds = Math.floor((now - lastTime) / 1000);
      if (deltaSeconds > 0) {
        const currentCoins = parseInt(localStorage.getItem('game_coins') || '0', 10);
        localStorage.setItem('game_coins', (currentCoins + incomeRate * deltaSeconds).toString());
        lastTime = now - ((now - lastTime) % 1000);
        localStorage.setItem('game_last_time', lastTime.toString());
      }
    } else {
       localStorage.setItem('game_last_time', now.toString());
       lastTime = now;
    }

    const interval = setInterval(() => {
      const currentNow = Date.now();
      const currentRate = parseInt(localStorage.getItem('game_passive_rate') || '0', 10);
      
      if (currentRate > 0) {
        const deltaSeconds = Math.floor((currentNow - lastTime) / 1000);
        if (deltaSeconds > 0) {
           const currentCoins = parseInt(localStorage.getItem('game_coins') || '0', 10);
           localStorage.setItem('game_coins', (currentCoins + currentRate * deltaSeconds).toString());
           lastTime = currentNow - ((currentNow - lastTime) % 1000);
           localStorage.setItem('game_last_time', lastTime.toString());
           window.dispatchEvent(new Event('coins_updated'));
        }
      } else {
        lastTime = currentNow;
        localStorage.setItem('game_last_time', lastTime.toString());
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Home />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/upgrades" element={<Upgrades />} />
      <Route path="/invest" element={<Invest />} />
      <Route path="/matchmaking" element={<Matchmaking />} />
      <Route path="/game" element={<Game />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

