(() => {
  const CELLS = 20;
  const START_INTERVAL = 140; // ms per step
  const MIN_INTERVAL = 70;
  const BEST_KEY = 'snake-best';

  const canvas = document.getElementById('snake-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const overlay = document.getElementById('overlay');
  const overlayMsg = document.getElementById('overlay-msg');
  const overlayBtn = document.getElementById('overlay-btn');

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
  };

  let state = 'idle'; // idle | running | paused | over
  let snake, dir, queue, food, score, best, lastStep, colors;

  function loadBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
  }
  function saveBest() {
    try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* storage unavailable */ }
  }

  function readColors() {
    const css = getComputedStyle(document.documentElement);
    const get = (name) => css.getPropertyValue(name).trim();
    colors = { board: get('--board'), grid: get('--grid'), snake: get('--indigo'), head: get('--ink'), food: get('--accent') };
  }

  function reset() {
    const mid = Math.floor(CELLS / 2);
    snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
    dir = DIRS.right;
    queue = [];
    score = 0;
    scoreEl.textContent = '0';
    placeFood();
  }

  function placeFood() {
    const free = [];
    for (let y = 0; y < CELLS; y++) {
      for (let x = 0; x < CELLS; x++) {
        if (!snake.some((p) => p.x === x && p.y === y)) free.push({ x, y });
      }
    }
    food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  function turn(name) {
    const next = DIRS[name];
    if (!next || state !== 'running') return;
    // Compare against the last queued turn so two quick presses can't reverse the snake.
    const last = queue.length ? queue[queue.length - 1] : dir;
    if (next.x === -last.x && next.y === -last.y) return;
    if (next === last || queue.length >= 2) return;
    queue.push(next);
  }

  function step() {
    if (queue.length) dir = queue.shift();
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const ate = food && head.x === food.x && head.y === food.y;
    if (!ate) snake.pop();

    const hitWall = head.x < 0 || head.y < 0 || head.x >= CELLS || head.y >= CELLS;
    if (hitWall || snake.some((p) => p.x === head.x && p.y === head.y)) return end('Game over');

    snake.unshift(head);
    if (ate) {
      score++;
      scoreEl.textContent = String(score);
      placeFood();
      if (!food) return end('You win!');
    }
  }

  function end(message) {
    state = 'over';
    if (score > best) {
      best = score;
      bestEl.textContent = String(best);
      saveBest();
    }
    showOverlay(`${message} · ${score}`, 'Play again');
  }

  function showOverlay(message, label) {
    overlayMsg.textContent = message;
    overlayBtn.textContent = label;
    overlay.hidden = false;
  }

  function start() {
    reset();
    resume();
  }

  function resume() {
    state = 'running';
    overlay.hidden = true;
    lastStep = performance.now();
    canvas.focus({ preventScroll: true });
    requestAnimationFrame(frame);
  }

  function pause() {
    if (state !== 'running') return;
    state = 'paused';
    showOverlay('Paused', 'Resume');
  }

  function frame(now) {
    if (state !== 'running') return;
    const interval = Math.max(MIN_INTERVAL, START_INTERVAL - score * 3);
    if (now - lastStep >= interval) {
      lastStep = now;
      step();
    }
    draw();
    if (state === 'running') requestAnimationFrame(frame);
  }

  function resize() {
    const size = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1));
    if (size && canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    draw();
  }

  function cell(p, size, inset, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(p.x * size + inset, p.y * size + inset, size - inset * 2, size - inset * 2, radius);
    ctx.fill();
  }

  function draw() {
    const size = canvas.width / CELLS;
    ctx.fillStyle = colors.board;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = colors.grid;
    for (let y = 0; y < CELLS; y++) {
      for (let x = (y % 2); x < CELLS; x += 2) ctx.fillRect(x * size, y * size, size, size);
    }

    if (food) {
      ctx.fillStyle = colors.food;
      ctx.beginPath();
      ctx.arc((food.x + 0.5) * size, (food.y + 0.5) * size, size * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = snake.length - 1; i >= 0; i--) {
      cell(snake[i], size, size * 0.08, size * 0.25, i === 0 ? colors.head : colors.snake);
    }
  }

  // Input
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (key === ' ') {
      if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return;
      if (state === 'running') { e.preventDefault(); pause(); }
      else if (state === 'paused') { e.preventDefault(); resume(); }
      else if (document.activeElement === canvas) { e.preventDefault(); start(); }
      return;
    }
    if (KEYS[key] && state === 'running') {
      e.preventDefault(); // keep arrow keys from scrolling the page mid-game
      turn(KEYS[key]);
    }
  });

  overlayBtn.addEventListener('click', () => (state === 'paused' ? resume() : start()));

  document.querySelectorAll('.dpad button').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      turn(btn.dataset.dir);
    });
  });

  let touchStart = null;
  canvas.addEventListener('pointerdown', (e) => { touchStart = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointermove', (e) => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    touchStart = { x: e.clientX, y: e.clientY };
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
    canvas.addEventListener(type, () => { touchStart = null; });
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);
  window.addEventListener('resize', resize);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); draw(); });

  // Init
  best = loadBest();
  bestEl.textContent = String(best);
  document.getElementById('year').textContent = String(new Date().getFullYear());
  readColors();
  reset();
  resize();
})();
