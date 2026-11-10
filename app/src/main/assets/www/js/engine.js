/* Mini moteur 3D WebGL, sans bibliothèque externe (fonctionne hors ligne).
   Pr Hicham MESBAH — Lycée Almassira Alkhadra */
(function (global) {
  "use strict";
  // ---------- Vecteurs ----------
  const V3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    sc: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  };
  // ---------- Quaternions [x,y,z,w] ----------
  const Q = {
    id: () => [0, 0, 0, 1],
    axis: (ax, ang) => { const n = V3.norm(ax), s = Math.sin(ang / 2); return [n[0] * s, n[1] * s, n[2] * s, Math.cos(ang / 2)]; },
    mul: (a, b) => [
      a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]],
    rot: (q, v) => {
      const [x, y, z, w] = q;
      const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
      return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
    },
    fromTo: (a, b) => {
      a = V3.norm(a); b = V3.norm(b);
      const d = V3.dot(a, b);
      if (d < -0.999999) { let ax = V3.cross([1, 0, 0], a); if (V3.len(ax) < 1e-6) ax = V3.cross([0, 1, 0], a); return Q.axis(ax, Math.PI); }
      const c = V3.cross(a, b), q = [c[0], c[1], c[2], 1 + d], l = Math.hypot(q[0], q[1], q[2], q[3]);
      return q.map((v) => v / l);
    },
    slerp: (a, b, t) => {
      let cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = b;
      if (cos < 0) { cos = -cos; bb = b.map((v) => -v); }
      if (cos > 0.9995) { const r = a.map((v, i) => v + (bb[i] - v) * t), l = Math.hypot(r[0], r[1], r[2], r[3]); return r.map((v) => v / l); }
      const th = Math.acos(cos), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
      return a.map((v, i) => v * wa + bb[i] * wb);
    },
    rand: () => Q.mul(Q.mul(Q.axis([1, 0, 0], Math.random() * 6.283), Q.axis([0, 1, 0], Math.random() * 6.283)), Q.axis([0, 0, 1], Math.random() * 6.283)),
  };
  // ---------- Matrices 4x4 (colonnes) ----------
  const M4 = {
    compose(p, q, s) {
      const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z;
      const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
      return new Float32Array([
        (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
        (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
        (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
        p[0], p[1], p[2], 1]);
    },
    persp(fovy, asp, n, f) {
      const t = 1 / Math.tan(fovy / 2), o = new Float32Array(16);
      o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = (2 * f * n) / (n - f);
      return o;
    },
    lookAt(e, c, up) {
      const z = V3.norm(V3.sub(e, c)), x = V3.norm(V3.cross(up, z)), y = V3.cross(z, x);
      return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -V3.dot(x, e), -V3.dot(y, e), -V3.dot(z, e), 1]);
    },
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
      }
      return o;
    },
  };
  const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

  // ---------- Shaders ----------
  const VS = `attribute vec3 aPos;attribute vec3 aNorm;uniform mat4 uModel,uView,uProj;varying vec3 vN;varying vec3 vW;
  void main(){vec4 w=uModel*vec4(aPos,1.0);vW=w.xyz;vN=(uModel*vec4(aNorm,0.0)).xyz;gl_Position=uProj*uView*w;}`;
  const FS = `precision mediump float;uniform vec3 uColor,uEmis,uCam;uniform float uAlpha,uFlat;varying vec3 vN;varying vec3 vW;
  void main(){if(uFlat>0.5){gl_FragColor=vec4(uColor,uAlpha);return;}
  vec3 N=normalize(vN);vec3 L=normalize(vec3(0.45,0.8,0.6));vec3 V=normalize(uCam-vW);vec3 H=normalize(L+V);
  float hemi=0.5+0.5*N.y;vec3 amb=mix(vec3(0.10,0.12,0.18),vec3(0.55,0.60,0.70),hemi);
  float d=max(dot(N,L),0.0);float sp=pow(max(dot(N,H),0.0),48.0);float rim=pow(1.0-max(dot(N,V),0.0),3.0);
  vec3 c=uColor*(amb*0.8+d*0.72)+vec3(sp*0.45)+uEmis+rim*0.10*vec3(0.6,0.75,1.0);gl_FragColor=vec4(c,uAlpha);}`;

  // ---------- Maillages ----------
  function sphereGeo(lat, lon) {
    const p = [], idx = [];
    for (let i = 0; i <= lat; i++) {
      const th = (i * Math.PI) / lat;
      for (let j = 0; j <= lon; j++) {
        const ph = (j * 2 * Math.PI) / lon;
        p.push(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
      }
    }
    for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) {
      const a = i * (lon + 1) + j, b = a + lon + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    return { pos: p, nor: p, idx };
  }
  function cylGeo(seg) {
    const pos = [], nor = [], idx = [];
    for (let j = 0; j <= seg; j++) {
      const a = (j * 2 * Math.PI) / seg, x = Math.cos(a), z = Math.sin(a);
      pos.push(x, -0.5, z, x, 0.5, z); nor.push(x, 0, z, x, 0, z);
    }
    for (let j = 0; j < seg; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    return { pos, nor, idx };
  }
  function cubeGeo() {
    const pos = [], nor = [], idx = [];
    const F = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    F.forEach((n, f) => {
      const u = n[1] !== 0 ? [1, 0, 0] : [0, 1, 0], v = V3.cross(n, u);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => {
        pos.push(0.5 * (n[0] + a * u[0] + b * v[0]), 0.5 * (n[1] + a * u[1] + b * v[1]), 0.5 * (n[2] + a * u[2] + b * v[2]));
        nor.push(...n);
      });
      const o = f * 4; idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    });
    return { pos, nor, idx };
  }

  // ---------- Scène ----------
  function Scene() {
    this.items = []; this.lineSets = []; this.labels = []; this.yaw = 0;
    this.labelRoot = document.createElement("div");
    this.labelRoot.className = "lbl-root";
  }
  Scene.prototype.add = function (mesh, o) {
    const it = Object.assign({ mesh, p: [0, 0, 0], q: [0, 0, 0, 1], s: [1, 1, 1], c: [1, 1, 1], a: 1, e: [0, 0, 0], vis: true, top: false }, o);
    if (typeof it.c === "number") it.c = hex(it.c);
    this.items.push(it); return it;
  };
  Scene.prototype.ball = function (col, r, p) { return this.add("sphere", { c: col, s: [r, r, r], p: p || [0, 0, 0] }); };
  Scene.prototype.bond = function (a, b, r, col) {
    const d = V3.sub(b, a);
    return this.add("cyl", { c: col, p: V3.lerp(a, b, 0.5), q: Q.fromTo([0, 1, 0], d), s: [r, V3.len(d), r] });
  };
  Scene.prototype.box = function (size, p, col, a) { return this.add("cube", { c: col, s: size, p, a: a == null ? 1 : a }); };
  Scene.prototype.lines = function (seg, col, a) { const L = { seg: new Float32Array(seg), c: hex(col), a: a == null ? 1 : a, vis: true, buf: null }; this.lineSets.push(L); return L; };
  Scene.prototype.boxEdges = function (w, h, d, p, col, a) {
    const x = w / 2, y = h / 2, z = d / 2, c = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
    const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]], s = [];
    E.forEach(([i, j]) => s.push(...V3.add(c[i], p), ...V3.add(c[j], p)));
    return this.lines(s, col, a);
  };
  Scene.prototype.label = function (html, p, cls) {
    const el = document.createElement("div");
    el.className = "lbl " + (cls || ""); el.innerHTML = html;
    this.labelRoot.appendChild(el);
    const L = { el, p, vis: true }; this.labels.push(L); return L;
  };

  // ---------- Moteur ----------
  const E = { V3, Q, M4, hex, Scene };
  let gl, prog, U = {}, meshes = {}, canvas, overlay, scene = null;
  const cam = { theta: 0.6, phi: 1.1, dist: 7, target: [0, 0, 0], tTheta: 0.6, tPhi: 1.1, tDist: 7 };
  E.cam = cam;

  function upload(g) {
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.pos), gl.STATIC_DRAW);
    const nb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, nb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.nor), gl.STATIC_DRAW);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(g.idx), gl.STATIC_DRAW);
    return { vb, nb, ib, n: g.idx.length };
  }
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }

  E.init = function (cv, ov) {
    canvas = cv; overlay = ov;
    gl = cv.getContext("webgl", { antialias: true, alpha: false }) || cv.getContext("experimental-webgl");
    if (!gl) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    gl.useProgram(prog);
    ["uModel", "uView", "uProj", "uColor", "uEmis", "uCam", "uAlpha", "uFlat"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
    U.aPos = gl.getAttribLocation(prog, "aPos"); U.aNorm = gl.getAttribLocation(prog, "aNorm");
    meshes.sphere = upload(sphereGeo(18, 26)); meshes.cyl = upload(cylGeo(16)); meshes.cube = upload(cubeGeo());
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.05, 0.08, 0.125, 1);
    controls(cv);
    return true;
  };
  E.setScene = function (sc, c) {
    scene = sc;
    overlay.replaceChildren(sc.labelRoot);
    if (c) E.setCam(c, true);
  };
  E.setCam = function (c, jump) {
    const asp = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const k = asp < 1 ? Math.min(1.8, 1.05 / asp) : 1;
    cam.tTheta = c.theta; cam.tPhi = c.phi; cam.tDist = c.dist * k; cam.target = c.target || [0, 0, 0];
    cam.min = c.min || 2; cam.max = c.max || 30;
    if (jump) { cam.theta = cam.tTheta; cam.phi = cam.tPhi; cam.dist = cam.tDist; }
  };

  // contrôle tactile : 1 doigt = rotation, 2 doigts = zoom
  function controls(cv) {
    const pts = new Map(); let pinch = 0;
    cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); });
    cv.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) {
        cam.tTheta -= (e.clientX - prev[0]) * 0.008;
        cam.tPhi = Math.max(0.15, Math.min(2.95, cam.tPhi - (e.clientY - prev[1]) * 0.008));
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) cam.tDist = Math.max(cam.min, Math.min(cam.max, cam.tDist * (pinch / d)));
        pinch = d;
      }
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", (e) => { e.preventDefault(); cam.tDist = Math.max(cam.min, Math.min(cam.max, cam.tDist * (1 + e.deltaY * 0.001))); }, { passive: false });
  }

  function drawMesh(m, model, c, a, e, flat) {
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.enableVertexAttribArray(U.aPos); gl.vertexAttribPointer(U.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.nb); gl.enableVertexAttribArray(U.aNorm); gl.vertexAttribPointer(U.aNorm, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
    gl.uniformMatrix4fv(U.uModel, false, model); gl.uniform3fv(U.uColor, c); gl.uniform1f(U.uAlpha, a); gl.uniform3fv(U.uEmis, e); gl.uniform1f(U.uFlat, flat ? 1 : 0);
    gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
  }

  E.render = function (dt) {
    if (!scene) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    gl.viewport(0, 0, canvas.width, canvas.height);
    const k = Math.min(1, dt * 8);
    cam.theta += (cam.tTheta - cam.theta) * k; cam.phi += (cam.tPhi - cam.phi) * k; cam.dist += (cam.tDist - cam.dist) * k;
    const t = cam.target, eye = [t[0] + cam.dist * Math.sin(cam.phi) * Math.sin(cam.theta), t[1] + cam.dist * Math.cos(cam.phi), t[2] + cam.dist * Math.sin(cam.phi) * Math.cos(cam.theta)];
    const P = M4.persp(0.78, w / h, 0.1, 100), Vw = M4.lookAt(eye, t, [0, 1, 0]), PV = M4.mul(P, Vw);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(U.uView, false, Vw); gl.uniformMatrix4fv(U.uProj, false, P); gl.uniform3fv(U.uCam, eye);
    const gq = Q.axis([0, 1, 0], scene.yaw);
    const opaque = [], trans = [], top = [];
    for (const it of scene.items) {
      if (!it.vis) continue;
      const wp = Q.rot(gq, it.p);
      const rec = { it, wp };
      if (it.top) top.push(rec); else if (it.a < 0.999) { rec.d = V3.len(V3.sub(wp, eye)); trans.push(rec); } else opaque.push(rec);
    }
    gl.depthMask(true);
    for (const r of opaque) drawMesh(meshes[r.it.mesh], M4.compose(r.wp, Q.mul(gq, r.it.q), r.it.s), r.it.c, 1, r.it.e);
    // lignes
    const gm = M4.compose([0, 0, 0], gq, [1, 1, 1]);
    for (const L of scene.lineSets) {
      if (!L.vis || L.a <= 0.01) continue;
      if (!L.buf) { L.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, L.buf); gl.bufferData(gl.ARRAY_BUFFER, L.seg, gl.STATIC_DRAW); }
      gl.bindBuffer(gl.ARRAY_BUFFER, L.buf); gl.enableVertexAttribArray(U.aPos); gl.vertexAttribPointer(U.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.disableVertexAttribArray(U.aNorm); gl.vertexAttrib3f(U.aNorm, 0, 1, 0);
      gl.uniformMatrix4fv(U.uModel, false, gm); gl.uniform3fv(U.uColor, L.c); gl.uniform1f(U.uAlpha, L.a); gl.uniform1f(U.uFlat, 1);
      gl.drawArrays(gl.LINES, 0, L.seg.length / 3);
    }
    trans.sort((a, b) => b.d - a.d);
    gl.depthMask(false);
    for (const r of trans) drawMesh(meshes[r.it.mesh], M4.compose(r.wp, Q.mul(gq, r.it.q), r.it.s), r.it.c, r.it.a, r.it.e);
    gl.disable(gl.DEPTH_TEST);
    for (const r of top) drawMesh(meshes[r.it.mesh], M4.compose(r.wp, Q.mul(gq, r.it.q), r.it.s), r.it.c, r.it.a, r.it.e);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
    // étiquettes HTML
    for (const L of scene.labels) {
      if (!L.vis) { L.el.style.display = "none"; continue; }
      const p = Q.rot(gq, L.p), x = PV[0] * p[0] + PV[4] * p[1] + PV[8] * p[2] + PV[12], y = PV[1] * p[0] + PV[5] * p[1] + PV[9] * p[2] + PV[13], ww = PV[3] * p[0] + PV[7] * p[1] + PV[11] * p[2] + PV[15];
      if (ww <= 0) { L.el.style.display = "none"; continue; }
      L.el.style.display = "";
      L.el.style.transform = `translate(${((x / ww + 1) / 2) * w}px,${((1 - y / ww) / 2) * h}px) translate(-50%,-50%)`;
    }
  };
  global.E = E;
})(window);
