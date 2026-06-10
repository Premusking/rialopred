export type MarketCategory = "1min" | "crypto" | "sports" | "worldcup" | "wrestling" | "politics" | "economy";
export type MarketType = "binary" | "multi";

export interface Market {
  id: string;
  cat: MarketCategory;
  title: string;
  type: MarketType;
  outcomes: string[];
  odds: number[];
  pool: number;
  participants: number;
  endSecs: number;
  asset?: string;
  resolutionUrl: string;
  resolutionPath: string;
}

export const MARKETS: Market[] = [
  { id:"m1",  cat:"1min",     title:"BTC/USDT — Higher in 60 seconds?",                   type:"binary",   outcomes:["YES","NO"],                                    odds:[1.92,1.88], pool:48200,   participants:312,   endSecs:60,       asset:"BTC",    resolutionUrl:"https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", resolutionPath:"$.price" },
  { id:"m2",  cat:"1min",     title:"ETH/USDT — Higher in 60 seconds?",                   type:"binary",   outcomes:["YES","NO"],                                    odds:[1.95,1.85], pool:21300,   participants:187,   endSecs:60,       asset:"ETH",    resolutionUrl:"https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", resolutionPath:"$.price" },
  { id:"m3",  cat:"1min",     title:"USD/NGN — Dollar WEAKER in 60 seconds?",             type:"binary",   outcomes:["YES","NO"],                                    odds:[1.80,2.10], pool:9800,    participants:94,    endSecs:60,       asset:"USDNGN", resolutionUrl:"https://api.exchangerate.host/latest?base=USD&symbols=NGN",  resolutionPath:"$.rates.NGN" },
  { id:"m4",  cat:"crypto",   title:"BTC breaks $120K before end of Q3 2026?",            type:"binary",   outcomes:["YES","NO"],                                    odds:[2.40,1.62], pool:892000,  participants:4210,  endSecs:86400*30  , resolutionUrl:"https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", resolutionPath:"$.bitcoin.usd" },
  { id:"m5",  cat:"crypto",   title:"Which crypto outperforms BTC in July 2026?",         type:"multi",    outcomes:["ETH","SOL","BNB","AVAX"],                      odds:[2.1,3.4,5.0,8.2], pool:134000, participants:2100, endSecs:86400*15, resolutionUrl:"https://api.coingecko.com/api/v3/simple/price", resolutionPath:"$.winner" },
  { id:"m6",  cat:"sports",   title:"UEFA Champions League Final 2026 — Who wins?",       type:"multi",    outcomes:["Real Madrid","Man City","PSG","Bayern"],        odds:[2.2,3.0,4.5,3.8], pool:1200000, participants:18400, endSecs:86400*5, resolutionUrl:"https://api.football-data.org/v4/competitions/CL/matches", resolutionPath:"$.winner" },
  { id:"m7",  cat:"sports",   title:"Djokovic wins Wimbledon 2026?",                      type:"binary",   outcomes:["YES","NO"],                                    odds:[2.80,1.45], pool:340000,  participants:5600,  endSecs:86400*7,   resolutionUrl:"https://api.tennis.io/wimbledon/2026/winner",               resolutionPath:"$.champion" },
  { id:"m8",  cat:"sports",   title:"NBA Finals 2026-27 — East or West champion?",        type:"binary",   outcomes:["East","West"],                                 odds:[1.95,1.95], pool:780000,  participants:9200,  endSecs:86400*60,  resolutionUrl:"https://api.nba.com/finals/2027/champion",                  resolutionPath:"$.conference" },
  { id:"m9",  cat:"worldcup", title:"2026 FIFA World Cup — Who lifts the trophy?",        type:"multi",    outcomes:["Brazil","France","England","Argentina"],        odds:[3.5,4.0,5.5,4.2], pool:3400000, participants:42000, endSecs:86400*20, resolutionUrl:"https://api.fifa.com/worldcup/2026/winner",              resolutionPath:"$.winner.name" },
  { id:"m10", cat:"worldcup", title:"Africa gets a 2026 WC semifinalist?",                type:"binary",   outcomes:["YES","NO"],                                    odds:[3.20,1.35], pool:210000,  participants:3800,  endSecs:86400*22,  resolutionUrl:"https://api.fifa.com/worldcup/2026/semifinals",             resolutionPath:"$.african_team" },
  { id:"m11", cat:"worldcup", title:"Top scorer at 2026 World Cup?",                      type:"multi",    outcomes:["Mbappé","Vinicius Jr","Bellingham","Osimhen"], odds:[3.2,3.8,6.0,7.5], pool:520000, participants:8900, endSecs:86400*21, resolutionUrl:"https://api.fifa.com/worldcup/2026/top-scorer",         resolutionPath:"$.player.name" },
  { id:"m12", cat:"wrestling", title:"WWE SummerSlam 2026 — Universal Title?",            type:"multi",    outcomes:["CM Punk","Cody Rhodes","Roman Reigns","Seth Rollins"], odds:[2.5,2.8,3.6,4.2], pool:89000, participants:2100, endSecs:86400*3, resolutionUrl:"https://api.wwe.com/events/summerslam-2026/results", resolutionPath:"$.universal_champion" },
  { id:"m13", cat:"wrestling", title:"John Cena appears at Bash in Berlin?",              type:"binary",   outcomes:["YES","NO"],                                    odds:[1.75,2.20], pool:42000,   participants:940,   endSecs:86400*2,   resolutionUrl:"https://api.wwe.com/events/bash-in-berlin/appearances",     resolutionPath:"$.cena_appeared" },
  { id:"m14", cat:"politics",  title:"Who wins 2027 Nigerian Presidential Election?",     type:"multi",    outcomes:["APC","PDP","Labour Party","New Entrant"],       odds:[2.1,2.6,4.0,12.0], pool:680000, participants:11200, endSecs:86400*180, resolutionUrl:"https://api.inec.gov.ng/results/2027/president",       resolutionPath:"$.winner.party" },
  { id:"m15", cat:"politics",  title:"US Fed cuts rates at July 2026 meeting?",           type:"binary",   outcomes:["YES","NO"],                                    odds:[2.10,1.75], pool:1100000, participants:14300, endSecs:86400*4,   resolutionUrl:"https://api.federalreserve.gov/data/rates/latest",          resolutionPath:"$.decision" },
  { id:"m16", cat:"economy",   title:"US CPI above 3% in June 2026 report?",              type:"binary",   outcomes:["YES","NO"],                                    odds:[2.50,1.58], pool:430000,  participants:6700,  endSecs:86400*8,   resolutionUrl:"https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0", resolutionPath:"$.Results.series[0].data[0].value" },
  { id:"m17", cat:"economy",   title:"Brent Crude above $90 by Aug 1 2026?",              type:"binary",   outcomes:["YES","NO"],                                    odds:[3.10,1.38], pool:290000,  participants:4100,  endSecs:86400*12,  resolutionUrl:"https://api.eia.gov/v2/petroleum/pri/spt/data/",             resolutionPath:"$.response.data[0].value" },
  { id:"m18", cat:"economy",   title:"USD/NGN rate range end of July 2026?",              type:"multi",    outcomes:["<1400","1400–1600","1600–1800",">1800"],        odds:[8.0,2.2,3.4,5.0], pool:74000, participants:1800, endSecs:86400*14, resolutionUrl:"https://api.exchangerate.host/latest?base=USD&symbols=NGN", resolutionPath:"$.rates.NGN" },
];

export const CAT_META: Record<string, { label: string; color: string; bg: string }> = {
  "1min":     { label: "⚡ 1-Min",   color: "#ff4d6d", bg: "#ff4d6d20" },
  crypto:     { label: "Crypto",     color: "#4f8ef7", bg: "#4f8ef720" },
  sports:     { label: "Sports",     color: "#00e5a0", bg: "#00e5a020" },
  worldcup:   { label: "World Cup",  color: "#f97316", bg: "#f9731620" },
  wrestling:  { label: "Wrestling",  color: "#c084fc", bg: "#a855f720" },
  politics:   { label: "Politics",   color: "#f7c948", bg: "#f7c94820" },
  economy:    { label: "Economy",    color: "#ff6b35", bg: "#ff6b3520" },
};

export function fmtPool(pool: number) {
  if (pool >= 1_000_000) return `$${(pool / 1_000_000).toFixed(1)}M`;
  return `$${(pool / 1000).toFixed(0)}K`;
}

export function fmtTimer(secs: number) {
  if (secs <= 0)     return "CLOSED";
  if (secs < 60)     return `${secs}s`;
  if (secs < 3600)   return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, "0")}s`;
  if (secs < 86400)  return `${Math.floor(secs / 3600)}h ${String(Math.floor((secs % 3600) / 60)).padStart(2, "0")}m`;
  return `${Math.floor(secs / 86400)}d ${String(Math.floor((secs % 86400) / 3600)).padStart(2, "0")}h`;
}
