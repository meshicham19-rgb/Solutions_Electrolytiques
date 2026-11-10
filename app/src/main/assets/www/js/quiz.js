/* Quiz : 12 questions tirées dans un ordre aléatoire, 10 par partie — Pr Hicham MESBAH */
(function (global) {
  "use strict";
  const BANK = [
    { q: "Dans le cristal NaCl, combien d'ions Cl⁻ entourent un ion Na⁺ ?", o: ["4", "6", "8"], a: 1, e: "Chaque ion Na⁺ a 6 voisins Cl⁻ (et chaque Cl⁻ a 6 voisins Na⁺)." },
    { q: "La cohésion d'un cristal ionique est assurée par :", o: ["des liaisons covalentes", "les forces électrostatiques attractives", "la pesanteur"], a: 1, e: "Les ions de signes opposés s'attirent : c'est l'interaction électrostatique." },
    { q: "La formule du sulfate d'aluminium (Al³⁺ ; SO₄²⁻) est :", o: ["Al₃(SO₄)₂", "AlSO₄", "Al₂(SO₄)₃"], a: 2, e: "2 × (+3) = +6 et 3 × (−2) = −6 : le cristal est neutre." },
    { q: "L'élément le plus électronégatif est :", o: ["le fluor F", "le chlore Cl", "l'oxygène O"], a: 0, e: "F a l'électronégativité la plus grande (4,0)." },
    { q: "La molécule CO₂ est :", o: ["polaire", "non polaire"], a: 1, e: "Elle est linéaire : G⁺ et G⁻ sont confondus sur l'atome C." },
    { q: "Dans la molécule H₂O, l'atome d'oxygène porte :", o: ["+δ", "−2δ", "+2δ"], a: 1, e: "O est plus électronégatif que H : il porte −2δ, chaque H porte +δ." },
    { q: "L'ordre des étapes de la dissolution est :", o: ["hydratation → dissociation → dispersion", "dissociation → hydratation → dispersion", "dispersion → dissociation → hydratation"], a: 1, e: "Les ions se détachent, s'entourent d'eau, puis se répartissent." },
    { q: "Autour d'un ion Na⁺(aq), les molécules d'eau tournent vers l'ion :", o: ["leurs atomes H (+δ)", "leur atome O (−δ)"], a: 1, e: "Le côté négatif de l'eau (O) est attiré par l'ion positif." },
    { q: "Quand le courant passe, les cations se déplacent vers :", o: ["l'anode (+)", "la cathode (−)"], a: 1, e: "Les cations, positifs, sont attirés par l'électrode négative : la cathode." },
    { q: "Solution de CuCl₂ de concentration C = 0,1 mol/L : [Cl⁻] = ?", o: ["0,05 mol/L", "0,1 mol/L", "0,2 mol/L"], a: 2, e: "CuCl₂ → Cu²⁺ + 2Cl⁻, donc [Cl⁻] = 2C = 0,2 mol/L." },
    { q: "Le chlorure d'hydrogène HCl gazeux dissous dans l'eau donne :", o: ["des molécules HCl(aq)", "H⁺(aq) + Cl⁻(aq)", "H₂(g) + Cl₂(g)"], a: 1, e: "HCl(g) → H⁺(aq) + Cl⁻(aq) : c'est l'acide chlorhydrique." },
    { q: "Une solution de NaCl (M = 58,5 g/mol) a Cm = 11,7 g/L. Sa concentration C vaut :", o: ["0,2 mol/L", "2 mol/L", "0,5 mol/L"], a: 0, e: "C = Cm / M = 11,7 / 58,5 = 0,2 mol/L." },
  ];
  const $ = (id) => document.getElementById(id);
  const Quiz = {
    start() {
      this.list = BANK.slice().sort(() => Math.random() - 0.5).slice(0, 10);
      this.i = 0; this.score = 0;
      $("qz-end").hidden = true; $("qz-card").hidden = false;
      this.show();
    },
    show() {
      const it = this.list[this.i];
      $("qz-prog").textContent = `Question ${this.i + 1} / ${this.list.length}`;
      $("qz-bar").style.width = (this.i / this.list.length) * 100 + "%";
      $("qz-score").textContent = `Score : ${this.score}`;
      $("qz-q").textContent = it.q;
      const box = $("qz-opts"); box.innerHTML = "";
      it.o.forEach((t, k) => {
        const b = document.createElement("button"); b.className = "opt"; b.textContent = t;
        b.onclick = () => this.answer(k, b); box.appendChild(b);
      });
      $("qz-fb").hidden = true; $("qz-next").hidden = true;
    },
    answer(k, btn) {
      const it = this.list[this.i], ok = k === it.a;
      [...$("qz-opts").children].forEach((b, j) => { b.disabled = true; if (j === it.a) b.classList.add("good"); });
      if (!ok) btn.classList.add("bad"); else this.score++;
      const fb = $("qz-fb"); fb.hidden = false; fb.className = "fb " + (ok ? "ok" : "no");
      fb.innerHTML = `<b>${ok ? "Bonne réponse" : "Pas tout à fait"}</b> — ${it.e}`;
      $("qz-score").textContent = `Score : ${this.score}`;
      const n = $("qz-next"); n.hidden = false; n.textContent = this.i < this.list.length - 1 ? "Question suivante" : "Voir mon résultat";
      try { navigator.vibrate && navigator.vibrate(ok ? 25 : [40, 60, 40]); } catch (e) {}
    },
    next() {
      if (this.i < this.list.length - 1) { this.i++; this.show(); return; }
      $("qz-card").hidden = true; $("qz-end").hidden = false; $("qz-bar").style.width = "100%";
      const s = this.score, n = this.list.length;
      let best = 0; try { best = +localStorage.getItem("qz-best") || 0; if (s > best) { localStorage.setItem("qz-best", s); best = s; } } catch (e) { best = s; }
      $("qz-final").textContent = `${s} / ${n}`;
      $("qz-stars").textContent = "★".repeat(Math.round((s / n) * 5)) + "☆".repeat(5 - Math.round((s / n) * 5));
      $("qz-msg").textContent = s >= 9 ? "Excellent ! Tu maîtrises les solutions électrolytiques." : s >= 7 ? "Très bien ! Revois les points manqués." : s >= 5 ? "Pas mal. Relis le cours puis réessaie." : "Revois le cours et les simulations, puis recommence.";
      $("qz-best").textContent = `Meilleur score sur cet appareil : ${best} / ${n}`;
    },
  };
  global.Quiz = Quiz;
})(window);
