// Vercel serverless function — runs on the server, no CORS issues
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  try {
    // Fetch crypto prices from Binance REST (server-side, no CORS)
    const binRes = await fetch(
      'https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT","SOLUSDT"]'
    );
    const binData = await binRes.json();

    const crypto = {};
    for (const item of binData) {
      crypto[item.symbol] = parseFloat(item.price);
    }

    // Fetch USD/NGN from exchangerate-api (server-side, no CORS)
    let usdngn = 1600;
    try {
      const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
      const fxData = await fxRes.json();
      if (fxData?.rates?.NGN) usdngn = fxData.rates.NGN;
    } catch { /* use fallback */ }

    res.status(200).json({
      BTC:    crypto["BTCUSDT"] ?? 105000,
      ETH:    crypto["ETHUSDT"] ?? 3800,
      SOL:    crypto["SOLUSDT"] ?? 175,
      USDNGN: usdngn,
      ts:     Date.now(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
