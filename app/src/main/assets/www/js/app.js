/* Navigation et boucle d'animation — Pr Hicham MESBAH */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const screens = ["home", "sim", "quiz"];
  let cur = null, running = false, last = 0, ok3d = true;

  const App = (window.App = {
    stage(t) { $("stageLabel").textContent = t; },
    legend(arr) { $("legend").innerHTML = arr.map(([c, n]) => `<span class="lg"><span class="dot" style="background:${c}"></span>${n}</span>`).join(""); },
  });

  function show(id) { screens.forEach((s) => ($(s).hidden = s !== id)); }

  function open(k) {
    if (k === "quiz") { stop(); show("quiz"); Quiz.start(); return; }
    show("sim");
    if (!ok3d) { App.stage("La 3D n'est pas disponible sur cet appareil."); return; }
    const m = SIMS[k];
    if (!m.sc) m.build();
    cur = m;
    $("simTitle").textContent = m.title;
    document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== k));
    App.legend(m.legend);
    requestAnimationFrame(() => { E.setScene(m.sc, m.cam); m.bind(); App.stage(m.stage()); start(); });
  }
  function home() { stop(); cur = null; show("home"); startBg(); }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (cur) cur.update(dt, now / 1000);
    E.render(dt);
    requestAnimationFrame(loop);
  }
  function start() { stopBg(); if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  function stop() { running = false; }

  // Retour Android : renvoie true si l'appli a géré le retour
  window.appBack = function () { if (!$("home").hidden) return false; home(); return true; };

  document.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => open(b.dataset.go)));
  $("back").onclick = home; $("qback").onclick = home; $("qz-home").onclick = home;
  $("qz-again").onclick = () => Quiz.start();
  $("qz-next").onclick = () => Quiz.next();
  $("recenter").onclick = () => cur && E.setCam(cur.cam);

  try { ok3d = E.init($("cv"), $("labels")); } catch (e) { ok3d = false; }

  // ---------- Fond animé de l'accueil : ions qui flottent ----------
  const bg = $("bg"), ctx = bg.getContext("2d");
  const parts = Array.from({ length: 34 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: i % 2 ? 9 : 6, c: i % 2 ? "#35c27a" : "#9b8cff", vx: (Math.random() - 0.5) * 0.02, vy: (Math.random() - 0.5) * 0.02 }));
  let bgOn = false, bgLast = 0;
  function drawBg(now) {
    if (!bgOn) return;
    const dt = Math.min(0.05, (now - bgLast) / 1000); bgLast = now;
    const w = (bg.width = bg.clientWidth * (window.devicePixelRatio || 1)), h = (bg.height = bg.clientHeight * (window.devicePixelRatio || 1));
    const k = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.x = (p.x + p.vx * dt + 1) % 1; p.y = (p.y + p.vy * dt + 1) % 1;
      const g = ctx.createRadialGradient(p.x * w - p.r * k * 0.3, p.y * h - p.r * k * 0.3, 1, p.x * w, p.y * h, p.r * k);
      g.addColorStop(0, "#ffffff"); g.addColorStop(0.25, p.c); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.55; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r * k, 0, 6.283); ctx.fill();
    }
    requestAnimationFrame(drawBg);
  }
  function startBg() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!bgOn) { bgOn = true; bgLast = performance.now(); requestAnimationFrame(drawBg); }
  }
  function stopBg() { bgOn = false; }
  startBg();
})();
