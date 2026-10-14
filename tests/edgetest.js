/* Casos extremos: apuração simulada (3%, 50%, 99,9%, quase zero), um candidato só, empate exato,
   Polymarket fora do ar e TSE fora do ar. Devolve a lista do que achou. */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms)), out = [], errs = [];
  addEventListener("error", e => errs.push(e.message)); addEventListener("unhandledrejection", e => errs.push(String(e.reason)));
  const bad = l => { const t = document.querySelector("#app").innerText, m = t.match(/\b(NaN|undefined|Infinity)\b/g);
    if (m) out.push(l + ": texto quebrado " + [...new Set(m)]); errs.splice(0).forEach(x => out.push(l + ": erro " + x)); };
  document.querySelector('#turnoSeg [data-t="1"]').click(); await W(5000); S.loading = true;
  const P = D().pres, base = JSON.parse(JSON.stringify(P.ufs)), brBase = JSON.parse(JSON.stringify(P.br));
  const sim = (f, mod) => {
    for (const u of Object.keys(base)) { const d = JSON.parse(JSON.stringify(base[u])); if (!d) continue;
      d.cands = d.cands.filter(c => ["22", "13"].includes(c.n)).map(c => ({ ...c, votes: Math.round(c.votes * f), e: "", st: "", raw: {} }));
      if (mod) mod(d); d.val = d.cands.reduce((a, c) => a + c.votes, 0); d.cands.forEach(c => c.pct = d.val ? c.votes / d.val * 100 : 0);
      d.cands.sort((a, b) => b.votes - a.votes); d.pct = f * 100; d.st = d.ts * f; d.stEff = d.st; P.ufs[u] = d; }
    const ag = aggregate([...UFS, "zz"].map(u => P.ufs[u]), brBase); ag.ele = brBase.ele; ag.md = ""; ag.tf = "";
    ag.cands.forEach(c => { c.st = ""; c.raw = {}; c.e = ""; }); P.br = ag; S.lastSig = null;
    Object.keys(localStorage).filter(k => k.startsWith("ap26_cel_")).forEach(k => localStorage.removeItem(k)); render(); };
  for (const f of [0.03, 0.5, 0.999, 0.0001]) { sim(f); await W(1200); closeCelebrate(true); bad("sim " + f);
    out.push("manchete " + f + ": " + (document.querySelector(".headline")?.textContent || "(sem manchete)").slice(0, 110)); }
  sim(0.4, d => { d.cands = d.cands.filter(c => c.n === "22"); }); await W(1000); closeCelebrate(true); bad("um candidato");
  sim(0.4, d => { const v = d.cands.reduce((a, c) => a + c.votes, 0); d.cands.forEach(c => c.votes = Math.round(v / 2)); }); await W(1000); closeCelebrate(true); bad("empate");
  PM.data = null; PM.err = true; PM.t = Date.now(); render(); await W(500); bad("polymarket fora"); out.push("cartão polymarket com erro: " + (document.querySelector(".pm") ? "aparece" : "some"));
  const g = getJSON; window.getJSON = async () => { throw Object.assign(new Error("HTTP 503"), { status: 503 }); };
  S.loading = false; S.data[2] = null; document.querySelector('#turnoSeg [data-t="2"]').click(); await W(4000); bad("tse fora");
  out.push("tse fora: " + document.querySelector("#app").innerText.slice(0, 90).replace(/\n/g, " ")); window.getJSON = g;
  return out;
})();
