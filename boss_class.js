class Boss {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.spritesheet = new Image();
        this.spritesheet.src = 'assets/boss_sheet_new.png?v=' + Date.now();
        this.totalFrames = 6;
        this.frameWidth = 0;
        this.frameHeight = 0;
        this.width = 250;
        this.height = 200;
        this.x = this.canvas.width + 100;
        this.y = this.canvas.height / 2 - this.height / 2;
        this.targetY = this.y;
        this.speed = 2;
        this.hoverOffset = 0;
        this.maxHealth = 5;
        this.health = this.maxHealth;
        this.active = true;
        this.shootTimer = 0;
        this.state = 'entering';
        this.isHit = false;
    }

    update() {
        this.hoverOffset += 0.05;
        if (this.state === 'entering') {
            this.x -= this.speed;
            if (this.x < this.canvas.width - 200) {
                this.state = 'hovering';
                this.x = this.canvas.width - 200;
            }
        } else if (this.state === 'hovering') {
            this.y += Math.sin(this.hoverOffset) * 1.5;
            const dy = this.game.dragon.y - (this.y + this.height / 2);
            this.y += dy * 0.02;
            this.shootTimer++;
            if (this.shootTimer > 50) {
                this.shoot();
                this.shootTimer = 0;
            }
        }
    }

    shoot() {
        const py = this.y + this.height / 2;
        const p1 = new Projectile(this.x, py, 'ice'); p1.vx = -8; p1.vy = -1.5;
        const p2 = new Projectile(this.x, py, 'ice'); p2.vx = -8; p2.vy = 0;
        const p3 = new Projectile(this.x, py, 'ice'); p3.vx = -8; p3.vy = 1.5;
        this.game.projectiles.push(p1, p2, p3);
        if (this.game.sounds) { try { this.game.sounds.playFire(); } catch (e) { } }
    }

    takeDamage() {
        this.health--;
        const hpPercent = (this.health / this.maxHealth) * 100;
        const bar = document.getElementById('boss-hp-fill');
        if (bar) bar.style.width = hpPercent + '%';
        this.isHit = true;
        setTimeout(() => this.isHit = false, 100);
        if (this.health <= 0) this.die();
        else if (this.game.sounds) this.game.sounds.playExplosion();
    }

    die() {
        this.active = false;
        this.game.bossDefeated();
        if (this.game.sounds) this.game.sounds.playExplosion();
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        if (this.isHit) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'red';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            if (this.spritesheet.complete && this.spritesheet.naturalWidth !== 0) {
                if (this.frameWidth === 0) {
                    this.frameWidth = this.spritesheet.width / this.totalFrames;
                    this.frameHeight = this.spritesheet.height;
                }
                const speed = 150;
                const frameIndex = Math.floor(Date.now() / speed) % this.totalFrames;
                const sx = frameIndex * this.frameWidth;
                const aspect = this.frameWidth / this.frameHeight;
                const drawH = this.height * 1.2;
                const drawW = drawH * aspect;
                ctx.drawImage(this.spritesheet, sx, 0, this.frameWidth, this.frameHeight, -drawW / 2, -drawH / 2, drawW, drawH);
            } else {
                ctx.fillStyle = '#0000AA';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            }
        }
        ctx.restore();
    }
}
