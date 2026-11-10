/* Les cinq simulations 3D — Pr Hicham MESBAH */
(function (global) {
  "use strict";
  const { V3, Q } = E;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COL = { Na: 0x9b8cff, Cl: 0x35c27a, O: 0xe5484d, H: 0xf2f4f7, C: 0x6b7584, bond: 0xaab5c4, e: 0xffd166,
    Cu: 0x3b82f6, Fe: 0xe07a2e, Al: 0xd8a7c7, SO4: 0xf2b632, metal: 0x9aa4b2, wire: 0xc9a36b };
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const UP = [0, 1, 0];
  const $ = (id) => document.getElementById(id);
  const fr = (x, d) => Number(x.toPrecision(d || 3)).toString().replace(".", ",");

  // molécule d'eau : O au centre, les deux H vers −y local
  const A = (52.25 * Math.PI) / 180, D = 0.27, LH1 = [Math.sin(A) * D, -Math.cos(A) * D, 0], LH2 = [-Math.sin(A) * D, -Math.cos(A) * D, 0];
  function water(sc) { return { O: sc.ball(COL.O, 0.2), H1: sc.ball(COL.H, 0.12), H2: sc.ball(COL.H, 0.12) }; }
  function placeWater(w, p, q) { w.O.p = p; w.H1.p = V3.add(p, Q.rot(q, LH1)); w.H2.p = V3.add(p, Q.rot(q, LH2)); }
  const isNa = (i, j, k) => (((i + j + k) % 2) + 2) % 2 === 0;

  // =====================================================================
  const crystal = {
    title: "Cristal NaCl", cam: { theta: 0.65, phi: 1.1, dist: 6.3 },
    legend: [["#9b8cff", "Na⁺"], ["#35c27a", "Cl⁻"]],
    compact: true, r: 1, neighbors: false, rot: !reduce,
    build() {
      const sc = (this.sc = new E.Scene()), seg = []; this.ions = [];
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
        const na = isNa(i, j, k), it = sc.ball(na ? COL.Na : COL.Cl, 1, [i, j, k]);
        it.na = na; it.center = !i && !j && !k; it.nb = Math.abs(i) + Math.abs(j) + Math.abs(k) === 1; it.op = 1;
        this.ions.push(it);
        if (i < 1) seg.push(i, j, k, i + 1, j, k); if (j < 1) seg.push(i, j, k, i, j + 1, k); if (k < 1) seg.push(i, j, k, i, j, k + 1);
      }
      this.edges = sc.lines(seg, 0x9fb0c6, 0);
      this.lbl = sc.label("Na⁺ central : <b>6</b> voisins Cl⁻", [0, 1.95, 0], "tag"); this.lbl.vis = false;
    },
    update(dt) {
      this.r += ((this.compact ? 1 : 0) - this.r) * Math.min(1, dt * 5);
      for (const it of this.ions) {
        const R = it.na ? lerp(0.15, 0.36, this.r) : lerp(0.22, 0.64, this.r); it.s = [R, R, R];
        const to = this.neighbors ? (it.center || it.nb ? 1 : 0.1) : 1; it.op += (to - it.op) * Math.min(1, dt * 6); it.a = it.op > 0.995 ? 1 : it.op;
        it.e = it.center && this.neighbors ? [0.12, 0.08, 0.35] : [0, 0, 0];
      }
      this.edges.a = (1 - this.r) * 0.85; this.lbl.vis = this.neighbors;
      if (this.rot) this.sc.yaw += dt * 0.25;
    },
    stage() { return this.compact ? "Modèle compact du cristal NaCl" : "Modèle éclaté du cristal NaCl"; },
    bind() {
      const set = (v) => { this.compact = v; $("b-compact").setAttribute("aria-pressed", v); $("b-eclate").setAttribute("aria-pressed", !v); App.stage(this.stage()); };
      $("b-compact").onclick = () => set(true); $("b-eclate").onclick = () => set(false);
      $("b-voisins").onclick = () => { this.neighbors = !this.neighbors; $("b-voisins").setAttribute("aria-pressed", this.neighbors); };
      $("b-rot").onclick = () => { this.rot = !this.rot; $("b-rot").setAttribute("aria-pressed", this.rot); };
      $("b-rot").setAttribute("aria-pressed", this.rot);
    },
  };

  // =====================================================================
  const polar = {
    title: "Molécules polaires", cam: { theta: 0, phi: 1.45, dist: 4.6 },
    legend: [["#f2f4f7", "H"], ["#35c27a", "Cl"], ["#e5484d", "O"], ["#6b7584", "C"], ["#4ea1ff", "G⁺"], ["#ff9a6b", "G⁻"]],
    sel: "HCl",
    text: {
      HCl: ["Cl (3,0) est plus électronégatif que H (2,1) : le doublet liant (en jaune) est attiré vers Cl. Cl porte −δ, H porte +δ.", "Polaire", true],
      H2O: ["Les deux liaisons O–H sont polarisées : O porte −2δ, chaque H porte +δ. La molécule est coudée : G⁺ et G⁻ sont séparés.", "Polaire", true],
      CO2: ["Les liaisons C=O sont polarisées, mais la molécule est linéaire et symétrique : G⁺ et G⁻ sont confondus sur C.", "Non polaire", false],
    },
    build() {
      const sc = (this.sc = new E.Scene()); this.groups = { HCl: [], H2O: [], CO2: [] };
      const g = (k, it) => { this.groups[k].push(it); return it; };
      const mark = (k, col, html, p, off) => { const m = g(k, sc.ball(col, 0.08, p)); m.top = true; m.a = 0.95; g(k, sc.label(html, V3.add(p, off), "g")); };
      // HCl
      g("HCl", sc.ball(COL.H, 0.26, [-0.75, 0, 0])); g("HCl", sc.ball(COL.Cl, 0.5, [0.65, 0, 0])); g("HCl", sc.bond([-0.75, 0, 0], [0.65, 0, 0], 0.06, COL.bond));
      const e1 = g("HCl", sc.ball(COL.e, 0.06, [0.18, 0.11, 0])); e1.e = [0.4, 0.3, 0]; const e2 = g("HCl", sc.ball(COL.e, 0.06, [0.18, -0.11, 0])); e2.e = [0.4, 0.3, 0];
      g("HCl", sc.label("+δ", [-0.75, 0.62, 0], "d")); g("HCl", sc.label("−δ", [0.65, 0.88, 0], "d"));
      mark("HCl", 0x4ea1ff, "G⁺", [-0.55, 0, 0], [0, -0.34, 0]); mark("HCl", 0xff9a6b, "G⁻", [0.35, 0, 0], [0, -0.34, 0]);
      // H2O
      const O = [0, 0.3, 0], H1 = [-0.78, -0.32, 0], H2 = [0.78, -0.32, 0];
      g("H2O", sc.ball(COL.O, 0.42, O)); g("H2O", sc.ball(COL.H, 0.26, H1)); g("H2O", sc.ball(COL.H, 0.26, H2));
      g("H2O", sc.bond(O, H1, 0.06, COL.bond)); g("H2O", sc.bond(O, H2, 0.06, COL.bond));
      g("H2O", sc.label("−2δ", [0, 1.02, 0], "d")); g("H2O", sc.label("+δ", [-1.2, -0.15, 0], "d")); g("H2O", sc.label("+δ", [1.2, -0.15, 0], "d"));
      mark("H2O", 0x4ea1ff, "G⁺", [0, -0.32, 0], [0, -0.3, 0]); mark("H2O", 0xff9a6b, "G⁻", [0, 0.3, 0], [0.45, 0, 0]);
      // CO2
      g("CO2", sc.ball(COL.O, 0.38, [-1.15, 0, 0])); g("CO2", sc.ball(COL.C, 0.32, [0, 0, 0])); g("CO2", sc.ball(COL.O, 0.38, [1.15, 0, 0]));
      [[-1.15, 0], [0, 1.15]].forEach(([a, b]) => [0.08, -0.08].forEach((y) => g("CO2", sc.bond([a, y, 0], [b, y, 0], 0.045, COL.bond))));
      g("CO2", sc.label("−δ", [-1.15, 0.72, 0], "d")); g("CO2", sc.label("+2δ", [0, 0.68, 0], "d")); g("CO2", sc.label("−δ", [1.15, 0.72, 0], "d"));
      mark("CO2", 0xffffff, "G⁺ = G⁻", [0, 0, 0], [0, -0.58, 0]);
    },
    show(k) {
      this.sel = k;
      for (const n in this.groups) this.groups[n].forEach((it) => (it.vis = n === k));
      ["HCl", "H2O", "CO2"].forEach((n) => $("m-" + n).setAttribute("aria-pressed", n === k));
      const t = this.text[k]; $("polarText").textContent = t[0];
      const v = $("polarVerdict"); v.textContent = t[1]; v.className = "v " + (t[2] ? "ok" : "no");
      App.stage(this.stage());
    },
    update() { if (!reduce) this.sc.yaw = Math.sin(performance.now() / 2600) * 0.5; },
    stage() { return { HCl: "HCl : molécule polaire", H2O: "H₂O : molécule polaire", CO2: "CO₂ : molécule non polaire" }[this.sel]; },
    bind() { ["HCl", "H2O", "CO2"].forEach((n) => ($("m-" + n).onclick = () => this.show(n))); this.show(this.sel); },
  };

  // =====================================================================
  const OCTA = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const diss = {
    title: "Dissolution de NaCl", cam: { theta: 0, phi: 1.32, dist: 10.5, target: [0, -0.2, 0] },
    legend: [["#9b8cff", "Na⁺"], ["#35c27a", "Cl⁻"], ["#e5484d", "O"], ["#f2f4f7", "H"]],
    p: 0, playing: !reduce, speed: 1 / 24, st: -1,
    build() {
      const sc = (this.sc = new E.Scene()), BX = 4.4, BY = 2.7, BZ = 2.6, ctr = [0, -1.5, 0], s = 0.62;
      sc.boxEdges(BX * 2, BY * 2, BZ * 2, [0, 0, 0], 0x6fa8dc, 0.55);
      sc.box([BX * 2, BY * 2, BZ * 2], [0, 0, 0], 0x2a6fb5, 0.07);
      const randPos = (minD) => { let v; do { v = [rnd(-BX + 0.4, BX - 0.4), rnd(-BY + 0.4, BY - 0.4), rnd(-BZ + 0.4, BZ - 0.4)]; } while (V3.len(V3.sub(v, ctr)) < minD); return v; };
      this.ions = []; this.free = [];
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
        const na = isNa(i, j, k), m = sc.ball(na ? COL.Na : COL.Cl, na ? 0.22 : 0.34);
        const depth = Math.max(Math.abs(i), Math.abs(j), Math.abs(k)), rq = Q.rand();
        const io = { m, na, L: [i * s, j * s, k * s], ctr, target: randPos(0), dd: (1 - depth) * 0.08 + Math.random() * 0.05, dh: Math.random() * 0.1, ds: Math.random() * 0.1, ph: Math.random() * 6.28, shell: [] };
        OCTA.forEach((d) => {
          const dir = Q.rot(rq, d);
          io.shell.push({ w: water(sc), dir, base: randPos(2.2), q0: Q.rand(), qT: Q.fromTo(UP, na ? V3.sc(dir, -1) : dir), ph: Math.random() * 6.28 });
        });
        this.ions.push(io);
      }
      for (let n = 0; n < 20; n++) this.free.push({ w: water(sc), base: randPos(2.2), q: Q.rand(), ph: Math.random() * 6.28 });
    },
    sync() { $("d-play").textContent = this.playing ? "Pause" : this.p >= 1 ? "Rejouer" : "Lecture"; $("d-slider").value = Math.round(this.p * 1000); },
    update(dt, t) {
      if (this.playing) { this.p = Math.min(1, this.p + dt * this.speed); if (this.p >= 1) this.playing = false; this.sync(); }
      const p = this.p;
      for (const io of this.ions) {
        const d = sstep(0.05 + io.dd, 0.2 + io.dd, p), h = sstep(0.34 + io.dh, 0.48 + io.dh, p), s = sstep(0.62 + io.ds, 0.86 + io.ds, p);
        let pos = V3.lerp(V3.add(V3.sc(io.L, 1 + 1.9 * d), io.ctr), io.target, s);
        const wob = reduce ? 0 : 0.05 * d; pos = [pos[0] + Math.sin(t * 1.7 + io.ph) * wob, pos[1] + Math.cos(t * 1.3 + io.ph) * wob, pos[2]];
        io.m.p = pos;
        const R = io.na ? 0.5 : 0.72;
        for (const sh of io.shell) {
          const fp = reduce ? sh.base : [sh.base[0] + Math.sin(t * 0.6 + sh.ph) * 0.25, sh.base[1] + Math.cos(t * 0.5 + sh.ph) * 0.2, sh.base[2]];
          placeWater(sh.w, V3.lerp(fp, V3.add(pos, V3.sc(sh.dir, R)), h), Q.slerp(sh.q0, sh.qT, h));
        }
      }
      for (const f of this.free) {
        if (!reduce) f.q = Q.mul(Q.axis(UP, dt * 0.3), f.q);
        placeWater(f.w, reduce ? f.base : [f.base[0] + Math.sin(t * 0.6 + f.ph) * 0.25, f.base[1] + Math.cos(t * 0.5 + f.ph) * 0.2, f.base[2]], f.q);
      }
      const st = p < 0.05 ? 0 : p < 0.34 ? 1 : p < 0.62 ? 2 : 3;
      if (st !== this.st) { this.st = st; App.stage(this.stage()); document.querySelectorAll("#steps li").forEach((li) => li.classList.toggle("on", +li.dataset.s === st)); }
    },
    stage() { return ["Cristal de NaCl plongé dans l'eau", "Étape 1 · Dissociation", "Étape 2 · Hydratation", "Étape 3 · Dispersion"][Math.max(0, this.st)]; },
    bind() {
      this.st = -1; this.sync();
      $("d-play").onclick = () => { if (this.p >= 1) this.p = 0; this.playing = !this.playing; this.sync(); };
      $("d-reset").onclick = () => { this.p = 0; this.playing = true; this.sync(); };
      $("d-slider").oninput = (e) => { this.p = e.target.value / 1000; this.playing = false; this.sync(); };
      document.querySelectorAll("#steps li").forEach((li) => (li.onclick = () => { this.p = [0.2, 0.5, 0.9][+li.dataset.s - 1]; this.playing = false; this.sync(); }));
    },
  };

  // =====================================================================
  const cond = {
    title: "Conduction du courant", cam: { theta: 0, phi: 1.38, dist: 12, target: [0, 0.6, 0] },
    legend: [["#9b8cff", "Na⁺"], ["#35c27a", "Cl⁻"], ["#ffd166", "électron"]],
    on: false, salt: true,
    build() {
      const sc = (this.sc = new E.Scene()), X = 3.6;
      sc.boxEdges(8, 5.2, 5, [0, 0, 0], 0x6fa8dc, 0.55);
      sc.box([8, 4.4, 5], [0, -0.4, 0], 0x2a6fb5, 0.09);
      sc.box([0.14, 4.4, 2.4], [-X, 0.2, 0], COL.metal); sc.box([0.14, 4.4, 2.4], [X, 0.2, 0], COL.metal);
      sc.label("Anode (+)", [-X, -3.15, 0], "tag red"); sc.label("Cathode (−)", [X, -3.15, 0], "tag blue");
      this.P = [[-X, 2.4, 0], [-X, 3.6, 0], [X, 3.6, 0], [X, 2.4, 0]];
      for (let i = 0; i < 3; i++) sc.bond(this.P[i], this.P[i + 1], 0.035, COL.wire);
      this.segL = [1.2, 7.2, 1.2]; this.totL = 9.6;
      sc.box([1.3, 0.8, 0.6], [0.6, 3.6, 0], 0x2b3442); sc.label("G", [0.6, 3.6, 0.4], "gen");
      sc.label("+", [-0.25, 4.2, 0], "sign red"); sc.label("−", [1.45, 4.2, 0], "sign blue");
      this.lamp = sc.ball(0xfff3c4, 0.28, [-1.9, 3.6, 0]); sc.label("Lampe", [-1.9, 4.2, 0], "small");
      this.elec = []; for (let i = 0; i < 16; i++) { const e = sc.ball(COL.e, 0.075); e.e = [0.35, 0.25, 0]; e.u = i / 16; this.elec.push(e); }
      this.ions = []; for (let i = 0; i < 44; i++) { const na = i % 2 === 0, m = sc.ball(na ? COL.Na : COL.Cl, na ? 0.17 : 0.25, [rnd(-3.2, 3.2), rnd(-2.3, 1.5), rnd(-2.1, 2.1)]); m.na = na; m.v = [0, 0, 0]; this.ions.push(m); }
      this.placeElec();
    },
    pathAt(u) {
      let d = (u % 1) * this.totL;
      for (let i = 0; i < 3; i++) { if (d <= this.segL[i]) return V3.lerp(this.P[i], this.P[i + 1], d / this.segL[i]); d -= this.segL[i]; }
      return this.P[3];
    },
    placeElec() { for (const e of this.elec) e.p = this.pathAt(e.u); },
    current() { return this.on && this.salt; },
    sync() {
      $("c-gen").textContent = this.on ? "Ouvrir le circuit" : "Fermer le circuit";
      $("c-salt").setAttribute("aria-pressed", this.salt); $("c-pure").setAttribute("aria-pressed", !this.salt);
      const I = $("c-I"); I.textContent = this.current() ? "I ≠ 0 : courant" : "I = 0"; I.className = "v " + (this.current() ? "ok" : "no");
      for (const m of this.ions) m.vis = this.salt;
      this.lamp.e = this.current() ? [0.9, 0.6, 0.05] : [0, 0, 0];
      App.stage(this.stage());
    },
    update(dt) {
      const I = this.current(), k = reduce ? 0.3 : 1;
      for (const m of this.ions) {
        const v = m.v, p = m.p;
        for (let a = 0; a < 3; a++) v[a] = (v[a] + (Math.random() - 0.5) * 1.2 * dt) * 0.97;
        p[0] += v[0] * dt * k * 2 + (I ? (m.na ? 0.85 : -0.7) * dt * k : 0); p[1] += v[1] * dt * k * 2; p[2] += v[2] * dt * k * 2;
        if (p[1] < -2.4 || p[1] > 1.6) v[1] *= -1; if (p[2] < -2.2 || p[2] > 2.2) v[2] *= -1;
        p[1] = clamp(p[1], -2.4, 1.6); p[2] = clamp(p[2], -2.2, 2.2);
        if (p[0] > 3.3) { if (I) { p[0] = -3.2; p[1] = rnd(-2.3, 1.5); } else { p[0] = 3.3; v[0] = -Math.abs(v[0]); } }
        if (p[0] < -3.3) { if (I) { p[0] = 3.2; p[1] = rnd(-2.3, 1.5); } else { p[0] = -3.3; v[0] = Math.abs(v[0]); } }
      }
      if (I) { for (const e of this.elec) e.u += dt * 0.09 * k; this.placeElec(); }
    },
    stage() { return this.current() ? "Circuit fermé : les ions migrent" : this.on ? "Eau distillée : pas de courant" : "Circuit ouvert"; },
    bind() {
      $("c-gen").onclick = () => { this.on = !this.on; this.sync(); };
      $("c-salt").onclick = () => { this.salt = true; this.sync(); };
      $("c-pure").onclick = () => { this.salt = false; this.sync(); };
      this.sync();
    },
  };

  // =====================================================================
  // Labo : on choisit un soluté, une masse et un volume ; l'appli calcule tout et remplit le bécher.
  const SOL = [
    { id: "NaCl", f: "NaCl", name: "Chlorure de sodium", M: 58.5, cat: ["Na<sup>+</sup>", 1, COL.Na, 0.17], an: ["Cl<sup>−</sup>", 1, COL.Cl, 0.25], tint: null },
    { id: "CuCl2", f: "CuCl<sub>2</sub>", name: "Chlorure de cuivre II", M: 134.5, cat: ["Cu<sup>2+</sup>", 1, COL.Cu, 0.17], an: ["Cl<sup>−</sup>", 2, COL.Cl, 0.25], tint: 0x2d8fd6 },
    { id: "Na2SO4", f: "Na<sub>2</sub>SO<sub>4</sub>", name: "Sulfate de sodium", M: 142, cat: ["Na<sup>+</sup>", 2, COL.Na, 0.17], an: ["SO<sub>4</sub><sup>2−</sup>", 1, COL.SO4, 0.3], tint: null },
    { id: "FeCl3", f: "FeCl<sub>3</sub>", name: "Chlorure de fer III", M: 162.5, cat: ["Fe<sup>3+</sup>", 1, COL.Fe, 0.16], an: ["Cl<sup>−</sup>", 3, COL.Cl, 0.25], tint: 0xd99a2b },
    { id: "Al2SO43", f: "Al<sub>2</sub>(SO<sub>4</sub>)<sub>3</sub>", name: "Sulfate d'aluminium", M: 342, cat: ["Al<sup>3+</sup>", 2, COL.Al, 0.16], an: ["SO<sub>4</sub><sup>2−</sup>", 3, COL.SO4, 0.3], tint: null },
  ];
  const labo = {
    title: "Labo des concentrations", cam: { theta: 0.35, phi: 1.25, dist: 10, target: [0, -0.3, 0] },
    legend: [], sol: SOL[0], m: 5.85, V: 0.5,
    build() {
      const sc = (this.sc = new E.Scene());
      sc.boxEdges(7, 4.6, 4.6, [0, -0.3, 0], 0x8fb8dc, 0.6);
      this.water = sc.box([7, 3.8, 4.6], [0, -0.7, 0], 0x2a6fb5, 0.1);
      this.pool = [];
      for (let i = 0; i < 130; i++) { const b = sc.ball(0xffffff, 0.2); b.vis = false; b.v = [0, 0, 0]; this.pool.push(b); }
      this.cLbl = sc.label("", [0, 2.35, 0], "tag big");
    },
    fill() {
      const s = this.sol, n = this.m / s.M, C = n / this.V;
      const units = clamp(Math.round(C * 40), 2, 24), nc = s.cat[1] * units, na = s.an[1] * units;
      this.pool.forEach((b, i) => {
        if (i < nc + na) {
          const ion = i < nc ? s.cat : s.an; b.vis = true; b.c = E.hex(ion[2]); b.s = [ion[3], ion[3], ion[3]];
          b.p = [rnd(-3.2, 3.2), rnd(-2.3, 0.9), rnd(-2.0, 2.0)];
        } else b.vis = false;
      });
      const base = E.hex(0x2a6fb5), tint = s.tint ? E.hex(s.tint) : base;
      this.water.c = tint; this.water.a = s.tint ? Math.min(0.42, 0.1 + C * 0.12) : 0.1;
      // résultats
      const a = s.cat[1], b = s.an[1], co = (k) => (k > 1 ? k + " " : "");
      $("l-eq").innerHTML = `${s.f}<sub>(s)</sub> → ${co(a)}${s.cat[0]}<sub>(aq)</sub> + ${co(b)}${s.an[0]}<sub>(aq)</sub>`;
      $("l-M").textContent = fr(s.M) + " g/mol";
      $("l-n").textContent = fr(n) + " mol";
      $("l-C").textContent = fr(C) + " mol/L";
      $("l-cat").innerHTML = `[${s.cat[0]}] = ${a > 1 ? a + "C = " : ""}${fr(a * C)} mol/L`;
      $("l-an").innerHTML = `[${s.an[0]}] = ${b > 1 ? b + "C = " : ""}${fr(b * C)} mol/L`;
      $("l-mv").textContent = fr(this.m) + " g"; $("l-vv").textContent = Math.round(this.V * 1000) + " mL";
      this.cLbl.el.innerHTML = "C = " + fr(C) + " mol/L";
      App.legend([[("#" + s.cat[2].toString(16).padStart(6, "0")), s.cat[0]], [("#" + s.an[2].toString(16).padStart(6, "0")), s.an[0]]]);
      App.stage(s.name + " · ions dessinés proportionnels à C");
    },
    update(dt) {
      const k = reduce ? 0.3 : 1;
      for (const b of this.pool) {
        if (!b.vis) continue;
        const v = b.v, p = b.p;
        for (let a = 0; a < 3; a++) { v[a] = (v[a] + (Math.random() - 0.5) * 1.4 * dt) * 0.97; p[a] += v[a] * dt * 2 * k; }
        [[-3.2, 3.2], [-2.4, 1.0], [-2.0, 2.0]].forEach(([lo, hi], a) => { if (p[a] < lo || p[a] > hi) { v[a] *= -1; p[a] = clamp(p[a], lo, hi); } });
      }
      if (!reduce) this.sc.yaw = Math.sin(performance.now() / 5000) * 0.25;
    },
    stage() { return this.sol.name; },
    bind() {
      const box = $("l-sol"); box.innerHTML = "";
      SOL.forEach((s) => {
        const b = document.createElement("button"); b.className = "btn"; b.innerHTML = s.f; b.setAttribute("aria-pressed", s === this.sol);
        b.onclick = () => { this.sol = s; [...box.children].forEach((c) => c.setAttribute("aria-pressed", c === b)); this.fill(); };
        box.appendChild(b);
      });
      $("l-m").value = this.m; $("l-v").value = this.V * 1000;
      $("l-m").oninput = (e) => { this.m = +e.target.value; this.fill(); };
      $("l-v").oninput = (e) => { this.V = +e.target.value / 1000; this.fill(); };
      this.fill();
    },
  };

  global.SIMS = { crystal, polar, diss, cond, labo };
})(window);
