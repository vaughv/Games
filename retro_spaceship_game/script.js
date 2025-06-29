const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Load images
const jetImg = new Image();
jetImg.src = 'images/jet.png';
const enemyImg = new Image();
enemyImg.src = 'images/enemy.png';
const bossImg = new Image();
bossImg.src = 'images/boss.png';

// Load sounds
const shootSound = new Audio('sounds/shoot.mp3');
const hitSound = new Audio('sounds/hit.mp3');
const explosionSound = new Audio('sounds/explosion.mp3');

// Player (jet)
let spaceship = {
  x: canvas.width / 2 - 30,
  y: canvas.height - 80,
  width: 60,
  height: 60,
  speed: 5,
  health: 100
};

// Game state
let keys = {};
let bullets = [];
let laserActive = false;
let laserPowerUp = false;
let laserStartTime = 0;
let lastLaserTime = -Infinity;
const laserCooldown = 5000;
const laserDuration = 10000;

let enemies = [];
let enemyBullets = [];

let boss = null;
let bossBullets = [];

let enemiesKilled = 0;
let enemiesSinceLastBoss = 0;
let score = 0;

let bossLevel = 1;
let bossHealthBase = 500;
let playerMaxHealth = 100;
let bossLastShoot = 0;

document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

function drawSpaceship() {
  ctx.drawImage(jetImg, spaceship.x, spaceship.y, spaceship.width, spaceship.height);
  drawHealthBar(spaceship.x, spaceship.y, spaceship.health, playerMaxHealth);
}

function shoot() {
  const now = Date.now();

  if (laserPowerUp && keys['z']) {
    if (!laserActive && now - lastLaserTime > laserCooldown) {
      laserActive = true;
      laserStartTime = now;
    }
  }

  if (laserActive) {
    if (now - laserStartTime > laserDuration || spaceship.health <= 0) {
      laserActive = false;
      lastLaserTime = now;
    } else {
      if (now % 50 < 10) {
        if (spaceship.health <= 0) gameOver();
      }
    }
  } else if (keys[' '] && now % 10 < 2) {
    bullets.push({
      x: spaceship.x + spaceship.width / 2 - 2,
      y: spaceship.y,
      width: 4,
      height: 8,
      type: 'normal'
    });
    shootSound.cloneNode().play();
  }
}

function drawLaser() {
  if (laserActive) {
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(spaceship.x + spaceship.width / 2, spaceship.y);
    ctx.lineTo(spaceship.x + spaceship.width / 2, 0);
    ctx.stroke();

    // Check for collisions with enemies
    enemies.forEach((enemy, i) => {
      if (
        spaceship.x + spaceship.width / 2 > enemy.x &&
        spaceship.x + spaceship.width / 2 < enemy.x + enemy.width
      ) {
        enemy.health -= 1;
        if (enemy.health <= 0) {
          enemies.splice(i, 1);
          explosionSound.cloneNode().play();
          score++;
          enemiesKilled++;
          enemiesSinceLastBoss++;
        }
      }
    });

    // Boss laser hit
    if (boss) {
      if (
        spaceship.x + spaceship.width / 2 > boss.x &&
        spaceship.x + spaceship.width / 2 < boss.x + boss.width
      ) {
        boss.health -= 1;
        if (boss.health <= 0) {
          explosionSound.cloneNode().play();
          score += 100;
          boss = null;
          laserPowerUp = true;
          laserActive = false;
          lastLaserTime = Date.now();

          spaceship.health += 200;
          playerMaxHealth *= 2;
          spaceship.health = Math.min(spaceship.health, playerMaxHealth);
          bossLevel++;
        }
      }
    }
  }
}

function drawBullets() {
  bullets.forEach((b, i) => {
    b.y -= 7;
    ctx.fillStyle = 'red';
    ctx.fillRect(b.x, b.y, b.width, b.height);
    if (b.y < 0) bullets.splice(i, 1);
  });
}

function drawEnemies() {
  enemies.forEach((e, i) => {
    e.y += 1.5;
    ctx.drawImage(enemyImg, e.x, e.y, e.width, e.height);
    drawHealthBar(e.x, e.y, e.health, 10);

    if (e.y > canvas.height) enemies.splice(i, 1);

    // Random shooting
    if (Math.random() < 0.005) {
      let angle = Math.random() * Math.PI * 2;
      enemyBullets.push({
        x: e.x + e.width / 2,
        y: e.y + e.height / 2,
        dx: Math.cos(angle) * 3,
        dy: Math.sin(angle) * 3,
        width: 6,
        height: 6
      });
    }
  });
}

function drawEnemyBullets() {
  enemyBullets.forEach((b, i) => {
    b.x += b.dx;
    b.y += b.dy;
    ctx.fillStyle = 'orange';
    ctx.fillRect(b.x, b.y, b.width, b.height);
    if (
      b.x < spaceship.x + spaceship.width &&
      b.x + b.width > spaceship.x &&
      b.y < spaceship.y + spaceship.height &&
      b.y + b.height > spaceship.y
    ) {
      spaceship.health -= 10;
      enemyBullets.splice(i, 1);
      hitSound.cloneNode().play();
      if (spaceship.health <= 0) gameOver();
    }
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
      enemyBullets.splice(i, 1);
    }
  });
}

function spawnEnemies() {
  if (!boss && Math.random() < 0.02) {
    enemies.push({
      x: Math.random() * (canvas.width - 60),
      y: 0,
      width: 60,
      height: 60,
      health: 10
    });
  }
}

function handleBoss() {
  if (!boss && enemiesSinceLastBoss >= (bossLevel === 1 ? 15 : 20)) {
    const hp = Math.floor(bossHealthBase * Math.pow(1.5, bossLevel - 1));
    boss = {
      x: canvas.width / 2 - 150,
      y: 30,
      width: 300,
      height: 300,
      health: hp,
      maxHealth: hp
    };
    enemiesSinceLastBoss = 0;
  }

  if (boss) {
    ctx.drawImage(bossImg, boss.x, boss.y, boss.width, boss.height);
    drawHealthBar(boss.x, boss.y, boss.health, boss.maxHealth);

    // Boss shoot
    if (Date.now() - bossLastShoot > 1000) {
      bossBullets.push({
        x: boss.x + boss.width / 2 - 5,
        y: boss.y + boss.height,
        width: 10,
        height: 20
      });
      bossLastShoot = Date.now();
    }
  }
}

function drawBossBullets() {
  bossBullets.forEach((b, i) => {
    b.y += 4;
    ctx.fillStyle = 'purple';
    ctx.fillRect(b.x, b.y, b.width, b.height);

    if (
      b.x < spaceship.x + spaceship.width &&
      b.x + b.width > spaceship.x &&
      b.y < spaceship.y + spaceship.height &&
      b.y + b.height > spaceship.y
    ) {
      spaceship.health -= 20;
      bossBullets.splice(i, 1);
      hitSound.cloneNode().play();
      if (spaceship.health <= 0) gameOver();
    }
    if (b.y > canvas.height) bossBullets.splice(i, 1);
  });
}

function collisionDetection() {
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (
        b.x < e.x + e.width &&
        b.x + b.width > e.x &&
        b.y < e.y + e.height &&
        b.y + b.height > e.y
      ) {
        e.health -= 10;
        bullets.splice(bi, 1);
        hitSound.cloneNode().play();
        if (e.health <= 0) {
          enemies.splice(ei, 1);
          explosionSound.cloneNode().play();
          score++;
          enemiesKilled++;
          enemiesSinceLastBoss++;
        }
      }
    });

    if (boss && b.x < boss.x + boss.width && b.x + b.width > boss.x &&
        b.y < boss.y + boss.height && b.y + b.height > boss.y) {
      boss.health -= 10;
      bullets.splice(bi, 1);
      hitSound.cloneNode().play();
      if (boss.health <= 0) {
        explosionSound.cloneNode().play();
        score += 100;
        boss = null;
        laserPowerUp = true;
        laserActive = false;
        lastLaserTime = Date.now();

        spaceship.health += 200;
        playerMaxHealth *= 2;
        spaceship.health = Math.min(spaceship.health, playerMaxHealth);
        bossLevel++;
      }
    }
  });
}

function moveSpaceship() {
  if (keys['ArrowLeft'] && spaceship.x > 0) spaceship.x -= spaceship.speed;
  if (keys['ArrowRight'] && spaceship.x < canvas.width - spaceship.width) spaceship.x += spaceship.speed;
  shoot();
}

function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText(`Score: ${score}`, 10, 20);
  ctx.fillText(`Health: ${Math.floor(spaceship.health)}/${playerMaxHealth}`, 10, 40);
  ctx.fillText(`Boss Level: ${bossLevel}`, 10, 60);
  if (laserPowerUp) {
    ctx.fillStyle = laserActive ? 'lime' : 'orange';
    ctx.fillText(laserActive ? "Laser ACTIVE (Z)" : "Laser Ready (Z)", 10, 80);
  }
}

function drawHealthBar(x, y, current, max) {
  ctx.fillStyle = 'red';
  ctx.fillRect(x, y - 8, 40, 4);
  ctx.fillStyle = 'lime';
  ctx.fillRect(x, y - 8, (current / max) * 40, 4);
}

function gameOver() {
  alert("Game Over! Final Score: " + score);
  document.location.reload();
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSpaceship();
  drawBullets();
  drawLaser();
  drawEnemies();
  drawEnemyBullets();
  handleBoss();
  drawBossBullets();
  spawnEnemies();
  moveSpaceship();
  collisionDetection();
  drawScore();
  requestAnimationFrame(gameLoop);
}

gameLoop();
