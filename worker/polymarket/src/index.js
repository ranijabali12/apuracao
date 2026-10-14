// Repassa ao site de apuração as chances públicas do mercado "Brazil Presidential Election" do Polymarket.
// Existe porque o domínio do Polymarket é bloqueado pelos provedores brasileiros: o navegador do visitante não chega lá.
// Só leitura de preços; nenhum link ou função de aposta.
const EVENT = "brazil-presidential-election";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };

async function getJSON(url) {
  const r = await fetch(url, { cf: { cacheTtl: 60, cacheEverything: true }, headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function build() {
  const [ev] = await getJSON(`https://gamma-api.polymarket.com/events?slug=${EVENT}`);
  if (!ev) throw new Error("evento não encontrado");
  const markets = ev.markets
    .filter(m => m.active && !m.closed && m.outcomePrices)
    .map(m => ({ name: m.groupItemTitle || m.question, p: +JSON.parse(m.outcomePrices)[0], token: JSON.parse(m.clobTokenIds)[0], vol: +m.volume || 0 }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 4);
  // histórico: um ponto a cada 2 h nos últimos 30 dias (bom para o gráfico; o preço atual vem do mercado)
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  await Promise.all(markets.map(async m => {
    try {
      const h = await getJSON(`https://clob.polymarket.com/prices-history?market=${m.token}&startTs=${since}&fidelity=120`);
      m.history = (h.history || []).map(x => [x.t, x.p]);
    } catch { m.history = []; }
    delete m.token;
  }));
  return { t: Date.now(), title: ev.title, volume: +ev.volume || 0, markets };
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const cache = caches.default, key = new Request(new URL("/odds", req.url).toString());
    let res = await cache.match(key);
    if (!res) {
      try {
        res = new Response(JSON.stringify(await build()), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60", ...CORS } });
        ctx.waitUntil(cache.put(key, res.clone()));
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 502, headers: { "content-type": "application/json", ...CORS } });
      }
    }
    return res;
  },
};
