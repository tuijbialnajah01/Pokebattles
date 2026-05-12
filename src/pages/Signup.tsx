import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Profile
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [starter, setStarter] = useState<number | null>(null);

  const starters = [
    { id: 1, name: 'Bulbasaur', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png' },
    { id: 4, name: 'Charmander', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png' },
    { id: 7, name: 'Squirtle', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png' }
  ];

  const handleNext = async () => {
    if (!username || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', username.toLowerCase());
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setError('Username is already taken');
      } else {
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Error checking username');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!age || !starter) {
      setError('Please provide your age and choose a starter');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', username.toLowerCase());
      await setDoc(userRef, {
        username,
        password, // In a real app this would be hashed, but for this demo plain is requested
        age: parseInt(age, 10),
        bio,
        starter,
        coins: 0,
        exp: 0,
        createdAt: new Date().toISOString()
      });

      localStorage.setItem('game_username', username);
      localStorage.setItem('game_pokemon_id', starter.toString());
      localStorage.setItem('game_unlocked', JSON.stringify([starter]));
      localStorage.setItem('game_coins', '0');
      localStorage.setItem('game_exp', '0');
      
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error creating account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950 min-h-screen font-mono text-zinc-100 flex flex-col items-center justify-center p-6">
      <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-black uppercase tracking-widest text-center mb-2">Sign Up</h1>
        <p className="text-zinc-500 text-xs text-center mb-8 uppercase tracking-widest">
          {step === 1 ? 'Create Credentials' : 'Profile Setup'}
        </p>

        {error && <div className="bg-red-500/20 text-red-500 border border-red-500/50 rounded-lg p-3 text-sm mb-4">{error}</div>}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                placeholder="Unique username"
                maxLength={20}
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
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button 
              onClick={handleNext}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all text-white font-black uppercase tracking-widest py-4 rounded-xl mt-4 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Next Step'}
            </button>
            <div className="mt-4 text-center">
              <p className="text-zinc-500 text-sm">
                Already have an account?{' '}
                <button onClick={() => navigate('/login')} className="text-red-400 font-bold hover:underline">
                  Login
                </button>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Age</label>
              <input 
                type="number" 
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                placeholder="Age"
                min={1}
                max={150}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Bio (Optional)</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors resize-none h-20"
                placeholder="Tell us about yourself..."
                maxLength={100}
              />
            </div>
            
            <div>
               <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Choose Starter</label>
               <div className="grid grid-cols-3 gap-2">
                 {starters.map(s => (
                   <button 
                     key={s.id} 
                     onClick={() => setStarter(s.id)}
                     className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                       starter === s.id ? 'border-red-500 bg-red-500/10 scale-105' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'
                     }`}
                   >
                     <img src={s.image} alt={s.name} className="w-16 h-16 object-contain filter drop-shadow-md" />
                     <span className="text-[10px] font-bold uppercase mt-1">{s.name}</span>
                   </button>
                 ))}
               </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button 
                onClick={() => setStep(1)}
                className="w-1/3 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all text-white font-bold uppercase tracking-widest py-4 rounded-xl"
              >
                Back
              </button>
              <button 
                onClick={handleSignup}
                disabled={loading}
                className="w-2/3 bg-red-600 hover:bg-red-500 active:scale-95 transition-all text-white font-black uppercase tracking-widest py-4 rounded-xl disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Start Journey'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
