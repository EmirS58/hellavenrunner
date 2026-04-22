// ===== ARAF RUNNER - GAME ENGINE =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Realm constants
const REALM = { PURGATORY: 0, HEAVEN: 1, HELL: -1 };

// Game state
let state = {
    running: false,
    realm: REALM.PURGATORY,
    level: 0,        // 0=araf, 1-7=cennet katları, -1 to -7=cehennem katları
    speed: 4,
    distance: 0,
    lastChoiceDist: 0,
    choiceInterval: 600,
    showChoice: false,
    choiceAvailable: false,
    attackCooldown: 0,
    paused: false,
    entryCloud: null,       // giris bulutu referansi
    entryCloudEndDist: 0    // giris bulutu bitis mesafesi
};

// Player
const player = {
    x: 120,
    y: 0,
    w: 38,
    h: 52,
    vy: 0,
    jumping: false,
    gravity: 0.75,
    jumpPower: -18,
    onGround: false
};

// Game objects
let obstacles = [];
let creatures = [];
let clouds = [];
let particles = [];
let groundPlatforms = [];

// Touch state
let touchStartX = 0;
let touchStartY = 0;

// ===== INIT =====
function initGame() {
    // Place player on ground
    player.y = canvas.height - 150 - player.h;
    player.vy = 0;
    player.jumping = false;

    // Initial ground platforms for purgatory
    groundPlatforms = [];
    clouds = [];
    obstacles = [];
    creatures = [];
    particles = [];

    state.running = true;
    state.realm = REALM.PURGATORY;
    state.level = 0;
    state.speed = 7;
    state.distance = 0;
    state.lastChoiceDist = 0;
    state.showChoice = false;
    state.choiceAvailable = false;
    state.attackCooldown = 0;
    state.paused = false;

    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('attackBtn').classList.add('hidden');

    // Cennet için başlangıç bulutu spawn et
    if (state.realm === REALM.HEAVEN) {
        spawnStartClouds();
    }
    requestAnimationFrame(gameLoop);
}

// ===== INPUT =====
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    handleTap(t.clientX, t.clientY);
}, { passive: false });

canvas.addEventListener('click', (e) => {
    handleTap(e.clientX, e.clientY);
});

function handleTap(x, y) {
    if (!state.running) return;

    // If choice is showing, ignore taps on canvas (handled by HTML buttons)
    if (state.showChoice) return;

    // Jump: ekrana dokununca zipla
    doJump();
}

function doJump() {
    if (!player.jumping) {
        player.vy = player.jumpPower;
        player.jumping = true;
        player.onGround = false;
    }
}

function doAttack() {
    if (state.attackCooldown > 0) return;
    state.attackCooldown = 30;

    const attackRange = 500;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;

    creatures = creatures.filter(c => {
        const d = Math.hypot(c.x - px, c.y - py);
        if (d < attackRange + c.size) {
            createParticles(c.x, c.y, "#FF4500", 15);
            return false;
        }
        return true;
    });

    createParticles(px + 50, py, "#FFD700", 6);
}

// ===== CHOICE SYSTEM =====
function makeChoice(goUp) {
    if (!state.choiceAvailable) return;
    state.paused = false;

    if (goUp) {
        state.level = Math.min(state.level + 1, 7);
    } else {
        state.level = Math.max(state.level - 1, -7);
    }

    state.lastChoiceDist = state.distance;
    state.showChoice = false;
    state.choiceAvailable = false;

    // Update realm
    if (state.level > 0) state.realm = REALM.HEAVEN;
    else if (state.level < 0) state.realm = REALM.HELL;
    else state.realm = REALM.PURGATORY;

    // Update speed
    updateSpeed();

    // Hide choice UI
    document.getElementById('choicePanel').classList.add('hidden');

    // Clear old objects on realm change
    obstacles = [];
    creatures = [];
    clouds = [];

    // Cennet secilince hemen bulut spawn et
    if (state.realm === REALM.HEAVEN) {
        spawnStartClouds();
    }

    // Saldiri butonunu goster/gizle
    const attackBtn = document.getElementById("attackBtn");
    if (state.realm === REALM.HELL) {
        attackBtn.classList.remove("hidden");
    } else {
        attackBtn.classList.add("hidden");
    }
}

function updateSpeed() {
    const lvl = Math.abs(state.level);
    if (state.realm === REALM.HEAVEN) {
        state.speed = 5 + lvl * 2.5;
    } else if (state.realm === REALM.HELL) {
        state.speed = 4 + lvl * 1.2;
    } else {
        state.speed = 7;
    }
}

// ===== SPAWNING =====
function spawnStartClouds() {
    clouds = [];
    const spd = state.speed || 5;
    const airFrames = 2 * Math.abs(player.jumpPower) / player.gravity;
    const jumpDist = airFrames * spd;
    const cloudGap = jumpDist * 0.72;
    const startY = canvas.height - 200;

    // 100 metre = 2000 piksel uzunlugunda giris bulutu
    const entryW = 2000;
    const entryCloud = { x: player.x - 30, y: startY, w: entryW, h: 35, speed: spd, isEntry: true };
    clouds.push(entryCloud);
    state.entryCloudEndDist = state.distance + 100;

    for (let i = 1; i <= 14; i++) {
        const prev = clouds[clouds.length - 1];
        // Bosluk max ziplama mesafesinin %40i
        const gap = cloudGap * (0.25 + Math.random() * 0.15);
        const cloudW = 120 + Math.random() * 160;
        clouds.push({
            x: prev.x + prev.w + gap,
            y: Math.max(100, Math.min(canvas.height - 220, startY + (Math.random() - 0.5) * 70)),
            w: cloudW,
            h: 32 + Math.random() * 12,
            speed: spd
        });
    }

    player.y = clouds[0].y - player.h;
    player.vy = 0;
    player.jumping = false;
}
function spawnObjects() {
    const r = Math.random();

    if (state.realm === REALM.HEAVEN) {
        // Giris bulutu aktifken (ilk 100m) normal bulut spawn etme
        if (state.distance < state.entryCloudEndDist) return;

        // Guncel hiza gore ziplama mesafesini hesapla
        const airFrames = 2 * Math.abs(player.jumpPower) / player.gravity;
        const jumpDist = airFrames * state.speed;
        const safeGap = jumpDist * 0.60;

        const lastCloud = clouds.filter(c => !c.isEntry).slice(-1)[0];
        // Son bulutun sag kenari ekranin saginin 400px gerisinde kalinca yeni bulut ekle
        const lastCloudRight = lastCloud ? lastCloud.x + lastCloud.w : 0;
        const needNew = lastCloudRight < canvas.width + 400;

        if (needNew && r < 0.10) {
            const refY = lastCloud ? lastCloud.y : canvas.height - 200;
            const cloudW = 120 + Math.random() * 160;
            // Bosluk kesinlikle ziplama mesafesinin %25-%40i arasi
            const gap = jumpDist * (0.25 + Math.random() * 0.15);
            clouds.push({
                x: canvas.width + 60,
                y: Math.max(100, Math.min(canvas.height - 220, refY + (Math.random() - 0.5) * 70)),
                w: cloudW,
                h: 32 + Math.random() * 12,
                speed: state.speed
            });
        }
    } else {
        // Spawn spikes - 50-100 metre aralikli
        const lastSpikeObj = obstacles.filter(o => o.type === "spike").slice(-1)[0];
        const spikeDistMetres = lastSpikeObj ? (state.distance - (lastSpikeObj.spawnDist || 0)) : 999;
        const nextSpikeDist = lastSpikeObj ? (lastSpikeObj.nextGap || 75) : 0;
        if (spikeDistMetres >= nextSpikeDist) {
            const groundY = canvas.height - 100;
            obstacles.push({
                x: canvas.width,
                y: groundY - 45,
                w: 45,
                h: 45,
                type: "spike",
                spawnDist: state.distance,
                nextGap: 40 + Math.random() * 40
            });
        }

        // Spawn creatures in hell
        const lastCreature = creatures.slice(-1)[0];
        const canSpawnCreature = !lastCreature || (canvas.width - lastCreature.x) > 300 + Math.random() * 350;
        if (state.realm === REALM.HELL && canSpawnCreature && r > 0.985) {
            const lvl = Math.abs(state.level);
            creatures.push({
                x: canvas.width + 30,
                y: canvas.height - 100 - 40 - Math.random() * 150,
                size: 28 + lvl * 3,
                speed: 1.5 + lvl * 0.3,
                hp: 1,
                angle: 0
            });
        }
    }
}

// ===== UPDATE =====
function update() {
    if (state.paused) return;
    state.distance += state.speed * 0.05;

    // Check if choice should appear
    if (!state.showChoice && !state.choiceAvailable &&
        state.distance - state.lastChoiceDist > state.choiceInterval) {
        triggerChoice();
    }

    updatePlayer();
    updateObstacles();
    updateCreatures();
    updateClouds();
    updateParticles();
    spawnObjects();

    if (state.attackCooldown > 0) state.attackCooldown--;
}

function triggerChoice() {
    state.choiceAvailable = true;
    state.showChoice = true;
    state.paused = true;

    const panel = document.getElementById('choicePanel');
    const upBtn = document.getElementById('choiceUp');
    const downBtn = document.getElementById('choiceDown');
    const upLabel = document.getElementById('upLabel');
    const downLabel = document.getElementById('downLabel');

    // Only show relevant direction
    if (state.realm === REALM.HEAVEN || state.level === 0) {
        upBtn.style.display = 'block';
        upLabel.textContent = state.level === 0 ? ' CENNETE GİT' : ` KAT ${state.level + 1}'E ÇIK`;
    } else {
        upBtn.style.display = 'none';
    }

    if (state.realm === REALM.HELL || state.level === 0) {
        downBtn.style.display = 'block';
        downLabel.textContent = state.level === 0 ? ' CEHENNEME GİT' : ` KAT ${Math.abs(state.level) + 1}'E İN`;
    } else {
        downBtn.style.display = 'none';
    }

    panel.classList.remove('hidden');
}

function updatePlayer() {
    player.vy += player.gravity;
    player.y += player.vy;
    player.onGround = false;

    if (state.realm === REALM.HEAVEN) {
        // Heaven: no ground, only clouds
        // Check cloud collision
        clouds.forEach(cloud => {
            if (player.x + player.w > cloud.x &&
                player.x < cloud.x + cloud.w &&
                player.y + player.h > cloud.y &&
                player.y + player.h < cloud.y + cloud.h + 10 &&
                player.vy >= 0) {
                player.y = cloud.y - player.h;
                player.vy = 0;
                player.jumping = false;
                player.onGround = true;
            }
        });

        // Fall off screen = death
        if (player.y > canvas.height + 50) {
            triggerGameOver();
        }

        // Ceiling
        if (player.y < 0) {
            player.y = 0;
            player.vy = 2;
        }
    } else {
        // Purgatory & Hell: solid ground
        const groundY = canvas.height - 100;
        if (player.y + player.h >= groundY) {
            player.y = groundY - player.h;
            player.vy = 0;
            player.jumping = false;
            player.onGround = true;
        }

        // Ceiling
        if (player.y < 0) {
            player.y = 0;
            player.vy = 2;
        }
    }
}

function updateObstacles() {
    obstacles = obstacles.filter(obs => {
        obs.x -= state.speed;

        // Spike collision
        if (state.realm !== REALM.HEAVEN) {
            const spikeHitX = player.x + 5 < obs.x + obs.w - 5 && player.x + player.w - 5 > obs.x + 5;
            const spikeHitY = player.y + player.h > obs.y + 10 && player.y < obs.y + obs.h;
            if (spikeHitX && spikeHitY) {
                triggerGameOver();
            }
        }

        return obs.x + obs.w > 0;
    });
}

function updateCreatures() {
    creatures = creatures.filter(c => {
        c.x -= state.speed * 0.5;
        c.angle += 0.08;

        // Collision with player
        const dx = (player.x + player.w / 2) - c.x;
        const dy = (player.y + player.h / 2) - c.y;
        if (Math.hypot(dx, dy) < c.size + 15) {
            triggerGameOver();
        }

        return c.x + c.size > 0;
    });
}

function updateClouds() {
    clouds = clouds.filter(cloud => {
        // Bulut hizini her zaman guncel oyun hizina esitle
        cloud.speed = state.speed;
        cloud.x -= cloud.speed;
        return cloud.x + cloud.w > -50;
    });
}

function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life--;
        return p.life > 0;
    });
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6 - 2,
            life: 30 + Math.random() * 20,
            color
        });
    }
}

// ===== DRAW =====
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    if (state.realm !== REALM.HEAVEN) {
        drawGround();
        drawObstacles();
    } else {
        drawClouds();
    }

    drawCreatures();
    drawPlayer();
    drawParticles();
    drawHUD();


}

function drawBackground() {
    let g;
    if (state.realm === REALM.HEAVEN) {
        g = ctx.createLinearGradient(0, 0, 0, canvas.height);
        const intensity = state.level / 7;
        g.addColorStop(0, `hsl(${200 + intensity * 40}, 80%, ${60 + intensity * 20}%)`);
        g.addColorStop(1, `hsl(${180 + intensity * 30}, 60%, 85%)`);
    } else if (state.realm === REALM.HELL) {
        g = ctx.createLinearGradient(0, 0, 0, canvas.height);
        const intensity = Math.abs(state.level) / 7;
        g.addColorStop(0, `hsl(0, 80%, ${10 + intensity * 5}%)`);
        g.addColorStop(0.6, `hsl(10, 90%, ${20 + intensity * 10}%)`);
        g.addColorStop(1, `hsl(20, 100%, ${30 + intensity * 15}%)`);
    } else {
        g = ctx.createLinearGradient(0, 0, 0, canvas.height);
        g.addColorStop(0, '#5a6a7a');
        g.addColorStop(1, '#c8c8c8');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGround() {
    const groundY = canvas.height - 100;
    ctx.fillStyle = state.realm === REALM.HELL ? '#3a0000' : '#7a6040';
    ctx.fillRect(0, groundY, canvas.width, 100);

    // Ground line
    ctx.strokeStyle = state.realm === REALM.HELL ? '#8B0000' : '#5a4020';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();
}

function drawObstacles() {
    obstacles.forEach(obs => {
        if (obs.type === 'spike') {
            const count = 3;
            const sw = obs.w / count;
            ctx.fillStyle = state.realm === REALM.HELL ? '#cc2200' : '#555';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;

            for (let i = 0; i < count; i++) {
                ctx.beginPath();
                ctx.moveTo(obs.x + i * sw, obs.y + obs.h);
                ctx.lineTo(obs.x + i * sw + sw / 2, obs.y);
                ctx.lineTo(obs.x + i * sw + sw, obs.y + obs.h);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }
    });
}

function drawClouds() {
    clouds.forEach(cloud => {
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.shadowColor = 'rgba(200,230,255,0.8)';
        ctx.shadowBlur = 15;

        // Main cloud body
        ctx.beginPath();
        ctx.roundRect(cloud.x, cloud.y, cloud.w, cloud.h, 20);
        ctx.fill();

        // Puff on top
        ctx.beginPath();
        ctx.arc(cloud.x + cloud.w * 0.3, cloud.y, cloud.h * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cloud.x + cloud.w * 0.6, cloud.y - 5, cloud.h * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    });
}

function drawCreatures() {
    creatures.forEach(c => {
        ctx.save();
        ctx.translate(c.x, c.y);

        // Body
        ctx.fillStyle = '#cc0000';
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, c.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Horns
        ctx.fillStyle = '#880000';
        ctx.beginPath();
        ctx.moveTo(-c.size * 0.4, -c.size * 0.8);
        ctx.lineTo(-c.size * 0.2, -c.size * 1.5);
        ctx.lineTo(0, -c.size * 0.8);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(c.size * 0.4, -c.size * 0.8);
        ctx.lineTo(c.size * 0.2, -c.size * 1.5);
        ctx.lineTo(0, -c.size * 0.8);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(-c.size * 0.3, -c.size * 0.2, c.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(c.size * 0.3, -c.size * 0.2, c.size * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-c.size * 0.3, -c.size * 0.2, c.size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(c.size * 0.3, -c.size * 0.2, c.size * 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + player.h / 2);

    if (state.realm === REALM.HEAVEN) {
        // Angel look
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;
    } else if (state.realm === REALM.HELL) {
        // Dark look
        ctx.fillStyle = '#FF6600';
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 10;
    } else {
        ctx.fillStyle = '#DDDDDD';
        ctx.shadowBlur = 0;
    }

    // Body
    ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
    ctx.shadowBlur = 0;

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(-10, -player.h / 2 + 10, 8, 8);
    ctx.fillRect(4, -player.h / 2 + 10, 8, 8);

    // Halo in heaven
    if (state.realm === REALM.HEAVEN) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, -player.h / 2 - 8, 14, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life / 50;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    });
    ctx.globalAlpha = 1;
}

function drawHUD() {
    // Top bar
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, canvas.width, 55);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(` ${Math.floor(state.distance)}m`, 15, 35);

    ctx.textAlign = 'center';
    const realmText = state.realm === REALM.HEAVEN ? ` CENNET KAT ${state.level}` :
                      state.realm === REALM.HELL ? ` CEHENNEM KAT ${Math.abs(state.level)}` :
                      ' ARAF';
    ctx.fillText(realmText, canvas.width / 2, 35);

    ctx.textAlign = 'right';
    ctx.fillText(` ${(state.speed / 4).toFixed(1)}x`, canvas.width - 15, 35);
}

function drawAttackHint() {
    // Right side attack zone indicator
    ctx.fillStyle = 'rgba(255, 50, 0, 0.15)';
    ctx.fillRect(canvas.width * 0.6, 55, canvas.width * 0.4, canvas.height - 55);

    ctx.fillStyle = 'rgba(255,100,0,0.6)';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(' SALDIRI', canvas.width * 0.8, canvas.height / 2);
    ctx.textAlign = 'left';
}

// ===== GAME OVER =====
function triggerGameOver() {
    state.running = false;
    document.getElementById('choicePanel').classList.add('hidden');
    document.getElementById('finalScore').textContent = `Mesafe: ${Math.floor(state.distance)}m`;
    document.getElementById('finalRealm').textContent =
        state.realm === REALM.HEAVEN ? ` Cennet Kat ${state.level}` :
        state.realm === REALM.HELL ? ` Cehennem Kat ${Math.abs(state.level)}` : ' Araf';
    document.getElementById('gameOver').classList.remove('hidden');
}

// ===== GAME LOOP =====
function gameLoop() {
    if (!state.running) return;
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ===== RESIZE =====
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});














