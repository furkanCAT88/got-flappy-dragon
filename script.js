
class OrganicSoundController {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);
    }
    resume() { if (this.ctx.state === 'suspended') this.ctx.resume(); }
    playJump() { this.resume(); this.playTone(150, 'triangle', 0.1); }
    playScore() { this.resume(); this.playTone(400, 'sine', 0.1); }
    playCrack() { this.resume(); this.playTone(60, 'sawtooth', 0.2); }
    playFire() { this.resume(); this.playTone(200, 'sawtooth', 0.1); }
    playExplosion() { this.resume(); this.playTone(100, 'square', 0.3); }
    playTone(freq, type, duration) {
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    }
}

class InputHandler {
    constructor() {
        window.addEventListener('touchstart', (e) => this.onInput(e), { passive: false });
        window.addEventListener('mousedown', (e) => this.onInput(e));
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') this.onInput(e);
            if (e.key === 'k' || e.key === 'K') {
                if (game && game.currentState === 'playing') game.shoot();
            }
        });
    }
    onInput(e) {
        if (e.type === 'mousedown' && e.target.closest('button')) return; 
        
        if (game && game.sounds) game.sounds.resume();
        if (game && game.currentState === 'playing') {
            game.dragon.flap();
            if(game.sounds) game.sounds.playJump();
        } else if (game && game.currentState === 'gameover') {
             // game.resetGame();
        }
    }
}

const DRAGONS = {
    balerion: { name: "Balerion", img: "assets/dragon_balerion.png", color: "#333", scale: 1.6, frames: 6 },
    drogon: { name: "Drogon", img: "assets/dragon_drogon.png", color: "#8b0000", scale: 1.0, frames: 6 },
    caraxes: { name: "Caraxes", img: "assets/dragon_caraxes.png", color: "#ff0000", scale: 1.0, frames: 6 },
    viserion: { name: "Viserion", img: "assets/dragon_viserion.png", color: "#ffd700", scale: 1.0, frames: 6 },
    meleys: { name: "Meleys", img: "assets/dragon_meleys.png", color: "#e63946", scale: 0.9, frames: 1 }
};

const KINGDOMS = {
    stark: { name: "House Stark", bg: "assets/bg_stark.png", obs: "assets/obs_stark_v3.png", color: "#8d99ae" },
    lannister: { name: "House Lannister", bg: "assets/bg_lannister.png", obs: "assets/obs_lannister_v3.png", color: "#d90429" },
    baratheon: { name: "House Baratheon", bg: "assets/bg_baratheon.png", obs: "assets/obs_baratheon_v3.png", color: "#ffb703" },
    greyjoy: { name: "House Greyjoy", bg: "assets/bg_greyjoy.png", obs: "assets/obs_greyjoy_v3.png", color: "#2b2d42" },
    tyrell: { name: "House Tyrell", bg: "assets/bg_tyrell.png", obs: "assets/obs_tyrell_v3.png", color: "#2d6a4f" },
    martell: { name: "House Martell", bg: "assets/bg_martell.png", obs: "assets/obs_martell_v3.png", color: "#e36414" },
    targaryen: { name: "House Targaryen", bg: "assets/bg_targaryen.png", obs: "assets/obs_targaryen_v3.png", color: "#000000" },
    arryn: { name: "House Arryn", bg: "assets/bg_arryn.png", obs: "assets/obs_arryn_v3.png", color: "#8ecae6" }
};

class Obstacle {
    constructor(canvas, imageSrc) {
        this.canvas = canvas;
        this.x = canvas.width;
        this.width = 70;
        this.gap = 210;
        this.topHeight = Math.random() * (canvas.height - this.gap - 100) + 50;
        this.passed = false;
        this.image = new Image();
        this.image.src = imageSrc;
    }
    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth !== 0) {
            const imgW = this.width;
            const scale = this.width / this.image.naturalWidth;
            const imgH = this.image.naturalHeight * scale;
            let currentY = this.topHeight - imgH;
            while (currentY > -imgH) {
                ctx.drawImage(this.image, this.x, currentY, imgW, imgH);
                currentY -= imgH;
            }
            currentY = this.topHeight + this.gap;
            while (currentY < this.canvas.height) {
                ctx.drawImage(this.image, this.x, currentY, imgW, imgH);
                currentY += imgH;
            }
        } else {
            ctx.fillStyle = '#555';
            ctx.fillRect(this.x, 0, this.width, this.topHeight);
            ctx.fillRect(this.x, this.topHeight + this.gap, this.width, this.canvas.height - (this.topHeight + this.gap));
        }
    }
}

class Dragon {
    constructor(canvas, imageSrc, scale = 1.0, totalFrames = 6) {
        this.canvas = canvas;
        this.scale = scale;
        this.x = 50;
        this.y = canvas.height / 2;
        this.velocity = 0;
        this.gravity = 0.4;
        this.jumpStrength = -7;
        this.radius = 25 * this.scale;
        this.spritesheet = new Image();
        this.spritesheet.src = (imageSrc || 'assets/vhagar_sheet_new.png') + '?t=' + Date.now();
        this.totalFrames = totalFrames;
        this.frameWidth = 0;
        this.frameHeight = 0;
    }
    draw(ctx) {
        if (this.spritesheet.complete && this.spritesheet.naturalWidth !== 0) {
            if (this.frameWidth === 0) {
                this.frameWidth = this.spritesheet.width / this.totalFrames;
                this.frameHeight = this.spritesheet.height;
            }
            let speed = 100;
            if (this.velocity < -2) speed = 70;
            else if (this.velocity > 2) speed = 200;
            const frameIndex = Math.floor(Date.now() / speed) % this.totalFrames;
            const sx = frameIndex * this.frameWidth;
            ctx.save();
            ctx.translate(this.x, this.y);
            let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
            ctx.rotate(rotation);
            if (this.frameWidth > 0) {
                const aspect = this.frameWidth / this.frameHeight;
                const drawHeight = 120 * this.scale;
                const drawWidth = drawHeight * aspect;
                ctx.drawImage(this.spritesheet, sx, 0, this.frameWidth, this.frameHeight, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            }
            ctx.restore();
        } else {
            ctx.fillStyle = '#aa0000';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;
    }
    flap() {
        this.velocity = this.jumpStrength;
    }
}

class Projectile {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 10;
        this.active = true;
        if (type === 'fire') { this.vx = 12; this.vy = 0; }
        else if (type === 'ice') { this.vx = -8; this.vy = 0; }
        else if (type === 'ice-arc') { this.vx = -6; this.vy = -5; }
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.type === 'ice-arc') this.vy += 0.2;
        if (this.x > window.innerWidth + 50 || this.x < -50 || this.y > window.innerHeight + 50) this.active = false;
    }
    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        
        if (this.type === 'fire') {
            // Realistic Fire: Inner white/yellow, Outer orange/red, Glow
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255, 100, 0, 0.8)';
            const g = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, this.radius);
            g.addColorStop(0, '#fff');
            g.addColorStop(0.3, '#ffeb3b');
            g.addColorStop(1, '#ff5722');
            ctx.fillStyle = g;
        } else {
            // Realistic Ice: Inner white, Outer cyan/blue, Glow
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(0, 200, 255, 0.8)';
            const g = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, this.radius);
            g.addColorStop(0, '#fff');
            g.addColorStop(0.3, '#00ffff');
            g.addColorStop(1, '#0277bd');
            ctx.fillStyle = g;
        }

        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Enemy {
    constructor(canvas, type = 'warrior') {
        this.canvas = canvas;
        this.image = new Image();
        this.image.src = 'assets/ice_dragon_v2.png';
        this.type = type;
        this.width = 70;
        this.height = 50;
        this.speed = 3 + Math.random() * 2;
        if (type === 'scout') { this.width = 50; this.height = 35; this.speed = 6 + Math.random() * 2; }
        else if (type === 'boss') { this.width = 120; this.height = 90; this.speed = 1.5; }
        this.x = canvas.width + 50;
        this.y = Math.random() * (canvas.height - 200) + 100;
        this.active = true;
        this.shootTimer = 0;
    }
    update(game) {
        this.x -= this.speed;
        this.y += Math.sin(this.x * 0.05) * 2;
        if (this.x < -150) this.active = false;
        if (this.type !== 'scout') {
            this.shootTimer++;
            // REDUCED FIRE RATE for difficulty balance
            if (this.shootTimer > 400 && Math.random() < 0.01) {
                 const sy = this.y + this.height / 2;
                 game.projectiles.push(new Projectile(this.x, sy, 'ice'));
                 this.shootTimer = 0;
            }
        }
    }
    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'blue';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.sounds = new OrganicSoundController();

        this.ui = {
            startBtn: document.getElementById('start-btn'),
            selection: document.getElementById('kingdom-selection'),
            dragonSelection: document.getElementById('dragon-selection'),
            score: document.getElementById('score-display'),
            gameOver: document.getElementById('game-over-screen'),
            stamina: document.getElementById('stamina-bar'),
            shootBtn: document.getElementById('shoot-btn'),
            bossHud: document.getElementById('boss-hud'),
            restartBtn: document.getElementById('restart-btn')
        };
        
        this.currentKingdomKey = 'stark';
        this.currentDragonKey = 'balerion';
        this.bgImage = new Image();
        this.obstacleImageSrc = 'assets/obs_stark_v3.png';
        
        this.dragon = new Dragon(this.canvas, 'assets/dragon_balerion.png');
        this.obstacles = [];
        this.projectiles = [];
        this.enemies = [];
        this.score = 0;
        this.frameCount = 0;
        this.stamina = 100;
        this.currentState = 'menu';
        this.bgX = 0;
        this.currentSpeed = 3;
        this.bossMode = false;
        this.nextBossThreshold = 50;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        if (this.ui.startBtn) {
            this.ui.startBtn.addEventListener('click', () => this.startGame());
        }
        if (this.ui.restartBtn) {
            this.ui.restartBtn.addEventListener('click', () => this.resetGame());
        }
        if (this.ui.shootBtn) {
            this.ui.shootBtn.addEventListener('click', (e) => { e.stopPropagation(); this.shoot(); });
            this.ui.shootBtn.addEventListener('mousedown', (e) => e.stopPropagation());
            this.ui.shootBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); this.shoot(); }, {passive: false});
        }

        this.initSelectionMenu();
        this.initDragonSelection();
        this.updateStartButton();
        
        new InputHandler();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initSelectionMenu() {
        if (!this.ui.selection) return;
        this.ui.selection.innerHTML = '';
        Object.keys(KINGDOMS).forEach(key => {
            const k = KINGDOMS[key];
            const div = document.createElement('div');
            div.className = 'kingdom-card';
            if (key === this.currentKingdomKey) div.classList.add('selected');
            div.style.borderColor = k.color;
            div.innerHTML = `<img src="${k.obs}" class="kingdom-icon"><div style="color:${k.color}">${k.name}</div>`;
            div.onclick = (e) => {
                e.stopPropagation();
                this.currentKingdomKey = key;
                this.loadAssets(key);
                this.ui.selection.querySelectorAll('.kingdom-card').forEach(c => c.classList.remove('selected'));
                div.classList.add('selected');
            };
            this.ui.selection.appendChild(div);
        });
    }

    initDragonSelection() {
        if (!this.ui.dragonSelection) return;
        this.ui.dragonSelection.innerHTML = '';
        Object.keys(DRAGONS).forEach(key => {
            const d = DRAGONS[key];
            const div = document.createElement('div');
            div.className = 'dragon-card';
            if (key === this.currentDragonKey) div.classList.add('selected');
            const frames = d.frames || 6;
            const bgSize = frames === 1 ? 'contain' : `${frames * 100}% auto`;
            const bgPos = frames === 1 ? 'center' : '0 center';
            div.innerHTML = `<div class="dragon-icon" style="background-image:url(${d.img}); background-size:${bgSize}; background-position:${bgPos}; background-repeat:no-repeat; height:80px; width:80px; display:block;"></div><div style="color:${d.color || '#fff'}">${d.name}</div>`;
            div.onclick = (e) => {
                e.stopPropagation();
                this.currentDragonKey = key;
                this.ui.dragonSelection.querySelectorAll('.dragon-card').forEach(c => c.classList.remove('selected'));
                div.classList.add('selected');
            };
            this.ui.dragonSelection.appendChild(div);
        });
    }

    updateStartButton() {
        if (this.ui.startBtn) this.ui.startBtn.classList.remove('hidden');
    }

    loadAssets(key) {
        if (KINGDOMS[key]) {
            this.bgImage.src = KINGDOMS[key].bg;
            this.obstacleImageSrc = KINGDOMS[key].obs;
        }
    }

    startGame() {
        this.loadAssets(this.currentKingdomKey);
        const d = DRAGONS[this.currentDragonKey];
        if (d) this.dragon = new Dragon(this.canvas, d.img, d.scale, d.frames);
        
        this.currentState = 'playing';
        this.obstacles = [];
        this.projectiles = [];
        this.enemies = [];
        this.score = 0;
        this.frameCount = 0;
        this.stamina = 100;
        this.bossMode = false;
        this.nextBossThreshold = 50;
        if(this.boss) this.boss = null;
        
        const s = document.getElementById('start-screen'); if(s){ s.classList.remove('active'); s.classList.add('hidden'); }
        const g = document.getElementById('game-over-screen'); if(g){ g.classList.remove('active'); g.classList.add('hidden'); }
        
        if (this.ui.bossHud) this.ui.bossHud.classList.remove('hidden');
        const bar = document.getElementById('boss-hp-fill');
        if (bar) bar.style.width = '0%';
        
        if (this.ui.score) {
            this.ui.score.innerText = '0';
            this.ui.score.classList.remove('hidden');
        }
        
        const sc = document.getElementById('stamina-container'); if(sc) sc.classList.remove('hidden');
        if (this.ui.stamina) this.ui.stamina.style.width = '100%';
        
        if (this.ui.shootBtn) this.ui.shootBtn.classList.remove('hidden');
    }
    
    resetGame() {
        this.currentState = 'menu';
        const s = document.getElementById('start-screen'); if(s){ s.classList.add('active'); s.classList.remove('hidden'); }
        const g = document.getElementById('game-over-screen'); if(g){ g.classList.remove('active'); g.classList.add('hidden'); }
        
        this.nextBossThreshold = 50;
        if (this.ui.bossHud) this.ui.bossHud.classList.add('hidden');
        
        if (this.ui.score) this.ui.score.classList.add('hidden');
        if (this.ui.shootBtn) this.ui.shootBtn.classList.add('hidden');
        const sc = document.getElementById('stamina-container'); if(sc) sc.classList.add('hidden');
    }

    shoot() {
        if (this.currentState === 'playing' && this.stamina >= 5) {
            this.stamina -= 5;
            if (this.ui.stamina) this.ui.stamina.style.width = this.stamina + '%';
            this.projectiles.push(new Projectile(this.dragon.x + 40, this.dragon.y, 'fire'));
            if(this.sounds) this.sounds.playFire();
        }
    }

    gameOver() {
        this.currentState = 'gameover';
        const g = document.getElementById('game-over-screen'); if(g){ g.classList.add('active'); g.classList.remove('hidden'); }
        if (this.sounds) this.sounds.playCrack();
        const fs = document.getElementById('final-score');
        if (fs) fs.innerText = this.score;
        const hs = document.getElementById('high-score');
        const best = localStorage.getItem('flappyHighScore') || 0;
        if (this.score > best) {
            localStorage.setItem('flappyHighScore', this.score);
            if (hs) hs.innerText = this.score;
        } else {
            if (hs) hs.innerText = best;
        }
    }

    startBossBattle() {
        if (this.bossMode) return;
        console.log("Starting Boss Battle!");
        this.bossMode = true;
        
        if (this.ui.bossHud) {
            this.ui.bossHud.classList.remove('hidden');
            const bar = document.getElementById('boss-hp-fill');
            if (bar) bar.style.width = '100%';
        }
        
        if (typeof Boss !== 'undefined') {
             this.boss = new Boss(this);
             setTimeout(() => { 
                this.obstacles = []; 
                this.enemies = []; 
             }, 10);
        }
    }

    bossDefeated() {
        this.bossMode = false;
        this.boss = null;
        this.projectiles = [];
        this.enemies = [];
        this.score += 10;
        if (this.ui.score) this.ui.score.innerText = this.score;
        
        // Critical: Update threshold to prevent immediate restart
        this.nextBossThreshold = (Math.floor(this.score / 50) + 1) * 50;

        // Reset bar for next round
        const bar = document.getElementById('boss-hp-fill');
        if (bar) bar.style.width = '0%';
    }

    update() {
        if (this.currentState !== 'playing') return;
        
        // Auto-check boss start (Safety)
        if (!this.bossMode && this.score >= this.nextBossThreshold) {
            this.startBossBattle();
        }

        this.frameCount++;
        
        // Boss Bar Progress
        if (!this.bossMode && this.ui.bossHud) {
            let startScore = this.nextBossThreshold - 50;
            let currentProgress = this.score - startScore;
            if (currentProgress < 0) currentProgress = 0;
            if (currentProgress > 50) currentProgress = 50;
            
            const percentage = (currentProgress / 50) * 100;
            const bar = document.getElementById('boss-hp-fill');
            if (bar) bar.style.width = percentage + '%';
        }
        
        // Background scroll
        if (!this.bossMode) {
            this.bgX -= this.currentSpeed * 0.5;
            if (this.bgX <= -window.innerWidth * 2) this.bgX += window.innerWidth * 2;
        }
        
        // Stamina
        if (this.frameCount % 3 === 0 && this.stamina < 100) {
            this.stamina += 2;
            if (this.ui.stamina) this.ui.stamina.style.width = this.stamina + '%';
        }

        this.dragon.update();
        if (this.dragon.y < 0 || this.dragon.y > this.canvas.height) this.gameOver();
        
        // Obstacles
        if (this.frameCount % 120 === 0 && !this.bossMode) {
            this.obstacles.push(new Obstacle(this.canvas, this.obstacleImageSrc));
        }
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            if (this.bossMode) continue; 
            let o = this.obstacles[i];
            o.x -= this.currentSpeed;
            if (o.x + o.width < 0) this.obstacles.splice(i, 1);
            
            if (this.dragon.x + this.dragon.radius > o.x && this.dragon.x - this.dragon.radius < o.x + o.width) {
                 if (this.dragon.y - this.dragon.radius < o.topHeight || this.dragon.y + this.dragon.radius > o.topHeight + o.gap) {
                     this.gameOver();
                 }
            }
            if (!o.passed && this.dragon.x > o.x + o.width) {
                o.passed = true;
                this.score++;
                if (this.ui.score) this.ui.score.innerText = this.score;
            }
        }
        
        // Boss Logic
        if (this.bossMode && this.boss) {
             this.boss.update();
             if (this.boss.active) {
                const dx = this.dragon.x - (this.boss.x + this.boss.width/2);
                const dy = this.dragon.y - (this.boss.y + this.boss.height/2);
                if (Math.sqrt(dx*dx + dy*dy) < 80) this.gameOver();
             }
        }
    
        // Enemies
        if (this.frameCount % 200 === 0 && !this.bossMode) {
             this.enemies.push(new Enemy(this.canvas));
        }
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (!this.bossMode) e.update(this);
            if (!e.active) {
                this.enemies.splice(i, 1);
                continue;
            }
            const dx = this.dragon.x - (e.x + e.width/2);
            const dy = this.dragon.y - (e.y + e.height/2);
            if (Math.sqrt(dx*dx + dy*dy) < this.dragon.radius + e.width/3) {
                this.gameOver();
            }
        }
        
        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update();
            if (!p.active) {
                 this.projectiles.splice(i, 1);
                 continue;
            }
            
            // PROJECTILE COLLISION (FIRE vs ICE)
            // Added feature: Shoot down incoming ice balls
            if (p.type === 'fire') {
                 for (let j = 0; j < this.projectiles.length; j++) {
                    const other = this.projectiles[j];
                    if (other.active && (other.type === 'ice' || other.type === 'ice-arc')) {
                        const dist = Math.sqrt(Math.pow(p.x - other.x, 2) + Math.pow(p.y - other.y, 2));
                        if (dist < p.radius + other.radius + 15) { // Hitbox generosity
                            p.active = false;
                            other.active = false;
                            if (this.sounds) this.sounds.playExplosion();
                            break;
                        }
                    }
                }
                if (!p.active) continue; // If destroyed, stop checking enemies
            
                this.enemies.forEach(e => {
                    if (e.active) {
                        const dist = Math.sqrt(Math.pow(p.x - (e.x+e.width/2), 2) + Math.pow(p.y - (e.y+e.height/2), 2));
                        if (dist < e.width/2) {
                            e.active = false;
                            p.active = false;
                            this.score += 5;
                            if(this.ui.score) this.ui.score.innerText = this.score;
                            if(this.sounds) this.sounds.playExplosion();
                        }
                    }
                });
                if (this.bossMode && this.boss && this.boss.active) {
                     const dist = Math.sqrt(Math.pow(p.x - (this.boss.x+this.boss.width/2), 2) + Math.pow(p.y - (this.boss.y+this.boss.height/2), 2));
                     if (dist < 80) {
                         p.active = false;
                         this.boss.takeDamage();
                     }
                }
            } else {
                const dist = Math.sqrt(Math.pow(p.x - this.dragon.x, 2) + Math.pow(p.y - this.dragon.y, 2));
                if (dist < this.dragon.radius + p.radius) {
                    this.gameOver();
                }
            }
        }
    }

    draw() {
        try {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (this.bgImage && this.bgImage.complete && this.bgImage.naturalWidth > 0) {
                const W = window.innerWidth;
                const H = window.innerHeight;
                this.ctx.drawImage(this.bgImage, this.bgX, 0, W + 2, H);
                this.ctx.save();
                this.ctx.translate(this.bgX + 2 * W, 0); 
                this.ctx.scale(-1, 1); 
                this.ctx.drawImage(this.bgImage, -2, 0, W + 2, H);
                this.ctx.restore();
                this.ctx.drawImage(this.bgImage, this.bgX + 2 * W - 2, 0, W + 2, H);
                this.ctx.save();
                this.ctx.translate(this.bgX + 4 * W - 2, 0); 
                this.ctx.scale(-1, 1); 
                this.ctx.drawImage(this.bgImage, -2, 0, W + 2, H);
                this.ctx.restore();
            } else {
                const k = KINGDOMS[this.currentKingdomKey];
                this.ctx.fillStyle = (k && k.color) ? k.color : '#222';
                this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height);
            }
            if (this.obstacles) this.obstacles.forEach(o => o.draw(this.ctx));
            if (this.dragon) this.dragon.draw(this.ctx);
            if (this.enemies) this.enemies.forEach(e => e.draw(this.ctx));
            if (this.projectiles) this.projectiles.forEach(p => p.draw(this.ctx));
            if (this.bossMode && this.boss) this.boss.draw(this.ctx);
        } catch(e) { console.error("Draw error", e); }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }
}
let game = null;
window.addEventListener('load', () => { game = new Game(); });
