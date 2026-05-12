import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import { playSound } from '../lib/sound';

interface Player {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  attack: number;
  defense: number;
  nickname: string;
  direction: string;
  isAttacking: boolean;
  attackTimer?: number;
  type: string;
  spriteUrl: string;
  level: number;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: string;
  ownerId: string;
  life: number;
  power?: number;
}

const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
  steel: '#B7B7CE', fairy: '#D685AD',
};

const StatBar = ({label, value, max, color}: {label: string, value: number, max: number, color: string}) => {
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);
  
  const pct = loaded ? Math.min(100, Math.max(0, (value/(max * 1.05)) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 w-full">
      <span className="w-8 text-[10px] font-black text-zinc-400">{label}</span>
      <div className="flex-1 bg-zinc-950 h-3 rounded-full overflow-hidden border border-zinc-900 drop-shadow-sm">
        <div className={`h-full ${color} rounded-full`} style={{width: `${pct}%`, transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)'}}></div>
      </div>
      <span className="w-8 text-left text-xs font-bold text-white">{Math.floor(value)}</span>
    </div>
  )
}

export default function Game() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [status, setStatus] = useState<string>('Loading...');
  const [gameOver, setGameOver] = useState<{ isWin: boolean, coins: number, exp: number, levelUp: boolean } | null>(null);
  const [myMoves, setMyMoves] = useState<{name: string, isProjectile: boolean, power: number, type: string}[]>([]);
  const [moveCooldowns, setMoveCooldowns] = useState<number[]>([0,0,0,0]);
  
  const [showVsScreen, setShowVsScreen] = useState(true);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [oppStats, setOppStats] = useState<any>(null);
  const gameStarted = useRef(false);
  
  const [showCatchUI, setShowCatchUI] = useState(false);
  const [catchResult, setCatchResult] = useState<'success' | 'failed' | null>(null);
  const [pokeballsCount, setPokeballsCount] = useState(0);
  
  // Game state
  const gameState = useRef<Record<string, Player>>({});
  const projectiles = useRef<Record<string, Projectile>>({});
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  const myId = useRef<string>(`player_1`);
  const isGameOver = useRef<boolean>(false);
  
  // Local input state
  const keys = useRef<{ [key: string]: boolean }>({});
  
  // Joystick State
  const joystickRef = useRef<{active: boolean, origin: {x: number, y: number}, current: {x: number, y: number}}>({
    active: false,
    origin: {x: 0, y: 0},
    current: {x: 0, y: 0}
  });
  
  useEffect(() => {
    // Input Handling
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Canvas drawing
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let isMounted = true;

    const initGame = async () => {
      try {
        const myIdLocal = localStorage.getItem('game_pokemon_id') || '4';
        const oppIdLocal = localStorage.getItem('game_opponent_id') || '1';
        const myLevel = Math.max(1, Math.floor(parseInt(localStorage.getItem('game_exp') || '0', 10) / 1000) + 1);
        const oppLevel = Math.max(1, myLevel + Math.floor(Math.random() * 3) - 1);
        const nicknameLocal = localStorage.getItem('game_nickname') || 'Trainer';
        
        setPokeballsCount(parseInt(localStorage.getItem('game_pokeballs_count') || '0', 10));
        
        const [myRes, oppRes] = await Promise.all([
            fetch(`https://pokeapi.co/api/v2/pokemon/${myIdLocal}`),
            fetch(`https://pokeapi.co/api/v2/pokemon/${oppIdLocal}`)
        ]);
        
        const myData = await myRes.json();
        const oppData = await oppRes.json();
        
        if (!isMounted) return;

        const extractMoves = (data: any) => {
           const allMoves = data.moves || [];
           const selected = [];
           const count = Math.min(allMoves.length, 4);
           for(let i=allMoves.length-1; i>=allMoves.length-count; i--) {
              selected.push(allMoves[i].move.name);
           }
           while(selected.length < 4) selected.push('tackle');
           
           return selected.map((name: string, i: number) => ({
               name: name.replace(/-/g, ' ').toUpperCase(),
               isProjectile: i % 2 !== 0,
               power: 40 + i * 15,
               type: data.types[0].type.name
           }));
        };
        
        setMyMoves(extractMoves(myData));
        
        const getBaseStat = (data: any, name: string) => data.stats.find((s:any) => s.stat.name===name)?.base_stat || 50;
        const calcStat = (base: number, level: number) => Math.floor(((2 * base + 31) * level) / 100) + 5;
        const calcHp = (base: number, level: number) => Math.floor(((2 * base + 31) * level) / 100) + level + 10;
        
        // Multiplier to make it a bit more action-oriented and not end instantly
        const hpMultiplier = 5; 
        
        const myHp = calcHp(getBaseStat(myData, 'hp'), myLevel) * hpMultiplier;
        const oppHp = calcHp(getBaseStat(oppData, 'hp'), oppLevel) * hpMultiplier;
        
        // Game speed needs to be higher so gameplay feels smooth
        const mySpeed = 200 + calcStat(getBaseStat(myData, 'speed'), myLevel) * 3; 
        const oppSpeed = 150 + calcStat(getBaseStat(oppData, 'speed'), oppLevel) * 3;

        const myAttack = calcStat(getBaseStat(myData, 'attack'), myLevel);
        const myDefense = calcStat(getBaseStat(myData, 'defense'), myLevel);
        const oppAttack = calcStat(getBaseStat(oppData, 'attack'), oppLevel);
        const oppDefense = calcStat(getBaseStat(oppData, 'defense'), oppLevel);

        gameState.current[myId.current] = {
            id: myId.current,
            x: 200, y: 400,
            health: myHp, maxHealth: myHp,
            speed: mySpeed,
            attack: myAttack,
            defense: myDefense,
            nickname: myData.name.toUpperCase(),
            direction: 'up',
            isAttacking: false,
            type: myData.types[0].type.name,
            spriteUrl: myData.sprites?.other?.['official-artwork']?.front_default || myData.sprites?.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${myIdLocal}.png`,
            level: myLevel
        };
        
        gameState.current['bot_match'] = {
            id: 'bot_match',
            x: 200, y: 100,
            health: oppHp, maxHealth: oppHp,
            speed: oppSpeed,
            attack: oppAttack,
            defense: oppDefense,
            nickname: oppData.name.toUpperCase(),
            direction: 'down',
            isAttacking: false,
            type: oppData.types[0].type.name,
            spriteUrl: oppData.sprites?.other?.['official-artwork']?.front_default || oppData.sprites?.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${oppIdLocal}.png`,
            level: oppLevel
        };
        
        setPlayerStats({
            nickname: myData.name.toUpperCase(),
            type: myData.types[0].type.name,
            spriteUrl: gameState.current[myId.current].spriteUrl,
            hp: myHp,
            attack: myAttack,
            defense: myDefense,
            speed: mySpeed,
            level: myLevel
        });

        setOppStats({
            nickname: oppData.name.toUpperCase(),
            type: oppData.types[0].type.name,
            spriteUrl: gameState.current['bot_match'].spriteUrl,
            hp: oppHp,
            attack: oppAttack,
            defense: oppDefense,
            speed: oppSpeed,
            level: oppLevel
        });

        setTimeout(() => {
          if (!isMounted) return;
          setShowVsScreen(false);
          gameStarted.current = true;
        }, 4000);
        
        setStatus('BATTLE!');
      } catch(e) {
          console.error("Game init error", e);
      }
    };
    initGame();

    const calculateDamage = (attacker: Player, defender: Player, power: number) => {
        const damage = ((2 * attacker.level / 5 + 2) * power * (attacker.attack / defender.defense)) / 50 + 2;
        return Math.floor(damage * (Math.random() * 0.15 + 0.85)); // 85-100% modifier
    };

    const handleGameOverState = (isWin: boolean) => {
        if (isGameOver.current) return;
        isGameOver.current = true;
        
        playSound(isWin ? 'win' : 'lose');
        
        const earnedCoins = isWin ? Math.floor(Math.random() * 50) + 50 : Math.floor(Math.random() * 10) + 5;
        const earnedExp = isWin ? Math.floor(Math.random() * 100) + 100 : Math.floor(Math.random() * 20) + 10;
        
        const currentCoins = parseFloat(localStorage.getItem('game_coins') || '0');
        const currentExp = parseInt(localStorage.getItem('game_exp') || '0', 10);
        
        const oldLevel = Math.floor(currentExp / 1000) + 1;
        const newLevel = Math.floor((currentExp + earnedExp) / 1000) + 1;
        const levelUp = newLevel > oldLevel;
        
        localStorage.setItem('game_coins', (currentCoins + earnedCoins).toString());
        localStorage.setItem('game_exp', (currentExp + earnedExp).toString());
        
        if (isWin) {
            setShowCatchUI(true);
        }
        
        setGameOver({ isWin, coins: earnedCoins, exp: earnedExp, levelUp });
    };

    const draw = (time: number) => {
      let dt = (time - lastTime) / 1000;
      if (dt > 0.05) dt = 0.016; // Cap dt to prevent huge teleport jumps (e.g. from alt-tabbing)
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const cw = canvas.width;
      const ch = canvas.height;

      const midY = ch / 2;
      
      if (!gameStarted.current) {
        lastTime = time;
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      // Update local player
      const me = gameState.current[myId.current];
      
      if (me && me.health <= 0) {
        handleGameOverState(false);
      } else if (gameState.current['bot_match']?.health <= 0) {
        handleGameOverState(true);
      }
      
      if (me && me.health > 0 && !isGameOver.current) {
        let moved = false;
        const speed = me.speed * dt;
        
        // Keyboard movement
        if (keys.current['ArrowUp'] || keys.current['w']) { me.y -= speed; moved = true; }
        if (keys.current['ArrowDown'] || keys.current['s']) { me.y += speed; moved = true; }
        if (keys.current['ArrowLeft'] || keys.current['a']) { me.x -= speed; moved = true; }
        if (keys.current['ArrowRight'] || keys.current['d']) { me.x += speed; moved = true; }

        // Joystick movement
        const joy = joystickRef.current;
        if (joy.active) {
          const dx = joy.current.x - joy.origin.x;
          const dy = joy.current.y - joy.origin.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const maxDist = 50;
          const clampedDist = Math.min(dist, maxDist);
          
          if (clampedDist > 5) {
             const moveSpeed = (clampedDist / maxDist) * speed;
             me.x += (dx / dist) * moveSpeed;
             me.y += (dy / dist) * moveSpeed;
             moved = true;
          }
        }
        
        // Auto-aim direction calculation
        const botForAim = gameState.current['bot_match'];
        if (botForAim && botForAim.health > 0) {
           const aimDx = botForAim.x - me.x;
           const aimDy = botForAim.y - me.y;
           if (Math.abs(aimDx) > Math.abs(aimDy)) {
             me.direction = aimDx > 0 ? 'right' : 'left';
           } else {
             me.direction = aimDy > 0 ? 'down' : 'up';
           }
        }

        if (me.x < 20) me.x = 20;
        if (me.y < midY + 20) me.y = midY + 20; // Ensure player strictly stays on bottom half
        if (me.x > cw - 20) me.x = cw - 20;
        if (me.y > ch - 20) me.y = ch - 20;

        // Action Buttons mapped to keys
        if (keys.current[' ']) { // Spacebar attack
            keys.current[' '] = false; // debounce
            if (!me.attackTimer || performance.now() - me.attackTimer > 400) {
              me.isAttacking = true;
              playSound('attack');
              me.attackTimer = performance.now();
              setTimeout(() => { if(gameState.current[myId.current]) gameState.current[myId.current].isAttacking = false; }, 200);

              let vx = 0; let vy = -800; // default up
              const botForAim = gameState.current['bot_match'];
              if (botForAim && botForAim.health > 0) {
                 const aimDx = botForAim.x - me.x;
                 const aimDy = botForAim.y - me.y;
                 const dist = Math.sqrt(aimDx*aimDx + aimDy*aimDy);
                 if (dist > 0) {
                    vx = (aimDx/dist) * 800;
                    vy = (aimDy/dist) * 800;
                 }
              }

              const pId = `proj_my_${Math.random()}`;
              projectiles.current[pId] = {
                id: pId, x: me.x, y: me.y, vx, vy, type: me.type || 'normal', ownerId: me.id, life: 1.0, power: 50
              };
            }
        }
      }

      // Offline bot logic
      const bot = gameState.current['bot_match'];
      if (bot && bot.health > 0 && me && me.health > 0 && !isGameOver.current) {
         let dx = me.x - bot.x;
         let dy = me.y - bot.y;
         let dist = Math.sqrt(dx*dx + dy*dy);
         
         let moveX = 0; let moveY = 0;
         
         // 100x Smart Bot Logic: 1. Extreme Projectile Dodging
         let dangerProj: Projectile | null = null;
         let minDangerTime = Infinity;
         
         // Randomly decide NOT to dodge (20% of the time bot is 'dumb')
         if (Math.random() > 0.2) {
             Object.values(projectiles.current).forEach((proj: Projectile) => {
                 if (proj.ownerId !== bot.id) {
                     let pdx = proj.x - bot.x;
                     let pdy = proj.y - bot.y;
                     let pDist = Math.sqrt(pdx*pdx + pdy*pdy);
                     
                     let dot = (proj.vx * pdx + proj.vy * pdy);
                     if (dot > 0) {
                       let timeToImpact = pDist / Math.sqrt(proj.vx*proj.vx + proj.vy*proj.vy);
                       let projSpeed = Math.sqrt(proj.vx*proj.vx + proj.vy*proj.vy);
                       let dirX = proj.vx / projSpeed;
                       let dirY = proj.vy / projSpeed;
                       let dotProj = pdx * dirX + pdy * dirY;
                       let closestX = proj.x + dirX * dotProj;
                       let closestY = proj.y + dirY * dotProj;
                       let missDist = Math.sqrt(Math.pow(closestX - bot.x, 2) + Math.pow(closestY - bot.y, 2));
                       
                       if (missDist < 50 && timeToImpact < 1.2 && timeToImpact < minDangerTime) { 
                           minDangerTime = timeToImpact;
                           dangerProj = proj;
                       }
                     }
                 }
             });
         }

         if (dangerProj) {
             // Hard dodge perpendicular to danger
             let projLineX = (dangerProj as Projectile).vx;
             let projLineY = (dangerProj as Projectile).vy;
             moveX = -projLineY; 
             moveY = projLineX;
             
             let escapeDot1 = moveX * (cw/2 - bot.x) + moveY * ((ch/4) - bot.y);
             if (escapeDot1 < 0) { moveX = -moveX; moveY = -moveY; }
         } else {
             // 2. Smooth positioning - shadow player X, wander slightly Y
             let targetX = me.x + Math.sin(time / 1000) * 100;
             let targetY = (ch / 4) + Math.cos(time / 800) * 50; 
             
             moveX = targetX - bot.x;
             moveY = targetY - bot.y;
         }
         
         let finalMoveLen = Math.sqrt(moveX*moveX + moveY*moveY);
         if (finalMoveLen > 5) {
              bot.x += (moveX / finalMoveLen) * bot.speed * dt * 0.7; // Manageable speed
              bot.y += (moveY / finalMoveLen) * bot.speed * dt * 0.7;
         }

         if (Math.abs(dx) > Math.abs(dy)) { bot.direction = dx > 0 ? 'right' : 'left'; } 
         else { bot.direction = dy > 0 ? 'down' : 'up'; }
         
         if (bot.x < 20) bot.x = 20;
         if (bot.y < 20) bot.y = 20;
         if (bot.x > cw - 20) bot.x = cw - 20;
         if (bot.y > (ch/2) - 20) bot.y = (ch/2) - 20; // strictly top half
         
         // 3. Aggressive Targeting Actions - Reduced attack speed / random aim offset
         if (!bot.attackTimer || performance.now() - bot.attackTimer > 1200) {
             if (Math.random() < 0.2) { // lowered attack probability per tick
                 bot.isAttacking = true;
                 playSound('attack');
                 bot.attackTimer = performance.now();
                 setTimeout(() => { if(gameState.current['bot_match']) gameState.current['bot_match'].isAttacking = false; }, 200);
                 
                 // Inaccuracy parameter
                 const inaccuracy = (Math.random() - 0.5) * 0.4;
                 const bvx = (dx/dist * Math.cos(inaccuracy) - dy/dist * Math.sin(inaccuracy)) * 300;
                 const bvy = (dx/dist * Math.sin(inaccuracy) + dy/dist * Math.cos(inaccuracy)) * 300;

                 const pId = `proj_${Math.random()}`;
                 projectiles.current[pId] = {
                   id: pId, x: bot.x, y: bot.y, vx: bvx, vy: bvy, type: bot.type, ownerId: bot.id, life: 1.5, power: 45
                 };
             }
         }
      }

      // Update Projectiles
      Object.values(projectiles.current).forEach((proj: Projectile) => {
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.life -= dt;
        
        if (proj.life <= 0) {
          delete projectiles.current[proj.id];
          return;
        }

        // Projectile collisions
        Object.values(gameState.current).forEach((p: Player) => {
          if (p.id !== proj.ownerId && p.health > 0) {
            const dx = p.x - proj.x;
            const dy = p.y - proj.y;
            if (dx*dx + dy*dy < 900) { // ~30px blast radius
              const attacker = gameState.current[proj.ownerId];
              playSound('hit');
              if (attacker) {
                 p.health -= calculateDamage(attacker, p, proj.power || 45);
              } else {
                 p.health -= 20;
              }
              if (p.health < 0) p.health = 0;
              delete projectiles.current[proj.id];
            }
          }
        });
      });

      // Draw background grass pattern
      ctx.fillStyle = '#3d4a3b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = '#2d3a2b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for(let i=0; i<canvas.width; i+=40) { ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); }
      for(let j=0; j<canvas.height; j+=40) { ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); }
      ctx.stroke();

      // Draw Dividing Net (Tennis/Badminton style)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 6;
      ctx.setLineDash([15, 10]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(cw, midY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Neon/glowing effect over the net
      ctx.strokeStyle = '#06b6d4'; // cyan-500
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, midY - 3);
      ctx.lineTo(cw, midY - 3);
      ctx.moveTo(0, midY + 3);
      ctx.lineTo(cw, midY + 3);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Draw Joystick overlay
      const joy = joystickRef.current;
      if (joy.active) {
         ctx.beginPath();
         ctx.arc(joy.origin.x, joy.origin.y, 50, 0, Math.PI * 2);
         ctx.fillStyle = 'rgba(255,255,255,0.1)';
         ctx.fill();
         ctx.strokeStyle = 'rgba(255,255,255,0.3)';
         ctx.lineWidth = 2;
         ctx.stroke();

         const dx = joy.current.x - joy.origin.x;
         const dy = joy.current.y - joy.origin.y;
         const dist = Math.sqrt(dx*dx + dy*dy);
         const clampedDist = Math.min(dist, 50);
         const dirX = dist > 0 ? dx / dist : 0;
         const dirY = dist > 0 ? dy / dist : 0;

         const thumbX = joy.origin.x + dirX * clampedDist;
         const thumbY = joy.origin.y + dirY * clampedDist;

         ctx.beginPath();
         ctx.arc(thumbX, thumbY, 25, 0, Math.PI * 2);
         ctx.fillStyle = 'rgba(255,255,255,0.5)';
         ctx.fill();
      }

      // Ensure canvas bounds handled on resize
      if (me) {
        if (me.x > canvas.width - 20) me.x = canvas.width - 20;
        if (me.y > canvas.height - 20) me.y = canvas.height - 20;
      }

      // Draw projectiles
      Object.values(projectiles.current).forEach((proj: Projectile) => {
         ctx.fillStyle = TYPE_COLORS[proj.type] || '#fff';
         ctx.beginPath();
         ctx.arc(proj.x, proj.y, 10, 0, Math.PI*2);
         ctx.fill();
         ctx.fillStyle = '#fff';
         ctx.beginPath();
         ctx.arc(proj.x, proj.y, 5, 0, Math.PI*2);
         ctx.fill();
         
         ctx.strokeStyle = TYPE_COLORS[proj.type] || '#fff';
         ctx.lineWidth = 6;
         ctx.lineCap = "round";
         ctx.globalAlpha = 0.5;
         ctx.beginPath();
         ctx.moveTo(proj.x, proj.y);
         ctx.lineTo(proj.x - proj.vx * 0.15, proj.y - proj.vy * 0.15);
         ctx.stroke();
         ctx.globalAlpha = 1.0;
      });

      // Draw players
      Object.values(gameState.current).forEach((p: Player) => {
        if (p.health <= 0) return; // ded

        // Player Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 15, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        const img = imageCache.current[p.spriteUrl];
        if (!img) {
            const newImg = new Image();
            newImg.crossOrigin = 'anonymous';
            newImg.src = p.spriteUrl;
            imageCache.current[p.spriteUrl] = newImg;
            
            // Draw placeholder circle while loading
            ctx.fillStyle = TYPE_COLORS[p.type] || '#555';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
            ctx.fill();
        } else if (img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.translate(p.x, p.y);
            if (p.direction === 'left') {
                ctx.scale(-1, 1);
            }
            // Add bobbing effect when moving (speed logic removed for simplicity, just draw)
            ctx.drawImage(img, -32, -32, 64, 64);
            ctx.restore();
        } else if (!img.complete || img.naturalWidth === 0) {
            ctx.fillStyle = TYPE_COLORS[p.type] || '#555';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
            ctx.fill();
        }

        // Direction Indicator (Little arrow)
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        if (p.direction === 'up') { ctx.moveTo(p.x, p.y - 35); ctx.lineTo(p.x - 6, p.y - 27); ctx.lineTo(p.x + 6, p.y - 27); }
        if (p.direction === 'down') { ctx.moveTo(p.x, p.y + 35); ctx.lineTo(p.x - 6, p.y + 27); ctx.lineTo(p.x + 6, p.y + 27); }
        if (p.direction === 'left') { ctx.moveTo(p.x - 35, p.y); ctx.lineTo(p.x - 27, p.y - 6); ctx.lineTo(p.x - 27, p.y + 6); }
        if (p.direction === 'right') { ctx.moveTo(p.x + 35, p.y); ctx.lineTo(p.x + 27, p.y - 6); ctx.lineTo(p.x + 27, p.y + 6); }
        ctx.fill();

        // Attack animation
        if (p.isAttacking && p.attackTimer) {
          const elapsed = performance.now() - p.attackTimer;
          const progress = Math.max(0, Math.min(elapsed / 200, 1));
          
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.beginPath();
          ctx.arc(0, 0, 30 + progress * 25, 0, Math.PI*2);
          
          const opacity = Math.floor((1 - progress) * 150).toString(16).padStart(2, '0');
          ctx.fillStyle = (TYPE_COLORS[p.type] || '#ffffff') + opacity;
          ctx.fill();
          
          ctx.strokeStyle = `rgba(255,255,255,${1 - progress})`;
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.restore();
        }

        // HP bar back
        ctx.fillStyle = '#111';
        ctx.fillRect(p.x - 25, p.y - 45, 50, 6);
        // HP bar fill
        ctx.fillStyle = p.health > (p.maxHealth / 2) ? '#22c55e' : p.health > (p.maxHealth / 4) ? '#eab308' : '#ef4444';
        ctx.fillRect(p.x - 25, p.y - 45, 50 * (p.health/p.maxHealth), 6);

        // Nickname
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(p.nickname, p.x, p.y - 55);
      });

      animationFrameId = requestAnimationFrame(draw);
    };
    
    animationFrameId = requestAnimationFrame(draw);

    const updateSize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    }
  }, []);

  const handleCtrl = (key: string, state: boolean) => {
     keys.current[key] = state;
  }

  const handleJoystickStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    joystickRef.current = {
      active: true,
      origin: { x: e.clientX, y: e.clientY },
      current: { x: e.clientX, y: e.clientY }
    };
  };

  const handleJoystickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joystickRef.current.active) {
      joystickRef.current.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleJoystickEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    joystickRef.current.active = false;
  };

    const handleScreenClick = (e: React.PointerEvent<HTMLDivElement>) => {
      // Joystick takes priority if clicked within its zone, avoiding accidental firing
      if (gameState.current[myId.current]?.health <= 0) return;
      if (isGameOver.current) return;
      
      const me = gameState.current[myId.current];
      if (!me) return;

      if (!me.attackTimer || performance.now() - me.attackTimer > 400) {
        me.isAttacking = true;
        playSound('attack');
        me.attackTimer = performance.now();
        setTimeout(() => { if(gameState.current[myId.current]) gameState.current[myId.current].isAttacking = false; }, 200);

        const container = containerRef.current;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const dx = clickX - me.x;
        const dy = clickY - me.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        let vx = 0; let vy = 0;
        if (dist > 0) {
            vx = (dx/dist) * 800;
            vy = (dy/dist) * 800;
        }

        const pId = `proj_my_${Math.random()}`;
        projectiles.current[pId] = {
          id: pId, x: me.x, y: me.y, vx, vy, type: me.type || 'normal', ownerId: me.id, life: 1.0, power: 50
        };
      }
    };

  const handleCatch = () => {
    if (pokeballsCount <= 0) return;
    const newCount = pokeballsCount - 1;
    setPokeballsCount(newCount);
    localStorage.setItem('game_pokeballs_count', newCount.toString());
    
    // Attempt catch
    playSound('select');
    setCatchResult('success'); // 100% catch rate for now as requested feeling
    
    const oppIdLocal = localStorage.getItem('game_opponent_id') || '1';
    try {
        const unlocked = JSON.parse(localStorage.getItem('game_unlocked') || '[4]');
        if (!unlocked.includes(parseInt(oppIdLocal))) {
            unlocked.push(parseInt(oppIdLocal));
            localStorage.setItem('game_unlocked', JSON.stringify(unlocked));
        }
    } catch(e) {}
    
    setTimeout(() => {
       setShowCatchUI(false);
    }, 4000);
  };

  return (
    <div className="bg-black min-h-screen flex flex-col font-mono text-white overflow-hidden fixed inset-0">
      <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <button onClick={() => navigate(-1)} className="bg-zinc-900/80 backdrop-blur border border-zinc-800 p-2 rounded-lg hover:bg-zinc-800 transition shadow-lg">
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 px-4 py-2 rounded-lg flex flex-col items-end gap-1 shadow-lg pointer-events-auto">
          <div className="flex items-center gap-2">
             <Gamepad2 size={16} className="text-zinc-400" />
             <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold">{status}</span>
          </div>
          {gameState.current[myId.current]?.health <= 0 && <span className="text-red-500 font-bold block text-sm mt-1 animate-pulse">YOU DIED ☠️</span>}
          {gameState.current['bot_match']?.health <= 0 && <span className="text-yellow-400 font-black block text-sm mt-1 animate-pulse">VICTORY 🏆</span>}
        </div>
      </div>

      <div className="flex-1 w-full bg-[#3d4a3b] touch-none" ref={containerRef} onPointerDown={handleScreenClick}>
        <canvas ref={canvasRef} className="block w-full h-full pointer-events-none" style={{ imageRendering: 'pixelated' }} />
      </div>

      {/* Invisible Joystick Capture Zone (Bottom Left) */}
      <div 
        className="absolute bottom-[10vh] left-6 w-40 h-40 z-10 touch-none pointer-events-auto rounded-full"
        onPointerDown={handleJoystickStart}
        onPointerMove={handleJoystickMove}
        onPointerUp={handleJoystickEnd}
        onPointerCancel={handleJoystickEnd}
      ></div>

      <div className="absolute bottom-[10vh] left-6 w-40 h-40 flex items-center justify-center pointer-events-none select-none z-10">
        <div className="w-32 h-32 rounded-full border-4 border-white/10 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/10"></div>
        </div>
      </div>
      
      {/* Game Over Overlay */}
      {gameOver && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className={`absolute inset-0 opacity-20 ${gameOver.isWin ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
            
            <h2 className={`text-5xl font-black uppercase tracking-tighter relative z-10 drop-shadow-lg mb-2 ${gameOver.isWin ? 'text-yellow-400' : 'text-red-500'}`}>
              {gameOver.isWin ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            
            {gameOver.levelUp && (
              <p className="text-green-400 font-bold uppercase tracking-widest text-sm mb-6 animate-bounce relative z-10">
                Level Up!
              </p>
            )}
            
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 mb-8 relative z-10 space-y-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-zinc-400 uppercase text-sm">Coins Earned</span>
                <span className="text-yellow-400 flex items-center gap-1">+{gameOver.coins} <span className="text-sm">🪙</span></span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-zinc-400 uppercase text-sm">EXP Gained</span>
                <span className="text-blue-400 flex items-center gap-1">+{gameOver.exp} <span className="text-sm">✨</span></span>
              </div>
            </div>
            
            <div className="relative z-10 space-y-3">
              <button onClick={() => navigate('/matchmaking')} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl uppercase tracking-widest transition-colors">
                Next Match
              </button>
              <button onClick={() => navigate('/')} className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold py-4 rounded-xl uppercase tracking-widest transition-colors">
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Catch UI Overlay */}
      {showCatchUI && gameOver && gameOver.isWin && (
        <div className="absolute inset-0 z-[150] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80%] flex flex-col items-center">
              {/* Opponent Sprite */}
              <img 
                 src={oppStats?.spriteUrl || ''} 
                 className={`w-48 h-48 drop-shadow-[0_0_20px_rgba(255,100,100,0.5)] transition-all duration-1000 ${catchResult === 'success' ? 'scale-0 opacity-0 rotate-180' : 'scale-100 opacity-100'}`} 
                 alt="Wild Pokemon" 
              />
              
              {/* Pokeball throwing anim */}
              {catchResult === 'success' && (
                 <div className="absolute bottom-0 w-16 h-16 rounded-full border-4 border-zinc-900 bg-white relative overflow-hidden shadow-lg animate-in zoom-in spin-in shadow-[0_0_50px_rgba(255,0,0,0.8)] duration-500">
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-500 border-b-4 border-zinc-900"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-4 border-zinc-900 z-10 animate-pulse"></div>
                 </div>
              )}
           </div>

           <div className="mt-48 text-center space-y-6 max-w-sm w-full relative z-10">
              {catchResult === 'success' ? (
                 <h2 className="text-3xl font-black uppercase text-green-400 drop-shadow-md animate-bounce">Gotcha!</h2>
              ) : (
                 <>
                   <h2 className="text-2xl font-black uppercase tracking-wide">Wild {oppStats?.nickname || 'Pokemon'} fainted!</h2>
                   <p className="text-zinc-400 text-sm">Should we try to catch it?</p>
                   
                   <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
                      <div className="flex justify-between items-center px-2">
                         <span className="text-zinc-500 uppercase text-xs font-bold">Your Pokeballs</span>
                         <span className="text-white font-black">x{pokeballsCount}</span>
                      </div>
                      
                      <button 
                        onClick={handleCatch}
                        disabled={pokeballsCount <= 0}
                        className={`w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${pokeballsCount > 0 ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                      >
                         Throw Pokeball
                      </button>
                      
                      <button 
                         onClick={() => setShowCatchUI(false)}
                         className="w-full py-3 rounded-xl border border-zinc-700 bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wide hover:bg-zinc-800 text-sm"
                      >
                         Leave it
                      </button>
                   </div>
                 </>
              )}
           </div>
        </div>
      )}
      
      {/* Vs Screen Overlay */}
      {showVsScreen && playerStats && oppStats && (
        <div className="absolute inset-0 z-[200] bg-black flex overflow-hidden lg:flex-row flex-col">
          {/* Split background */}
          <div className="absolute inset-y-0 left-0 w-full lg:w-1/2 h-1/2 lg:h-full bg-blue-900/20 lg:border-r-2 border-b-2 lg:border-b-0 border-blue-500/30 animate-in slide-in-from-top lg:slide-in-from-left duration-700"></div>
          <div className="absolute inset-y-0 bottom-0 lg:right-0 w-full lg:w-1/2 h-1/2 lg:h-full bg-red-900/20 lg:border-l-2 border-t-2 lg:border-t-0 border-red-500/30 mt-auto lg:mt-0 animate-in slide-in-from-bottom lg:slide-in-from-right duration-700"></div>
          
          {/* VS graphic */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-24 h-24 md:w-32 md:h-32 bg-black rounded-full border-[6px] border-zinc-800 flex items-center justify-center animate-in zoom-in spin-in-180 duration-1000 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
             <span className="text-4xl md:text-5xl font-black italic text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">VS</span>
          </div>

          <div className="relative w-full h-full flex flex-col lg:flex-row z-20 pointer-events-none">
             <div className="flex-1 w-full lg:w-1/2 h-1/2 lg:h-full flex flex-col justify-center items-center p-4 lg:p-8 animate-in slide-in-from-top lg:slide-in-from-left fade-in duration-1000 delay-300 fill-mode-both">
               <img src={playerStats.spriteUrl} className="w-32 h-32 md:w-48 md:h-48 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-pulse" style={{ animationDuration: '3s' }} alt="Player" />
               <h2 className="text-2xl md:text-3xl font-black mt-2 uppercase text-blue-400 drop-shadow-md text-center">{playerStats.nickname}</h2>
               <div className="flex gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-400 mt-1 mb-4">
                 <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">Lv. {playerStats.level}</span>
                 <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded" style={{color: TYPE_COLORS[playerStats.type]}}>{playerStats.type}</span>
               </div>
               
               {/* Stats */}
               <div className="w-full max-w-[200px] md:max-w-xs space-y-2">
                  <StatBar label="HP" value={playerStats.hp} max={Math.max(playerStats.hp, oppStats.hp)} color="bg-emerald-500" />
                  <StatBar label="ATK" value={playerStats.attack} max={Math.max(playerStats.attack, oppStats.attack)} color="bg-red-500" />
                  <StatBar label="DEF" value={playerStats.defense} max={Math.max(playerStats.defense, oppStats.defense)} color="bg-blue-500" />
                  <StatBar label="SPD" value={playerStats.speed} max={Math.max(playerStats.speed, oppStats.speed)} color="bg-yellow-500" />
               </div>
             </div>

             <div className="flex-1 w-full lg:w-1/2 h-1/2 lg:h-full flex flex-col justify-center items-center p-4 lg:p-8 animate-in slide-in-from-bottom lg:slide-in-from-right fade-in duration-1000 delay-300 fill-mode-both">
               <img src={oppStats.spriteUrl} className="w-32 h-32 md:w-48 md:h-48 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse" style={{ animationDuration: '3s', animationDelay: '1s' }} alt="Opponent" />
               <h2 className="text-2xl md:text-3xl font-black mt-2 uppercase text-red-500 drop-shadow-md text-center">{oppStats.nickname}</h2>
               <div className="flex gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-400 mt-1 mb-4">
                 <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">Lv. {oppStats.level}</span>
                 <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded" style={{color: TYPE_COLORS[oppStats.type]}}>{oppStats.type}</span>
               </div>
               
               {/* Stats */}
               <div className="w-full max-w-[200px] md:max-w-xs space-y-2">
                  <StatBar label="HP" value={oppStats.hp} max={Math.max(playerStats.hp, oppStats.hp)} color="bg-emerald-500" />
                  <StatBar label="ATK" value={oppStats.attack} max={Math.max(playerStats.attack, oppStats.attack)} color="bg-red-500" />
                  <StatBar label="DEF" value={oppStats.defense} max={Math.max(playerStats.defense, oppStats.defense)} color="bg-blue-500" />
                  <StatBar label="SPD" value={oppStats.speed} max={Math.max(playerStats.speed, oppStats.speed)} color="bg-yellow-500" />
               </div>
             </div>
          </div>
          
          <div className="absolute bottom-6 inset-x-0 text-center animate-pulse z-30">
            <span className="bg-black/50 px-4 py-2 rounded-full text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs border border-zinc-800">Battle begins soon...</span>
          </div>
        </div>
      )}
      
    </div>
  );
}

