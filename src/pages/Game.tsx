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

export default function Game() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [status, setStatus] = useState<string>('Loading...');
  const [gameOver, setGameOver] = useState<{ isWin: boolean, coins: number, exp: number, levelUp: boolean } | null>(null);
  const [myMoves, setMyMoves] = useState<{name: string, isProjectile: boolean, power: number, type: string}[]>([]);
  const [moveCooldowns, setMoveCooldowns] = useState<number[]>([0,0,0,0]);
  
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
        const speedLevel = parseInt(localStorage.getItem('game_speed_level') || '0', 10);
        const attackLevel = parseInt(localStorage.getItem('game_attack_level') || '0', 10);
        const healthLevel = parseInt(localStorage.getItem('game_health_level') || '0', 10);
        const defenseLevel = parseInt(localStorage.getItem('game_defense_level') || '0', 10);
        const nicknameLocal = localStorage.getItem('game_nickname') || 'Trainer';
        
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
        
        const getStat = (data: any, name: string) => data.stats.find((s:any) => s.stat.name===name)?.base_stat || 50;
        
        const myHpBase = getStat(myData, 'hp') * 3;
        const myHp = myHpBase + (healthLevel * 50); // 50 HP per level
        const oppHp = getStat(oppData, 'hp') * 3;
        
        gameState.current[myId.current] = {
            id: myId.current,
            x: 200, y: 400,
            health: myHp, maxHealth: myHp,
            speed: getStat(myData, 'speed') * 1.5 + 50 + (speedLevel * 20),
            attack: getStat(myData, 'attack') + (attackLevel * 10), // 10 attack per level
            defense: getStat(myData, 'defense') + (defenseLevel * 10), // 10 defense per level
            nickname: myData.name.toUpperCase(),
            direction: 'up',
            isAttacking: false,
            type: myData.types[0].type.name,
            spriteUrl: myData.sprites?.other?.['official-artwork']?.front_default || myData.sprites?.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${myIdLocal}.png`
        };
        
        gameState.current['bot_match'] = {
            id: 'bot_match',
            x: 200, y: 100,
            health: oppHp, maxHealth: oppHp,
            speed: getStat(oppData, 'speed') * 1.5 + 50,
            attack: getStat(oppData, 'attack'),
            defense: getStat(oppData, 'defense'),
            nickname: oppData.name.toUpperCase(),
            direction: 'down',
            isAttacking: false,
            type: oppData.types[0].type.name,
            spriteUrl: oppData.sprites?.other?.['official-artwork']?.front_default || oppData.sprites?.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${oppIdLocal}.png`
        };
        
        setStatus('BATTLE!');
      } catch(e) {
          console.error("Game init error", e);
      }
    };
    initGame();

    const calculateDamage = (attacker: Player, defender: Player, power: number) => {
        const damage = ((2 * 50 / 5 + 2) * power * (attacker.attack / defender.defense)) / 50 + 2;
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
        
        setGameOver({ isWin, coins: earnedCoins, exp: earnedExp, levelUp });
    };

    const draw = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const cw = canvas.width;
      const ch = canvas.height;

      const midY = ch / 2;

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
      
    </div>
  );
}

