// ===== MATH ARCADE CORE =====
// Global utilities, classroom management, leaderboard, sessions

const MathArcade = (() => {

  // ------- Storage Helpers -------
  const store = {
    get: (key, def = null) => {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
    },
    set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch { } },
    del: (key) => { try { localStorage.removeItem(key); } catch { } }
  };

  // ------- Session Management -------
  const Session = {
    KEY: 'matharcade_session',
    get() { return store.get(this.KEY); },
    set(data) { store.set(this.KEY, { ...this.get(), ...data, updatedAt: Date.now() }); },
    login(name, role = 'student', classroomId = null) {
      const id = 'user_' + Math.random().toString(36).substr(2, 9);
      store.set(this.KEY, { id, name, role, classroomId, loginAt: Date.now() });
      return id;
    },
    logout() { store.del(this.KEY); },
    isLoggedIn() { return !!this.get(); },
    isTeacher() { return this.get()?.role === 'teacher'; }
  };

  // ------- Classroom Management -------
  const Classroom = {
    KEY: 'matharcade_classrooms',

    getAll() { return store.get(this.KEY, {}); },

    create(name, teacherName) {
      const rooms = this.getAll();
      const code = this._genCode();
      const id = 'class_' + Date.now();
      rooms[id] = {
        id, name, code,
        teacherName,
        createdAt: Date.now(),
        students: [],
        activeGame: null
      };
      store.set(this.KEY, rooms);
      Session.login(teacherName, 'teacher', id);
      return { id, code };
    },

    join(code, studentName) {
      const rooms = this.getAll();
      const room = Object.values(rooms).find(r => r.code === code.toUpperCase());
      if (!room) return null;
      const studentId = Session.login(studentName, 'student', room.id);
      room.students = room.students.filter(s => s.id !== studentId);
      room.students.push({ id: studentId, name: studentName, joinedAt: Date.now() });
      store.set(this.KEY, rooms);
      return room;
    },

    getById(id) { return this.getAll()[id] || null; },

    getByCode(code) {
      return Object.values(this.getAll()).find(r => r.code === code.toUpperCase()) || null;
    },

    _genCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    }
  };

  // ------- Leaderboard -------
  const Leaderboard = {
    KEY: 'matharcade_scores',

    getAll() { return store.get(this.KEY, {}); },

    submit(gameId, score, extra = {}) {
      const session = Session.get();
      if (!session) return;
      const all = this.getAll();
      if (!all[gameId]) all[gameId] = [];
      all[gameId].push({
        userId: session.id,
        userName: session.name,
        classroomId: session.classroomId,
        score,
        timestamp: Date.now(),
        ...extra
      });
      // Keep top 200 per game
      all[gameId].sort((a, b) => b.score - a.score);
      if (all[gameId].length > 200) all[gameId] = all[gameId].slice(0, 200);
      store.set(this.KEY, all);
    },

    getForGame(gameId, classroomId = null) {
      const all = this.getAll()[gameId] || [];
      if (classroomId) return all.filter(e => e.classroomId === classroomId);
      return all;
    },

    getForUser(userId, gameId = null) {
      const all = this.getAll();
      const entries = [];
      for (const [gId, scores] of Object.entries(all)) {
        if (gameId && gId !== gameId) continue;
        scores.filter(s => s.userId === userId).forEach(s => entries.push({ ...s, gameId: gId }));
      }
      return entries;
    },

    renderTable(entries, container, columns = ['rank', 'name', 'score', 'time', 'date']) {
      const thead = columns.map(c => `<th>${c.toUpperCase()}</th>`).join('');
      const tbody = entries.slice(0, 20).map((e, i) => {
        const rankClass = i < 3 ? `rank-${i + 1}` : '';
        const rankEmoji = ['🥇', '🥈', '🥉'][i] || `#${i + 1}`;
        const cells = columns.map(c => {
          if (c === 'rank') return `<td>${rankEmoji}</td>`;
          if (c === 'name') return `<td>${e.userName}</td>`;
          if (c === 'score') return `<td class="neon-green">${e.score}</td>`;
          if (c === 'time') return `<td>${e.timeTaken ? formatTime(e.timeTaken) : '-'}</td>`;
          if (c === 'correct') return `<td class="neon-cyan">${e.correct ?? '-'} / ${e.total ?? '-'}</td>`;
          if (c === 'date') return `<td>${new Date(e.timestamp).toLocaleDateString()}</td>`;
          return '<td>-</td>';
        }).join('');
        return `<tr class="${rankClass}">${cells}</tr>`;
      }).join('');
      container.innerHTML = `
        <table class="leaderboard-table">
          <thead><tr>${thead}</tr></thead>
          <tbody>${tbody || '<tr><td colspan="99" style="text-align:center;color:var(--text-dim)">NO SCORES YET</td></tr>'}</tbody>
        </table>`;
    }
  };

  // ------- Utility Functions -------
  function formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    const s = (ms / 1000).toFixed(2);
    return `${s}s`;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomDigits(digits) {
    if (digits <= 0) return 0;
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return randomInt(min, max);
  }

  function showNotif(msg, type = 'green') {
    const existing = document.querySelector('.notif');
    if (existing) existing.remove();
    const colors = { green: 'pixel-box', cyan: 'pixel-box cyan-box', pink: 'pixel-box pink-box', yellow: 'pixel-box yellow-box' };
    const n = document.createElement('div');
    n.className = `notif ${colors[type] || 'pixel-box'}`;
    n.innerHTML = `<span class="neon-${type}">${msg}</span>`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showNotif('COPIED TO CLIPBOARD!', 'cyan'));
  }

  function createTimer(durationMs, onTick, onEnd) {
    let startTime = Date.now();
    let remaining = durationMs;
    let rafId = null;
    let paused = false;
    let pauseStart = null;

    function tick() {
      if (paused) return;
      const elapsed = Date.now() - startTime;
      remaining = Math.max(0, durationMs - elapsed);
      onTick(remaining, elapsed);
      if (remaining <= 0) { onEnd(); return; }
      rafId = requestAnimationFrame(tick);
    }

    return {
      start() { startTime = Date.now(); tick(); },
      stop() { if (rafId) cancelAnimationFrame(rafId); },
      pause() { paused = true; pauseStart = Date.now(); if (rafId) cancelAnimationFrame(rafId); },
      resume() {
        if (!paused) return;
        startTime += Date.now() - pauseStart;
        paused = false;
        tick();
      },
      getRemaining() { return remaining; }
    };
  }

  function spawnFloatingNumbers() {
    const nums = '0123456789+-×÷=';
    setInterval(() => {
      if (document.querySelectorAll('.floating-num').length > 20) return;
      const el = document.createElement('span');
      el.className = 'floating-num';
      el.textContent = nums[randomInt(0, nums.length - 1)];
      el.style.left = randomInt(0, 95) + '%';
      el.style.animationDuration = randomInt(8, 20) + 's';
      el.style.animationDelay = '0s';
      el.style.fontSize = randomInt(8, 18) + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 21000);
    }, 1500);
  }

  function setupModal(modalId, openBtnId, closeBtnClass = '.modal-close') {
    const overlay = document.getElementById(modalId);
    if (!overlay) return;
    const openBtn = document.getElementById(openBtnId);
    if (openBtn) openBtn.addEventListener('click', () => overlay.classList.add('active'));
    overlay.querySelectorAll(closeBtnClass).forEach(btn => {
      btn.addEventListener('click', () => overlay.classList.remove('active'));
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
  }

  function addCRTCorners() {
    const positions = ['tl', 'tr', 'bl', 'br'];
    positions.forEach(p => {
      const div = document.createElement('div');
      div.className = `crt-corner ${p}`;
      document.body.appendChild(div);
    });
  }

  function renderNav(activePage = '') {
    const session = Session.get();
    const name = session ? session.name : '';
    const roleLabel = session ? (session.role === 'teacher' ? '👩‍🏫 TEACHER' : '🎮 STUDENT') : '';
    return `
    <nav class="navbar">
      <div class="navbar-brand">
        <span class="neon-green">MATH</span><span class="neon-cyan">ARCADE</span>
        <span style="font-size:8px;color:var(--neon-pink);margin-left:8px;">v2.0</span>
      </div>
      <ul class="navbar-nav" id="main-nav">
        <li><a href="../index.html" ${activePage === 'home' ? 'style="color:var(--neon-green)"' : ''}>HOME</a></li>
        <li><a href="../pages/classroom.html" ${activePage === 'classroom' ? 'style="color:var(--neon-green)"' : ''}>CLASSROOM</a></li>
        <li><a href="../pages/leaderboard.html" ${activePage === 'leaderboard' ? 'style="color:var(--neon-green)"' : ''}>LEADERBOARD</a></li>
        ${session ? `<li><span style="color:var(--neon-yellow);font-size:7px">▶ ${name}</span></li>
        <li><button class="btn btn-sm btn-pink" onclick="MathArcade.Session.logout();window.location.href='../index.html'">EXIT</button></li>` :
        `<li><button class="btn btn-sm btn-green" onclick="window.location.href='../index.html'">LOGIN</button></li>`}
      </ul>
    </nav>`;
  }

  return { Session, Classroom, Leaderboard, formatTime, randomInt, randomDigits, showNotif, copyToClipboard, createTimer, spawnFloatingNumbers, setupModal, addCRTCorners, renderNav };
})();

// Make globally accessible
window.MathArcade = MathArcade;
