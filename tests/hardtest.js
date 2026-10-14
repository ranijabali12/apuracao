/* Bateria de testes da página de apuração. Rode no console da página (ou injete) e aguarde: devolve a lista de problemas.
   Percorre turnos, abas, regiões, modos de mapa, estados, Voltar no tempo, telão, atalhos e o momento do eleito,
   e em cada passo procura: erro de JavaScript, texto quebrado (NaN/undefined/Infinity/null), conteúdo vazando
   para fora da tela e elementos com largura maior que o pai. */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const issues = [], errs = [];
  const onErr = e => errs.push(String(e.message || e.reason || e));
  window.addEventListener("error", onErr); window.addEventListener("unhandledrejection", onErr);
  const click = sel => { const el = document.querySelector(sel); if (!el) return false; el.dispatchEvent(new MouseEvent("click", { bubbles: true })); return true; };
  const key = k => document.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
  const check = label => {
    const app = document.querySelector("#app"), txt = app.innerText;
    const bad = txt.match(/\b(NaN|undefined|Infinity|null)\b|\[object Object\]/g);
    if (bad) issues.push(`${label}: texto quebrado ${[...new Set(bad)].join(",")}`);
    const vw = document.documentElement.clientWidth;
    if (vw >= 200 && document.documentElement.scrollWidth > vw + 1) { // vw < 200: aba escondida, sem layout real
      const wide = [...document.querySelectorAll("#app *")].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1 && !e.closest(".scroll,.ctrls,.cr-box,.feed,.rows,#cargoSeg"); }).slice(0, 3)
        .map(e => e.tagName.toLowerCase() + "." + String(e.className.baseVal ?? e.className).split(" ")[0]);
      issues.push(`${label}: rolagem lateral (${document.documentElement.scrollWidth}px > ${vw}px) ${wide.join(" ")}`);
    }
    errs.splice(0).forEach(m => issues.push(`${label}: erro JS ${m}`));
  };
  const step = async (label, fn, wait = 700) => { try { await fn(); } catch (e) { issues.push(`${label}: falhou ${e.message}`); } await W(wait); check(label); };

  for (const t of [1, 2]) {
    await step(`turno ${t}`, () => click(`#turnoSeg [data-t="${t}"]`), 4500);
    for (const c of ["pres", "gov", "pol", "ana"]) {
      await step(`t${t} ${c}`, () => click(`#cargoSeg [data-c="${c}"]`), 2500);
      if (c === "pres" && document.querySelector("[data-scope]")) {
        for (const sc of ["N", "NE", "CO", "SE", "S", "ZZ", "BR"]) await step(`t${t} pres ${sc}`, () => click(`[data-scope="${sc}"]`), sc === "ZZ" ? 2500 : 600);
        for (const m of ["adv", "apu", "abs", "win"]) await step(`t${t} modo ${m}`, () => click(`[data-mode="${m}"]`), 500);
        await step(`t${t} abre SP`, () => click(`#mapBox [data-uf="sp"]`), 800);
        await step(`t${t} fecha estado`, () => click(`[data-close]`) || key("Escape"), 600);
        await step(`t${t} ordena tabela`, () => click(`[data-sort="apu"]`), 500);
        if (document.querySelector("#ttR")) {
          await step(`t${t} voltar no tempo`, () => { const r = document.querySelector("#ttR"); r.value = (+r.min + +r.max) / 2; r.dispatchEvent(new Event("input", { bubbles: true })); }, 500);
          await step(`t${t} reproduzir`, () => click("[data-ttplay]"), 1500);
          await step(`t${t} pausar`, () => click("[data-ttplay]"), 500);
        }
        await step(`t${t} município SP`, () => { const s = document.querySelector("[data-munuf]"); if (s) { s.value = "sp"; s.dispatchEvent(new Event("change", { bubbles: true })); } }, 3500);
        await step(`t${t} município Brasil`, () => { const s = document.querySelector("[data-munuf]"); if (s) { s.value = ""; s.dispatchEvent(new Event("change", { bubbles: true })); } }, 3500);
      }
      if (c === "gov") {
        const u = document.querySelector("#mapBox [data-uf]"); if (u) await step(`t${t} gov estado`, () => u.dispatchEvent(new MouseEvent("click", { bubbles: true })), 1500);
      }
      if (c === "pol") for (const k of ["sen", "depf", "depe", "gov"]) await step(`t${t} pol ${k}`, () => click(`[data-pk="${k}"]`), 2500);
    }
  }
  await step("atalho ?", () => key("?"), 400); await step("atalho Esc", () => key("Escape"), 300);
  await step("telão on", () => key("t"), 800); await step("telão off", () => key("Escape"), 600);
  await step("busca cidade", () => { key("p"); }, 1500);
  const q = document.querySelector("#cityQ");
  if (q) { await step("digita cidade", () => { q.value = "Campinas"; q.dispatchEvent(new Event("input", { bubbles: true })); }, 1500); await step("limpa", () => { q.value = ""; q.dispatchEvent(new Event("input", { bubbles: true })); }, 400); }
  window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onErr);
  return issues.length ? issues : ["nenhum problema encontrado"];
})();
