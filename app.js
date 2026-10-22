(() => {
  'use strict';

  const LY = window.EIRA_LAYOUT;
  const SW = 976, SH = 2122;                       // 홈 영상(스테이지) 기준 좌표계
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 카드 순서 = 페이지 순서 / obj = 홈 사물함 속 물건
  const MEMBERS = [
    { id: 'joo',   obj: 'mp3',  name: '주아' },
    { id: 'daon',  obj: 'pick', name: '다온' },
    { id: 'seo',   obj: 'key',  name: '서윤' },
    { id: 'jian',  obj: 'cam',  name: '지안' },
    { id: 'jaein', obj: 'note', name: '재인' },
  ];
  const OBJ_ORDER = ['pick', 'mp3', 'cam', 'key', 'note', 'logo'];   // 앞에 놓인 물건부터 판정
  const LINKS = {
    like: 'https://www.instagram.com/lf_eira?xtok=NnV4ZzE1M2Z0N3Vk&utm_source=qr',
    pin:  'https://kr.pinterest.com/shin02sy1010/lost-found/',
  };
  const DOCK = [   // 하단 서랍 버튼 (영상 좌표 기준 중심)
    { id: 'rec',   label: '유튜브',     cx: 196, cy: 1940, soon: true },   // 링크 준비되면 href: 'https://...' 로 교체
    { id: 'music', label: '음원 듣기',   cx: 408, cy: 1932 },
    { id: 'like',  label: '인스타그램',  cx: 607, cy: 1941, href: LINKS.like },
    { id: 'pin',   label: '핀터레스트',  cx: 808, cy: 1920, href: LINKS.pin },
  ];

  /* ───────────────────────── 화면 크기 맞춤 ─────────────────────────
     · 항상 화면 '폭'에 꽉 채움.
     · 화면이 짧으면 디자인 위·아래의 빈 여백(cT/cB: 잘라도 되는 비율)부터 잘라냄.
     · 그래도 모자라면 전체를 조금 줄이되, 양옆 빈틈은 가로로 늘리지 않고
       나머지는 흐린 배경으로 이어 붙임. 화면이 더 길면 양옆을 살짝 잘라 높이를 채움. */
  const STAGES = [
    { sel: '#homeStage',  A: 976 / 2122,   cT: 0.10, cB: 0.025, topFirst: true },   // 위: 줄만 있는 벽(먼저 자름) / 아래: 서랍 하단 여백(최소한만)
    { sel: '#cardStage',  A: 1017 / 2211,  cT: 0.045, cB: 0.11 },
    { sel: '#musicStage', A: 1017 / 2211,  cT: 0.045, cB: 0.06 },
  ];
  const MAX_STRETCH = 0;
  function fitStages() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const desktop = vw / vh > 0.72;
    document.documentElement.classList.toggle('is-desktop', desktop);
    STAGES.forEach((st) => {
      const el = $(st.sel);
      let W, H, x = 0, y = 0;
      if (desktop) { H = vh; W = H * st.A; x = (vw - W) / 2; }
      else {
        const Hw = vw / st.A;
        if (Hw <= vh) { H = vh; W = H * st.A; x = (vw - W) / 2; }
        else {
          const over = Hw - vh, cropMax = (st.cT + st.cB) * Hw;
          if (over <= cropMax) {
            H = Hw; W = vw;
            y = st.topFirst ? -Math.min(over, st.cT * Hw) : -over * st.cT / (st.cT + st.cB);   // topFirst: 위부터 자르고 아래는 나중에
          }
          else {
            H = vh / (1 - st.cT - st.cB); y = -st.cT * H;
            W = Math.min(vw, H * st.A * (1 + MAX_STRETCH)); x = (vw - W) / 2;
          }
        }
      }
      const f = (n) => n.toFixed(2) + 'px';
      el.style.setProperty('--st-w', f(W)); el.style.setProperty('--st-h', f(H));
      el.style.setProperty('--st-x', f(x)); el.style.setProperty('--st-y', f(y));
    });
  }
  fitStages();
  window.addEventListener('resize', fitStages);
  window.addEventListener('orientationchange', () => setTimeout(fitStages, 120));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitStages);

  /* ───────────────────────── 화면 전환 ───────────────────────── */
  const cardsEl = $('#cards'), musicEl = $('#music'), homeEl = $('#home');
  const show = (el) => { el.classList.add('is-active'); el.setAttribute('aria-hidden', 'false'); };
  const hide = (el) => { el.classList.remove('is-active'); el.setAttribute('aria-hidden', 'true'); };

  function openCards(i) {
    Cards.ensure();
    Cards.goto(i, false);
    show(cardsEl);
    Cards.activate();
    history.pushState({ s: 'cards' }, '', '#cards');
  }
  function openMusic() {
    show(musicEl);
    history.pushState({ s: 'music' }, '', '#music');
  }
  function goHome() {
    if (history.state && history.state.s) history.back(); else syncFromState();
  }
  function syncFromState() {
    const s = history.state && history.state.s;
    if (s !== 'cards') { hide(cardsEl); Cards.deactivate(); }
    if (s !== 'music') hide(musicEl);
  }
  window.addEventListener('popstate', syncFromState);
  history.replaceState(null, '', location.pathname + location.search);   // 새로고침 시 항상 홈에서 시작
  $('#cardsBack').addEventListener('click', goHome);
  $('#musicBack').addEventListener('click', goHome);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && history.state && history.state.s) goHome();
    if (cardsEl.classList.contains('is-active')) {
      if (e.key === 'ArrowLeft') Cards.step(-1);
      if (e.key === 'ArrowRight') Cards.step(1);
    }
  });

  /* ───────────────────────── 기울기 센서 ───────────────────────── */
  const Motion = (() => {
    const st = { has: false, x: 0, y: 0, t: 0, base: null };
    let listening = false, asked = false;
    const needsPermission = typeof DeviceOrientationEvent !== 'undefined' &&
                            typeof DeviceOrientationEvent.requestPermission === 'function';
    const wrap = (d) => (d > 180 ? d - 360 : d < -180 ? d + 360 : d);

    function onOri(e) {
      if (e.gamma == null || e.beta == null) return;
      const ang = (screen.orientation && screen.orientation.angle) || 0;
      let x = e.gamma, y = e.beta;
      if (ang === 90)       { x = e.beta;   y = -e.gamma; }
      else if (ang === 270 || ang === -90) { x = -e.beta; y = e.gamma; }
      else if (ang === 180) { x = -e.gamma; y = -e.beta; }
      st.x = x; st.y = y; st.t = performance.now(); st.has = true;
    }
    function listen() {
      if (listening || typeof DeviceOrientationEvent === 'undefined') return;
      window.addEventListener('deviceorientation', onOri, true);
      listening = true;
    }
    // iOS는 사용자 터치 안에서만 권한을 요청할 수 있음
    async function request() {
      if (listening || asked) return;
      asked = true;
      try {
        if (needsPermission) {
          const r = await DeviceOrientationEvent.requestPermission();
          if (r !== 'granted') return;
        }
        listen();
      } catch (_) { /* 센서 없음/거부 → 드래그 모드 */ }
    }
    if (!needsPermission) listen();

    return {
      request,
      recenter() { st.base = null; },
      live() { return st.has && performance.now() - st.t < 1500; },
      tilt(dt) {
        if (!this.live()) return null;
        if (!st.base) st.base = { x: st.x, y: st.y };
        const k = 1 - Math.exp(-dt / 12);              // 자세가 바뀌면 기준점이 천천히 따라옴
        st.base.x += wrap(st.x - st.base.x) * k;
        st.base.y += wrap(st.y - st.base.y) * k;
        const RANGE = 22;                               // 이 각도(°)에서 최대 기울기
        return {
          nx: clamp(wrap(st.x - st.base.x) / RANGE, -1, 1),
          ny: clamp(-wrap(st.y - st.base.y) / RANGE, -1, 1),
        };
      },
    };
  })();

  /* ───────────────────────── 홈 ───────────────────────── */
  const door = $('#door'), homeStage = $('#homeStage');
  const objsEl = $('#objs'), dockEl = $('#dock');
  let opened = false, busy = false, doorStartedAt = 0, started = false;

  function setOpened() {
    if (opened) return;
    opened = true;
    homeEl.classList.add('is-opened');
  }
  function startDoor() {
    if (started) return;
    started = true;
    doorStartedAt = performance.now();
    const p = door.play();
    if (p && p.catch) p.catch(() => { started = false; });   // 재생이 막힌 경우(저전력 모드 등) 다시 누르면 재시도
  }
  door.addEventListener('ended', setOpened);
  door.addEventListener('error', setOpened);
  door.addEventListener('playing', () => { doorStartedAt = performance.now(); setTimeout(() => Cards.ensure(), 1200); });
  homeStage.addEventListener('pointerdown', () => {            // 영상 도중 터치하면 건너뛰기
    if (!opened && !door.paused && door.duration && performance.now() - doorStartedAt > 700) {
      door.currentTime = Math.max(0, door.duration - 0.04);
    }
  });
  if (reduceMotion) setOpened();      // 그 외에는 사용자가 문을 누르면 startDoor()

  // 줄에 걸린 로고: 터치하면 흔들림
  const logoEl = $('#logoSwing');
  Object.assign(logoEl.style, {
    left: (LY.logo.x / SW * 100) + '%', top: (LY.logo.y / SH * 100) + '%',
    width: (LY.logo.w / SW * 100) + '%', height: (LY.logo.h / SH * 100) + '%',
  });
  function swingLogo() {
    logoEl.classList.remove('swing'); void logoEl.offsetWidth;
    if (!reduceMotion) logoEl.classList.add('swing');
  }
  logoEl.addEventListener('animationend', () => logoEl.classList.remove('swing'));
  if (logoEl.decode) logoEl.decode().catch(() => {});      // 문이 열리기 전에 미리 디코딩해 둠(열리는 순간 깨져 보이는 것 방지)

  // 물건 컷아웃(팝 효과 + 정확한 터치 판정용)
  const BOX = Object.assign({}, LY.objs, { logo: LY.logo });
  const objEls = {}, masks = {};
  function makeMask(k, img) {
    try {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, c.width, c.height);     // 이미지가 해상도별(srcset)로 바뀌어도 전체가 캔버스에 들어오도록 크기를 지정
      masks[k] = { data: x.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
    } catch (_) { /* file:// 등에서 막히면 사각형 판정으로 대체 */ }
  }
  Object.entries(LY.objs).forEach(([k, o]) => {
    const img = new Image();
    img.className = 'obj'; img.alt = ''; img.draggable = false;
    Object.assign(img.style, {
      left: (o.x / SW * 100) + '%', top: (o.y / SH * 100) + '%',
      width: (o.w / SW * 100) + '%', height: (o.h / SH * 100) + '%',
    });
    img.addEventListener('animationend', () => img.classList.remove('pop'));
    img.addEventListener('load', () => makeMask(k, img));
    img.src = `assets/cut-${k}.webp`;
    objsEl.appendChild(img);
    objEls[k] = img;
  });

  if (logoEl.complete && logoEl.naturalWidth) makeMask('logo', logoEl);
  else logoEl.addEventListener('load', () => makeMask('logo', logoEl));

  function alphaAt(k, sx, sy) {
    const o = BOX[k];
    const lx = (sx - o.x) / o.w, ly = (sy - o.y) / o.h;
    if (lx < 0 || ly < 0 || lx >= 1 || ly >= 1) return 0;
    const m = masks[k];
    if (!m) return 255;
    return m.data[((Math.floor(ly * m.h)) * m.w + Math.floor(lx * m.w)) * 4 + 3];
  }
  function pickObject(cx, cy) {
    const r = homeStage.getBoundingClientRect();
    const s = r.width / SW;                         // 가로·세로 배율이 조금 다를 수 있음
    const sx = (cx - r.left) / s, sy = (cy - r.top) / (r.height / SH);
    for (const tol of [0, 10, 20, 30]) {            // 손가락 오차 허용(px) — 가까운 물건부터 넓혀가며 탐색
      const d = tol / s;
      const pts = d ? [[d,0],[-d,0],[0,d],[0,-d],[d*.7,d*.7],[-d*.7,d*.7],[d*.7,-d*.7],[-d*.7,-d*.7]] : [[0,0]];
      for (const k of OBJ_ORDER) for (const [dx, dy] of pts) if (alphaAt(k, sx + dx, sy + dy) > 40) return k;
    }
    // 이미지 판독이 안 되는 기종에서도 로고가 반응하도록: 로고(줄 포함) 영역 전체를 사각형으로도 판정
    const lg = LY.logo, m = 10;
    if (sx >= lg.x - m && sx <= lg.x + lg.w + m && sy >= lg.y - m && sy <= lg.y + lg.h + m) return 'logo';
    return null;
  }

  // 문 영역(영상 좌표) — 닫힌 문을 누르면 열림
  const DOOR = { x0: 40, x1: 936, y0: 520, y1: 1730 };
  function inDoor(e) {
    const r = homeStage.getBoundingClientRect();
    const x = (e.clientX - r.left) / (r.width / SW), y = (e.clientY - r.top) / (r.height / SH);
    return x >= DOOR.x0 && x <= DOOR.x1 && y >= DOOR.y0 && y <= DOOR.y1;
  }
  homeStage.addEventListener('click', (e) => {
    if (!opened && !started && inDoor(e)) { startDoor(); return; }
    if (!opened || busy) return;
    if (e.target.closest('.dock')) return;
    const k = pickObject(e.clientX, e.clientY);
    if (!k) return;
    if (k === 'logo') { swingLogo(); return; }
    busy = true;
    Motion.request();                               // 사용자 터치 안에서 호출해야 iOS 권한창이 뜸
    const el = objEls[k];
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    const idx = MEMBERS.findIndex((m) => m.obj === k);
    setTimeout(() => { openCards(idx); busy = false; }, 340);
  });

  // 안내 팝업(토스트)
  const toastEl = $('#toast');
  let toastTimer = 0;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 1800);
  }

  // 하단 서랍 버튼
  DOCK.forEach((d) => {
    const a = document.createElement('a');
    a.setAttribute('aria-label', d.label);
    a.href = d.href || (d.soon ? '#' : '#music');
    if (d.href) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    const w = 160, h = 150;
    Object.assign(a.style, {
      left: (d.cx / SW * 100) + '%', top: (d.cy / SH * 100) + '%',
      width: (w / SW * 100) + '%', height: (h / SH * 100) + '%',
    });
    a.addEventListener('pointerdown', () => { a.classList.remove('press'); void a.offsetWidth; a.classList.add('press'); });
    if (d.soon) a.addEventListener('click', (e) => { e.preventDefault(); showToast('준비 중입니다.'); });
    else if (!d.href) a.addEventListener('click', (e) => { e.preventDefault(); openMusic(); });
    dockEl.appendChild(a);
  });

  /* ───────────────────────── 카드 ───────────────────────── */
  const Cards = (() => {
    const track = $('#track'), pager = $('#pager'), stage = $('#cardStage');
    const prevBtn = $('#navPrev'), nextBtn = $('#navNext');
    const MAXROT = 16;                              // 최대 회전각(°)
    let built = false, slides = [], dots = [];
    let index = 0, active = false, raf = 0, lastT = 0, enterTimer = 0;
    const ptr = { on: false, nx: 0, ny: 0 };

    function build() {
      MEMBERS.forEach((m, i) => {
        const P = LY.place[m.id];
        const el = document.createElement('div');
        el.className = 'slide';
        el.innerHTML = `
          <img class="logo" src="assets/${m.id}-logo.webp" alt="${m.name}" draggable="false"
               style="left:${P.logo.cx * 100}%;top:${P.logo.cy * 100}%;width:${P.logo.w * 100}%">
          <img class="type" src="assets/${m.id}-type.webp" alt="" draggable="false"
               style="left:${P.type.cx * 100}%;top:${P.type.cy * 100}%;width:${P.type.w * 100}%">
          <div class="card" role="img" aria-label="${m.name} 포토카드" style="--mask:url(assets/${m.id}-card1.webp)">
            <div class="card__shadow"></div>
            <div class="card__rot">
              <img class="card__face card__face--a" src="assets/${m.id}-card1.webp" alt="" draggable="false">
              <img class="card__face card__face--b" src="assets/${m.id}-card2.webp" alt="" draggable="false">
              <div class="card__fx">
                <div class="fx-holo"></div><div class="fx-sparkle"></div>
                <div class="fx-glare"></div><div class="fx-edge"></div>
              </div>
            </div>
          </div>`;
        track.appendChild(el);
        slides.push({
          el, card: $('.card', el), rot: $('.card__rot', el), faceB: $('.card__face--b', el),
          c: { nx: 0, ny: 0, fx: 0, flip: 0 },
        });
        const b = document.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', m.name);
        b.addEventListener('click', () => goto(i, true));
        pager.appendChild(b); dots.push(b);
      });
      built = true;
      layout();
    }
    function ensure() { if (!built) build(); }

    function layout() {
      slides.forEach((s, j) => {
        const off = j - index;
        s.el.style.setProperty('--off', off);
        s.el.style.visibility = Math.abs(off) > 1 ? 'hidden' : '';
        s.el.setAttribute('aria-hidden', off === 0 ? 'false' : 'true');
      });
      dots.forEach((d, j) => { d.classList.toggle('is-on', j === index); d.setAttribute('aria-selected', j === index); });
      prevBtn.disabled = index === 0; nextBtn.disabled = index === MEMBERS.length - 1;
    }
    function goto(i, animate) {
      ensure();
      const n = clamp(i, 0, MEMBERS.length - 1);
      if (!animate) track.classList.add('dragging');
      if (n !== index) { resetTilt(slides[index]); Motion.recenter(); }
      index = n;
      layout();
      if (!animate) { void track.offsetWidth; track.classList.remove('dragging'); }
    }
    function step(d) { if (built) goto(index + d, true); }

    function resetTilt(s) { s.c.nx = s.c.ny = s.c.fx = s.c.flip = 0; paint(s, true); }

    // 한 장면 그리기: CSS 변수로 회전/홀로그램 위치 전달
    function paint(s, force) {
      const { nx, ny, fx, flip } = s.c;
      const el = s.card;
      el.style.setProperty('--ry', (-nx * MAXROT).toFixed(2));
      el.style.setProperty('--rx', (ny * MAXROT).toFixed(2));
      el.style.setProperty('--sc', (1 + fx * 0.03).toFixed(4));
      const px = 50 + nx * 50, py = 50 + ny * 50;
      el.style.setProperty('--px', px.toFixed(1) + '%');
      el.style.setProperty('--py', py.toFixed(1) + '%');
      el.style.setProperty('--bgx', px.toFixed(1) + '%');
      el.style.setProperty('--bgy', py.toFixed(1) + '%');
      el.style.setProperty('--gp', (50 + (nx * 0.75 + ny * 0.45) * 70).toFixed(1) + '%');   // 빛줄기 위치(대각선 이동)
      el.style.setProperty('--fx', fx.toFixed(3));
      el.style.setProperty('--flip', flip.toFixed(3));
      el.style.setProperty('--sx', (-nx * 16).toFixed(1));
      el.style.setProperty('--sy', (-ny * 16).toFixed(1));
    }

    function frame(t) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
      const s = slides[index];
      let nx = 0, ny = 0, inter = 0;
      const g = Motion.tilt(dt);
      if (g) { nx = g.nx; ny = g.ny; inter = 0.3 + Math.min(1, Math.hypot(nx, ny)) * 0.7; }
      else if (ptr.on) { nx = ptr.nx; ny = ptr.ny; inter = 1; }
      // 렌티큘러: 어느 방향이든 일정 각도 이상 기울이면 아랫면
      const ft = smooth(0.3, 0.62, Math.hypot(nx, ny * 0.85));
      const a = 1 - Math.exp(-dt * 9), af = 1 - Math.exp(-dt * 13);
      const c = s.c;
      c.nx += (nx - c.nx) * a; c.ny += (ny - c.ny) * a;
      c.fx += (inter - c.fx) * af; c.flip += (ft - c.flip) * af;
      paint(s);
    }
    function activate() {
      if (active) return;
      active = true; lastT = performance.now();
      Motion.recenter();
      const s = slides[index];
      s.el.classList.add('is-entering');
      clearTimeout(enterTimer);
      enterTimer = setTimeout(() => s.el.classList.remove('is-entering'), 900);
      raf = requestAnimationFrame(frame);
    }
    function deactivate() {
      if (!active) return;
      active = false; cancelAnimationFrame(raf);
      slides.forEach((s) => resetTilt(s));
      ptr.on = false;
    }

    /* 포인터: 마우스는 카드 근처에서 기울기, 터치는 센서가 없을 때만 드래그로 기울기 */
    function pointerTilt(e) {
      const r = slides[index].card.getBoundingClientRect();
      ptr.nx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 0.6), -1, 1);
      ptr.ny = clamp((e.clientY - (r.top + r.height / 2)) / (r.height * 0.6), -1, 1);
      ptr.on = true;
    }
    stage.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !sw) pointerTilt(e); });
    stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') ptr.on = false; });

    /* 스와이프 */
    let sw = null;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const onCard = !!e.target.closest('.card');
      sw = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), onCard,
             gyro: Motion.live(), touch: e.pointerType !== 'mouse', swiping: false, dx: 0 };
      if (sw.touch && onCard && !sw.gyro) pointerTilt(e);
      try { track.setPointerCapture(e.pointerId); } catch (_) {}
    });
    track.addEventListener('pointermove', (e) => {
      if (!sw || e.pointerId !== sw.id) return;
      const dx = e.clientX - sw.x0, dy = e.clientY - sw.y0;
      const canSwipe = sw.touch ? (sw.gyro || !sw.onCard) : !sw.onCard;
      if (!sw.swiping && canSwipe && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        sw.swiping = true; track.classList.add('dragging'); ptr.on = false;
      }
      if (sw.touch && sw.onCard && !sw.gyro && !sw.swiping) pointerTilt(e);
      if (sw.swiping) {
        let d = dx;
        if ((index === 0 && d > 0) || (index === MEMBERS.length - 1 && d < 0)) d *= 0.35;
        sw.dx = d;
        track.style.setProperty('--drag', d + 'px');
      }
    });
    const endSwipe = (e) => {
      if (!sw || e.pointerId !== sw.id) return;
      const dx = e.clientX - sw.x0, dy = e.clientY - sw.y0;
      const dt = Math.max(1, performance.now() - sw.t0), v = dx / dt;
      const w = stage.getBoundingClientRect().width;
      let dir = 0;
      if (sw.swiping) {
        if (Math.abs(dx) > w * 0.18 || Math.abs(v) > 0.45) dir = dx < 0 ? 1 : -1;
      } else if (sw.touch && sw.onCard && !sw.gyro && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(v) > 0.8) {
        dir = dx < 0 ? 1 : -1;                      // 카드 위에서의 빠른 플릭도 페이지 이동
      }
      track.classList.remove('dragging');
      track.style.setProperty('--drag', '0px');
      if (sw.touch) ptr.on = false;
      sw = null;
      if (dir) goto(index + dir, true);
    };
    track.addEventListener('pointerup', endSwipe);
    track.addEventListener('pointercancel', endSwipe);

    prevBtn.addEventListener('click', () => step(-1));
    nextBtn.addEventListener('click', () => step(1));
    document.addEventListener('visibilitychange', () => { if (document.hidden) ptr.on = false; });

    return { ensure, goto, step, activate, deactivate };
  })();

  // 스크롤/줌 제스처로 화면이 밀리지 않도록
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
})();
