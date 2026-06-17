/**
 * YouTube Revenue Logic Engine - Version 2.0
 * Based on the Complete Revenue Attribution Logic & Authentic Calculation Engine.
 */

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  channelTitle: string;
  channelId: string;
  country: string;
  publishedAt: string;
  language?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  durationISO: string;
  subscriberCount?: number;
  madeForKids?: boolean;
  detectedNiche?: NicheType;
}

export type NicheType = "finance" | "tech" | "education" | "health" | "gaming" | "news" | "kids" | "music" | "entertainment" | "shorts";

const NICHE_KEYWORDS: Record<NicheType, string[]> = {
  finance: ["crypto", "stock", "invest", "money", "loan", "bank", "credit", "insurance", "trading", "passive income", "rich", "bitcoin", "ethereum", "forex", "dividends", "wealth", "budget", "finance", "mortgage", "credit card", "real estate", "business", "tax", "e-commerce", "shopify", "dropshipping", "revenue"],
  tech: ["review", "unboxing", "laptop", "iphone", "android", "software", "ai", "coding", "tutorial", "gadget", "specs", "benchmark", "programming", "python", "javascript", "developer", "computer", "chatgpt", "gpu", "processor", "hardware", "rtx", "windows", "macos", "linux"],
  education: ["how to", "tutorial", "learn", "course", "explained", "science", "history", "university", "school", "exam", "lesson", "lectures", "study", "academy", "math", "physics", "chemistry", "biology", "geography"],
  health: ["workout", "diet", "fitness", "yoga", "nutrition", "mental health", "doctor", "symptoms", "remedy", "muscle", "weight loss", "calories", "gym", "cardio", "healthy", "exercise", "sleep"],
  gaming: ["gameplay", "walkthrough", "ps5", "xbox", "nintendo", "pc gaming", "stream", "let's play", "fortnite", "minecraft", "roblox", "speedrun", "esports", "multiplayer", "co-op", "gamer"],
  news: ["politics", "breaking", "world", "local", "election", "current events", "report", "crisis", "news", "government", "war", "conflict"],
  kids: ["toy", "animation", "cartoons", "nursery rhymes", "play", "storytime", "for kids", "lego", "disney", "barbie", "cocomelon"],
  music: ["official video", "lyric video", "remix", "cover", "album", "single", "concert", "live performance", "song", "beats", "lofi", "instrumental", "rap", "pop-music"],
  entertainment: ["vlog", "comedy", "prank", "reaction", "movie", "celebrity", "drama", "challenge", "funny", "memes", "show", "series", "talkshow"],
  shorts: ["#shorts", "short"]
};

// 2025-2026 validated CPM table
export const CPM_TABLE: Record<NicheType, { low: number; mid: number; high: number }> = {
  finance: { low: 15, mid: 25, high: 45 },
  tech: { low: 8, mid: 13, high: 22 },
  education: { low: 7, mid: 11, high: 20 },
  health: { low: 5, mid: 9, high: 16 },
  gaming: { low: 2, mid: 4, high: 8 },
  news: { low: 3, mid: 6, high: 10 },
  kids: { low: 1, mid: 2, high: 4 },
  music: { low: 0.8, mid: 1.5, high: 3 },
  entertainment: { low: 1.5, mid: 3, high: 6 },
  shorts: { low: 0.05, mid: 0.12, high: 0.25 }
};

// Backward compatibility map
export const NICHE_RPM: Record<NicheType, { min: number; max: number; cpmMin: number; cpmMax: number }> = {
  finance: { min: 4.40, max: 13.75, cpmMin: 15, cpmMax: 45 },
  tech: { min: 2.20, max: 6.60, cpmMin: 8, cpmMax: 22 },
  education: { min: 1.65, max: 5.50, cpmMin: 7, cpmMax: 20 },
  health: { min: 1.65, max: 4.95, cpmMin: 5, cpmMax: 16 },
  gaming: { min: 0.55, max: 2.75, cpmMin: 2, cpmMax: 8 },
  news: { min: 1.10, max: 3.85, cpmMin: 3, cpmMax: 10 },
  kids: { min: 1.10, max: 3.30, cpmMin: 1, cpmMax: 4 },
  music: { min: 0.28, max: 1.65, cpmMin: 0.8, cpmMax: 3 },
  entertainment: { min: 0.28, max: 1.65, cpmMin: 1.5, cpmMax: 6 },
  shorts: { min: 0.03, max: 0.07, cpmMin: 0.05, cpmMax: 0.25 }
};

// 2025-2026 country multiplier (relative to US baseline)
export const COUNTRY_MULTIPLIER: Record<string, number> = {
  US: 1.00, USA: 1.00,
  AU: 1.10, Australia: 1.10,
  CA: 0.89, Canada: 0.89,
  NO: 0.85, CH: 0.85, Norway: 0.85, Switzerland: 0.85,
  GB: 0.80, UK: 0.80, "United Kingdom": 0.80,
  DE: 0.70, NL: 0.70, Germany: 0.70, Netherlands: 0.70,
  FR: 0.55, ES: 0.55, IT: 0.55, France: 0.55, Spain: 0.55, Italy: 0.55,
  JP: 0.40, Japan: 0.40,
  AE: 0.35, UAE: 0.35, "Saudi Arabia": 0.35, SA: 0.35,
  BR: 0.22, MX: 0.22, Brazil: 0.22, Mexico: 0.22,
  TR: 0.15, Turkey: 0.15,
  IN: 0.12, India: 0.12,
  PK: 0.10, Pakistan: 0.10,
  PH: 0.10, Philippines: 0.10,
  BD: 0.07, Bangladesh: 0.07,
  NG: 0.08, Nigeria: 0.08,
  Default: 0.55, Unknown: 0.55
};

// Seasonal Multiplier table based on real-world CPM trends
export const SEASONAL_MULTIPLIER: Record<number, number> = {
  1: 0.65,  // Jan
  2: 0.75,  // Feb
  3: 0.85,  // Mar
  4: 1.10,  // Apr
  5: 1.10,  // May
  6: 0.90,  // Jun
  7: 0.88,  // Jul
  8: 0.80,  // Aug
  9: 0.95,  // Sep
  10: 1.15, // Oct
  11: 1.35, // Nov
  12: 1.50  // Dec
};

// Premium penetration rate by country
export const PREMIUM_VIEWER_RATE: Record<string, number> = {
  US: 0.10, USA: 0.10,
  GB: 0.075, UK: 0.075,
  CA: 0.075,
  AU: 0.08,
  DE: 0.065, NL: 0.065,
  JP: 0.12,
  PK: 0.0075,
  IN: 0.015,
  BD: 0.004,
  BR: 0.03,
  Default: 0.04, Unknown: 0.04
};

// Ad safety classification multiplier
export const AD_IMPRESSION_RATE: Record<NicheType, number> = {
  finance: 0.55,
  tech: 0.55,
  education: 0.50,
  health: 0.48,
  gaming: 0.38,
  news: 0.48,
  kids: 0.35,
  music: 0.35,
  entertainment: 0.45,
  shorts: 0.15
};

// Affiliate demand and commission structures by niche
export const PURCHASE_INTENT_RATE: Record<NicheType, number> = {
  tech: 0.08,
  finance: 0.06,
  health: 0.05,
  gaming: 0.04,
  education: 0.03,
  entertainment: 0.01,
  music: 0.005,
  news: 0.01,
  kids: 0.005,
  shorts: 0.005
};

export const AVG_COMMISSION: Record<NicheType, number> = {
  tech: 4.50,
  finance: 50.00,
  health: 5.00,
  gaming: 2.40,
  education: 7.50,
  entertainment: 1.50,
  music: 1.00,
  news: 1.50,
  kids: 1.00,
  shorts: 0.50
};

// Sponsorship / Brand Deal niche demand weights
export const SPONSOR_NICHE_MULT: Record<NicheType, number> = {
  finance: 3.5,
  tech: 2.5,
  health: 2.5,
  education: 2.0,
  gaming: 1.5,
  news: 1.8,
  entertainment: 1.2,
  music: 1.0,
  kids: 1.0,
  shorts: 0.5
};

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  return (hours * 3600) + (minutes * 60) + seconds;
}

export function detectNiche(data: YouTubeVideoData): NicheType {
  const durationSeconds = data.durationISO ? parseISO8601Duration(data.durationISO) : 0;
  if (durationSeconds > 0 && durationSeconds <= 62) return "shorts";

  const analysisText = `${data.title} ${data.description} ${data.tags.join(" ")}`.toLowerCase();

  const scores: Record<NicheType, number> = {
    finance: 0,
    tech: 0,
    education: 0,
    health: 0,
    gaming: 0,
    news: 0,
    kids: 0,
    music: 0,
    entertainment: 0,
    shorts: 0
  };

  for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
    if (niche === "shorts") continue;
    keywords.forEach(kw => {
      if (data.title.toLowerCase().includes(kw)) {
        scores[niche as NicheType] += 12;
      }
      if (data.tags.some(t => t.toLowerCase() === kw)) {
        scores[niche as NicheType] += 8;
      } else if (data.tags.some(t => t.toLowerCase().includes(kw))) {
        scores[niche as NicheType] += 4;
      }
      if (data.description.toLowerCase().includes(kw)) {
        scores[niche as NicheType] += 2;
      }
    });
  }

  const cat = data.categoryId;
  if (cat === "28") scores.tech += 20;
  else if (cat === "20") scores.gaming += 25;
  else if (cat === "10") scores.music += 25;
  else if (cat === "25") scores.news += 25;
  else if (cat === "27") scores.education += 15;
  else if (cat === "17") scores.health += 12;
  else if (cat === "37" || cat === "15") scores.kids += 15;
  else if (cat === "24" || cat === "22" || cat === "19") scores.entertainment += 15;
  else if (cat === "23" || cat === "34") scores.entertainment += 20;
  else if (cat === "26") scores.education += 15;
  else if (cat === "1") scores.entertainment += 15;

  let bestNiche: NicheType = "entertainment";
  let maxScore = 0;

  for (const [niche, score] of Object.entries(scores)) {
    if (niche === "shorts") continue;
    if (score > maxScore) {
      maxScore = score;
      bestNiche = niche as NicheType;
    }
  }

  if (maxScore === 0) {
    if (cat === "28") return "tech";
    if (cat === "20") return "gaming";
    if (cat === "10") return "music";
    if (cat === "25") return "news";
    if (cat === "27") return "education";
    if (cat === "17") return "health";
    if (cat === "24" || cat === "22" || cat === "23" || cat === "1") return "entertainment";
  }

  return bestNiche;
}

export function getCustomNicheName(niche: NicheType, title: string, description: string, tags: string[]): string {
  const t = (title + " " + tags.join(" ")).toLowerCase();
  
  if (niche === "shorts") return "Vertical Short-Form Media";

  if (niche === "finance") {
    if (t.includes("crypto") || t.includes("bitcoin") || t.includes("ethereum") || t.includes("blockchain")) return "Cryptocurrency & Web3 Markets";
    if (t.includes("stock") || t.includes("trade") || t.includes("invest") || t.includes("option") || t.includes("forex")) return "Stock Market & Portfolio Strategy";
    if (t.includes("passive") || t.includes("dropship") || t.includes("shopify") || t.includes("business") || t.includes("revenue")) return "E-Commerce & Digital Ventures";
    if (t.includes("tax") || t.includes("credit") || t.includes("saving") || t.includes("budget") || t.includes("wealth")) return "Personal Finance & Wealth Management";
    return "Financial Markets & Business Strategy";
  }
  if (niche === "tech") {
    if (t.includes("ai") || t.includes("gpt") || t.includes("chatbot") || t.includes("intelligence") || t.includes("llm") || t.includes("neural")) return "Artificial Intelligence & ML Systems";
    if (t.includes("coding") || t.includes("programming") || t.includes("developer") || t.includes("tutorial") || t.includes("software")) return "Software Development & Engineering";
    if (t.includes("iphone") || t.includes("android") || t.includes("smartphone") || t.includes("gadget")) return "Mobile Tech & Consumer Hardware";
    if (t.includes("unboxing") || t.includes("review") || t.includes("specs")) return "Tech Unboxings & Hardware Reviews";
    return "Science, Technology & Innovation";
  }
  if (niche === "education") {
    if (t.includes("explain") || t.includes("why") || t.includes("science") || t.includes("space")) return "Scientific Documentaries & Syntheses";
    if (t.includes("history") || t.includes("world") || t.includes("war")) return "Historical Chronologies & Analytics";
    if (t.includes("how to") || t.includes("tutorial")) return "Practical How-To Guides & Skill Development";
    return "General Academic Lectures & Tutorials";
  }
  if (niche === "health") {
    if (t.includes("workout") || t.includes("gym") || t.includes("muscle") || t.includes("exercise") || t.includes("fitness")) return "Bodybuilding & Exercise Regimens";
    if (t.includes("diet") || t.includes("nutrit") || t.includes("eat") || t.includes("recipe") || t.includes("weight")) return "Clinical Nutrition & Dietetics";
    return "Integrative Health & Physical Fitness";
  }
  if (niche === "gaming") {
    if (t.includes("walkthrough") || t.includes("guide") || t.includes("how to") || t.includes("mod")) return "Action-Adventure Walkthroughs & Guides";
    if (t.includes("stream") || t.includes("live") || t.includes("tournament") || t.includes("match")) return "Esports Streams & Tournament Plays";
    return "Interactive Gaming Reviews & Commentary";
  }
  if (niche === "entertainment") {
    if (t.includes("vlog") || t.includes("day in")) return "Lifestyle Vlogging & Journals";
    if (t.includes("prank") || t.includes("challeng") || t.includes("funny") || t.includes("comedy")) return "Social Comedy & Interactive Challenges";
    return "Immersive General Entertainment";
  }
  return niche.charAt(0).toUpperCase() + niche.slice(1);
}

export function detectPrimaryCountry(data: YouTubeVideoData): string {
  const fullText = (data.title + " " + data.description + " " + data.tags.join(" ")).toLowerCase();
  
  // Script characters
  const hasUrduScript = /[\u0600-\u06FF]/.test(data.title + " " + data.description);
  const hasHindiScript = /[\u0900-\u097F]/.test(data.title + " " + data.description);
  
  if (hasUrduScript) return "PK";
  if (hasHindiScript) return "IN";
  
  // Currency representations
  if (fullText.includes("pkr") || fullText.includes("rupay") || fullText.includes("easypaisa") || fullText.includes("jazzcash") || fullText.includes("sadapay") || fullText.includes("nayapay")) return "PK";
  if (fullText.includes("inr") || fullText.includes("rupee") || fullText.includes("paytm") || fullText.includes("phonepe") || fullText.includes("upi transfer") || fullText.includes("bhim")) return "IN";
  if (fullText.includes("pix") || fullText.includes("brl") || fullText.includes("boleto") || fullText.includes("brasil") || fullText.includes("brazil")) return "BR";

  // Regional keywords as secondary signal
  const pkKeywords = ["pakistan", "lahore", "karachi", "islamabad", "punjabi", "romani urdu", "earning app in pakistan", "make money online in pakistan", "urdu tutorial"];
  const inKeywords = ["delhi", "mumbai", "bengaluru", "technical guruji", "manoj dey", "hindi tutorial", "india earning", "earn money in india"];
  
  if (pkKeywords.some(kw => fullText.includes(kw))) return "PK";
  if (inKeywords.some(kw => fullText.includes(kw))) return "IN";

  // Check channel country
  const channelCountry = (data.country || "").toUpperCase();
  if (channelCountry && channelCountry !== "UNKNOWN" && channelCountry !== "") {
    return channelCountry;
  }

  // Language keywords
  if (/\b(como|dinero|gratis|ganar|canal|espanol|español|suscribete)\b/i.test(fullText)) return "ES";
  if (/\b(deutsch|deutschland|gmbh)\b/i.test(fullText)) return "DE";

  return "US";
}

export function detectAudienceDistribution(data: YouTubeVideoData): { name: string; percent: number }[] {
  const primary = detectPrimaryCountry(data);

  if (primary === "PK") {
    return [
      { name: "Pakistan (PK)", percent: 68 },
      { name: "India (IN)", percent: 14 },
      { name: "United Arab Emirates (AE)", percent: 8 },
      { name: "Saudi Arabia (SA)", percent: 6 },
      { name: "United Kingdom (GB)", percent: 4 }
    ];
  }
  if (primary === "IN") {
    return [
      { name: "India (IN)", percent: 75 },
      { name: "Pakistan (PK)", percent: 9 },
      { name: "United Arab Emirates (AE)", percent: 5 },
      { name: "United States (US)", percent: 6 },
      { name: "Bangladesh (BD)", percent: 5 }
    ];
  }
  if (primary === "GB") {
    return [
      { name: "United Kingdom (GB)", percent: 52 },
      { name: "United States (US)", percent: 22 },
      { name: "Canada (CA)", percent: 8 },
      { name: "Australia (AU)", percent: 6 },
      { name: "Germany (DE)", percent: 12 }
    ];
  }
  if (primary === "CA") {
    return [
      { name: "Canada (CA)", percent: 50 },
      { name: "United States (US)", percent: 30 },
      { name: "United Kingdom (GB)", percent: 8 },
      { name: "Australia (AU)", percent: 4 },
      { name: "Europe (EU)", percent: 8 }
    ];
  }
  if (primary === "AU") {
    return [
      { name: "Australia (AU)", percent: 48 },
      { name: "United States (US)", percent: 24 },
      { name: "United Kingdom (GB)", percent: 12 },
      { name: "New Zealand (NZ)", percent: 10 },
      { name: "Canada (CA)", percent: 6 }
    ];
  }
  if (primary === "DE") {
    return [
      { name: "Germany (DE)", percent: 70 },
      { name: "Austria (AT)", percent: 12 },
      { name: "Switzerland (CH)", percent: 8 },
      { name: "United States (US)", percent: 4 },
      { name: "Rest of Europe", percent: 6 }
    ];
  }
  if (primary === "BR") {
    return [
      { name: "Brazil (BR)", percent: 82 },
      { name: "Portugal (PT)", percent: 8 },
      { name: "United States (US)", percent: 4 },
      { name: "Angola (AO)", percent: 3 },
      { name: "Others", percent: 3 }
    ];
  }
  if (primary === "ES") {
    return [
      { name: "Spain (ES)", percent: 38 },
      { name: "Mexico (MX)", percent: 28 },
      { name: "Colombia (CO)", percent: 14 },
      { name: "Argentina (AR)", percent: 12 },
      { name: "United States (US)", percent: 8 }
    ];
  }

  // Default: US / Tier-1 Global
  return [
    { name: "United States (US)", percent: 45 },
    { name: "United Kingdom (GB)", percent: 12 },
    { name: "Canada (CA)", percent: 8 },
    { name: "Australia (AU)", percent: 7 },
    { name: "Rest of World (RoW)", percent: 28 }
  ];
}

export function calculateRevenue(data: YouTubeVideoData) {
  // Parsing Video Variables
  const durationSeconds = parseISO8601Duration(data.durationISO);
  const durationMins = durationSeconds / 60;
  const isShort = durationSeconds > 0 && durationSeconds <= 62;

  // Niche Detection
  const detectedNiche = data.detectedNiche || detectNiche(data);
  const nicheCpm = CPM_TABLE[detectedNiche];
  const customNicheName = getCustomNicheName(detectedNiche, data.title, data.description, data.tags);

  // Country multiplier
  const countryKey = detectPrimaryCountry(data);
  const countryMultiplier = COUNTRY_MULTIPLIER[countryKey] || COUNTRY_MULTIPLIER.Default;

  // Season multiplier (from publish date)
  const pubDate = new Date(data.publishedAt);
  const uploadMonth = isNaN(pubDate.getTime()) ? 6 : pubDate.getMonth() + 1;
  const seasonalMultiplier = SEASONAL_MULTIPLIER[uploadMonth] || 1.0;

  // Engagement calculations as retention signal proxy
  const totalEngagements = data.likeCount + data.commentCount;
  const engagementRate = data.viewCount > 0 ? (totalEngagements / data.viewCount) * 100 : 0;
  const likeRatio = data.viewCount > 0 ? (data.likeCount / data.viewCount) * 100 : 0;

  // Derive retention percentage
  let baseRetention = 45; // baseline in %
  if (isShort) {
    baseRetention = 70;
  } else if (durationMins <= 5) {
    baseRetention = 55;
  } else if (durationMins > 15) {
    baseRetention = 35;
  }

  let likeMult = 1.0;
  if (likeRatio > 6) likeMult = 1.25;
  else if (likeRatio > 4) likeMult = 1.10;
  else if (likeRatio < 1.5) likeMult = 0.75;
  else if (likeRatio < 3) likeMult = 0.90;

  let estimatedRetentionPct = baseRetention * likeMult;
  estimatedRetentionPct = Math.max(10, Math.min(95, Math.round(estimatedRetentionPct)));

  // Retention map multiplier against base CPM
  let retentionMult = 1.0;
  if (estimatedRetentionPct < 20) retentionMult = 0.50;
  else if (estimatedRetentionPct < 30) retentionMult = 0.70;
  else if (estimatedRetentionPct < 40) retentionMult = 0.85;
  else if (estimatedRetentionPct < 50) retentionMult = 1.00;
  else if (estimatedRetentionPct < 60) retentionMult = 1.30;
  else if (estimatedRetentionPct < 70) retentionMult = 1.70;
  else retentionMult = 2.10;

  // Mid-roll inventory multiplier
  const midrollCount = (durationMins >= 8 && !isShort) ? Math.max(0, Math.floor((durationMins - 8) / 5) + 1) : 0;
  let midrollMult = 1.0;
  if (durationMins >= 8 && !isShort) {
    let effectiveMidrolls = midrollCount;
    if (estimatedRetentionPct < 40) {
      effectiveMidrolls = midrollCount * (estimatedRetentionPct / 40);
    }
    midrollMult = 1 + (effectiveMidrolls * 0.08);
    midrollMult = Math.min(2.0, midrollMult);
  }

  // COPPA or custom category ad safety modifier
  let safetyMult = 1.0;
  if (data.madeForKids) {
    safetyMult = 0.25;
  } else if (detectedNiche === "entertainment") {
    const analysisText = `${data.title} ${data.tags.join(" ")}`.toLowerCase();
    if (analysisText.includes("prank") || analysisText.includes("reaction")) {
      safetyMult = 0.70;
    }
  }

  // --- STREAM 1: ADSENSE (AD REVENUE) ---
  // Blended CPM values (advertiser paid basis)
  const cpmMin = nicheCpm.low * countryMultiplier * seasonalMultiplier * retentionMult * midrollMult * safetyMult;
  const cpmMax = nicheCpm.high * countryMultiplier * seasonalMultiplier * retentionMult * midrollMult * safetyMult;

  // True monetized impressions volume (different from raw views)
  const adImpressionRate = AD_IMPRESSION_RATE[detectedNiche] || 0.45;
  const monetizedViews = Math.round(data.viewCount * adImpressionRate);

  // Math formula for gross ad spend
  const grossAdSenseMin = (monetizedViews / 1000) * cpmMin;
  const grossAdSenseMax = (monetizedViews / 1000) * cpmMax;

  // Net YouTube share (YouTube takes 45% of ad revenue, creator receives 55%)
  const netAdSenseMin = grossAdSenseMin * 0.55;
  const netAdSenseMax = grossAdSenseMax * 0.55;

  const rpmMin = data.viewCount > 0 ? (netAdSenseMin / data.viewCount) * 1000 : 0;
  const rpmMax = data.viewCount > 0 ? (netAdSenseMax / data.viewCount) * 1000 : 0;

  // --- STREAM 2: SPONSORSHIPS / BRAND DEALS ---
  const subscribers = data.subscriberCount || 0;
  let sponsorTierName = "Tier 0 (Nano Creator)";
  let tierMin = 0;
  let tierMax = 0;

  if (subscribers < 10000) {
    sponsorTierName = "Tier 0 (Brand Seedling)";
    tierMin = 0;
    tierMax = 0;
  } else if (subscribers < 50000) {
    sponsorTierName = "Tier 1 (Micro Influencer)";
    tierMin = 200;
    tierMax = 1500;
  } else if (subscribers < 250000) {
    sponsorTierName = "Tier 2 (Mid-Tier Influencer)";
    tierMin = 1500;
    tierMax = 8000;
  } else if (subscribers < 1000000) {
    sponsorTierName = "Tier 3 (Macro Influencer)";
    tierMin = 8000;
    tierMax = 30000;
  } else {
    sponsorTierName = "Tier 4 (Mega Influencer)";
    tierMin = 30000;
    tierMax = 120000;
  }

  const sponsorNicheMult = SPONSOR_NICHE_MULT[detectedNiche] || 1.0;
  const engagedViews = data.viewCount * (estimatedRetentionPct / 100);

  // Brands pay 2-5x AdSense CPM (using 2.5x standard) for guaranteed placement
  const sponsorCPMMin = cpmMin * sponsorNicheMult * 2.5;
  const sponsorCPMMax = cpmMax * sponsorNicheMult * 2.5;
  const potentialSponsorMin = (engagedViews / 1000) * sponsorCPMMin;
  const potentialSponsorMax = (engagedViews / 1000) * sponsorCPMMax;

  // Clamped by subscriber bracket defaults to avoid high-view nano anomalies
  const clampedSponsorMin = subscribers < 10000 ? 0 : Math.max(tierMin, Math.min(tierMax, potentialSponsorMin));
  const clampedSponsorMax = subscribers < 10000 ? 0 : Math.max(tierMin, Math.min(tierMax, potentialSponsorMax));

  // --- STREAM 3: AFFILIATE MARKETING ---
  const purchaseIntentRate = PURCHASE_INTENT_RATE[detectedNiche] || 0.02;
  const avgCommission = AVG_COMMISSION[detectedNiche] || 5.00;
  const purchaseIntentViews = data.viewCount * purchaseIntentRate;
  
  // click rate benchmark 15% of high intent viewers
  const affiliateClicks = purchaseIntentViews * 0.15;
  
  // conversion rates min 1% and max 3% (centered around 2% industry avg)
  const affiliateConversionsMin = affiliateClicks * 0.01;
  const affiliateConversionsMax = affiliateClicks * 0.03;

  const potentialAffiliateMin = affiliateConversionsMin * avgCommission;
  const potentialAffiliateMax = affiliateConversionsMax * avgCommission;

  // --- STREAM 4: YOUTUBE PREMIUM REVENUE SHARE ---
  const premiumRate = PREMIUM_VIEWER_RATE[countryKey] || PREMIUM_VIEWER_RATE.Default;
  const premiumViews = data.viewCount * premiumRate;
  // premium RPM averages ~30% higher than regular ad RPMs due to sub pooling
  const premiumRPMMin = rpmMin * 1.3;
  const premiumRPMMax = rpmMax * 1.3;
  const premiumEarnMin = (premiumViews / 1000) * premiumRPMMin;
  const premiumEarnMax = (premiumViews / 1000) * premiumRPMMax;

  // --- STREAM 5: CHANNEL MEMBERSHIPS / DIGITAL GOODS ---
  let memberConvRateMin = 0.0001;
  let memberConvRateMax = 0.0003;
  if (likeRatio > 5) {
    memberConvRateMin = 0.0005;
    memberConvRateMax = 0.0010;
  } else if (likeRatio > 2) {
    memberConvRateMin = 0.0001;
    memberConvRateMax = 0.0003;
  } else {
    memberConvRateMin = 0.00002;
    memberConvRateMax = 0.00005;
  }

  const membershipConversionsMin = data.viewCount * memberConvRateMin;
  const membershipConversionsMax = data.viewCount * memberConvRateMax;
  const lifetimeValuePerMember = 15.97; // 3.2 months typical avg lifespan at $4.99/mo

  const potentialMembershipMin = membershipConversionsMin * lifetimeValuePerMember * 0.70; // 70% share after YT cut
  const potentialMembershipMax = membershipConversionsMax * lifetimeValuePerMember * 0.70;

  // --- REALIZED VALUES SCAN (GATE ACCURACY) ---
  const descriptionLower = data.description.toLowerCase();
  
  const affiliateKeywords = [
    'amzn.to', 'amazon.com', 'bit.ly', 'affiliate', 'referral', 'discount code', 
    'coupon', 'buy here', 'shop my', 'link in bio', 'my gear', 'rakuten', 'impact.com', 
    'shareasale', 'bluehost', 'nordvpn', 'tinyurl.com', 'rebrand.ly', 'linktr.ee', 'lnk.to', 'geni.us'
  ];
  const sponsorKeywords = [
    'sponsored by', 'partnership with', '#ad', 'paid promotion', 'brought to you by', 
    'thanks to our sponsor', 'sponsored segment', 'promo code', 'brand deal', 
    'collaboration with', 'exclusive offer', 'sponsorship', 'advertise'
  ];
  const productKeywords = [
    'my course', 'on my store', 'buy my merch', 'patreon.com', 'gumroad', 'newsletter', 
    'book is out', 'join my membership', 'exclusive content', 'teespring', 'shopify',
    'masterclass', 'consulting', 'coaching', 'download my', 'buymeacoffee', 'subscribestar'
  ];

  const hasAffiliate = affiliateKeywords.some(kw => descriptionLower.includes(kw));
  const hasSponsor = sponsorKeywords.some(kw => descriptionLower.includes(kw) || data.title.toLowerCase().includes(kw));
  const hasProduct = productKeywords.some(kw => descriptionLower.includes(kw));
  const hasMembershipSignal = subscribers > 30000 || hasProduct;

  const realizedSponsorMin = hasSponsor ? clampedSponsorMin : 0;
  const realizedSponsorMax = hasSponsor ? clampedSponsorMax : 0;

  const realizedAffiliateMin = hasAffiliate ? potentialAffiliateMin : 0;
  const realizedAffiliateMax = hasAffiliate ? potentialAffiliateMax : 0;

  const realizedProductMin = hasMembershipSignal ? potentialMembershipMin : 0;
  const realizedProductMax = hasMembershipSignal ? potentialMembershipMax : 0;

  // Standard sum of realized earnings
  const totalEarningsMin = Math.round((netAdSenseMin + realizedSponsorMin + realizedAffiliateMin + premiumEarnMin + realizedProductMin) * 100) / 100;
  const totalEarningsMax = Math.round((netAdSenseMax + realizedSponsorMax + realizedAffiliateMax + premiumEarnMax + realizedProductMax) * 100) / 100;

  // Total potential earnings (if all streams are set up/fully optimized)
  const potentialEarningsMin = Math.round((netAdSenseMin + clampedSponsorMin + potentialAffiliateMin + premiumEarnMin + potentialMembershipMin) * 100) / 100;
  const potentialEarningsMax = Math.round((netAdSenseMax + clampedSponsorMax + potentialAffiliateMax + premiumEarnMax + potentialMembershipMax) * 100) / 100;

  // Dynamic explanation strings (Show Your Work)
  const getMonthName = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "Current Month" : d.toLocaleDateString(undefined, { month: 'long' });
  };

  const adsenseExplanation = `Your AdSense estimate is $${netAdSenseMin.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $${netAdSenseMax.toLocaleString(undefined, { maximumFractionDigits: 0 })} because:
  • ${data.viewCount.toLocaleString()} views × ${(adImpressionRate * 100).toFixed(0)}% ad rate = ${Math.round(monetizedViews).toLocaleString()} monetization impressions.
  • Your niche (${detectedNiche.toUpperCase()}) US base CPM range is $${nicheCpm.low} - $${nicheCpm.high}.
  • Geography (${countryKey}) applies a multiplier of x${countryMultiplier.toFixed(2)}.
  • Published in ${getMonthName(data.publishedAt)}: x${seasonalMultiplier.toFixed(2)} seasonal fluctuation.
  • Estimated ${estimatedRetentionPct}% watch retention: x${retentionMult.toFixed(2)} retention multiplier.
  • Content length is ${durationMins.toFixed(1)}m. This places ${midrollCount} mid-roll ads into the stream, multiplying CPM by x${midrollMult.toFixed(2)}.
  • Blended effective CPM: $${cpmMin.toFixed(2)} - $${cpmMax.toFixed(2)}.
  • Gross advertiser spend: $${grossAdSenseMin.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $${grossAdSenseMax.toLocaleString(undefined, { maximumFractionDigits: 0 })}.
  • Net earnings (Creator keeps 55% share): $${netAdSenseMin.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $${netAdSenseMax.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`;

  const sponsorExplanation = hasSponsor
    ? `Sponsorship earnings ($${realizedSponsorMin.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $${realizedSponsorMax.toLocaleString(undefined, { maximumFractionDigits: 0 })}) are active because:
    • Brand integration references or hashtags were found in description.
    • Total engaged views (proxied by retention): ${Math.round(engagedViews).toLocaleString()}.
    • Brands typical CPM premium is 2.5x AdSense effective CPM ($${(cpmMin * 2.5).toFixed(2)} - $${(cpmMax * 2.5).toFixed(2)}) for aligned niches.
    • Channel scale falls under ${sponsorTierName}, caps bracket between $${tierMin} and $${tierMax}.`
    : `No active brand integration links or sponsor segments were detected in description. Max potential for your scale if a sponsorship deals is secured: $${clampedSponsorMin.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $${clampedSponsorMax.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`;

  const affiliateExplanation = hasAffiliate
    ? `Affiliate earnings ($${realizedAffiliateMin.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $${realizedAffiliateMax.toLocaleString(undefined, { maximumFractionDigits: 0 })}) are active because:
    • Referral links or tracking domains matching affiliate networks were identified in description.
    • Estimated purchase-intent view rate: ${(purchaseIntentRate * 100).toFixed(1)}% based on your ${detectedNiche} niche.
    • Typical click-through CTR on links: 15% of high intent viewers (${Math.round(affiliateClicks).toLocaleString()} clicks).
    • Conversion basis: 1.0% to 3.0% purchase rate, yielding ${affiliateConversionsMin.toFixed(1)} - ${affiliateConversionsMax.toFixed(1)} conversions.
    • Estimated AOV commission logic: $${avgCommission.toFixed(2)} average commission per checkout.`
    : `No commercial links or affiliate referral networks were active in description. Preparing contextual anchor links could tap into an estimated $${potentialAffiliateMin.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $${potentialAffiliateMax.toLocaleString(undefined, { maximumFractionDigits: 0 })} revenue stream.`;

  const premiumExplanation = `Premium share revenue ($${premiumEarnMin.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $${premiumEarnMax.toLocaleString(undefined, { maximumFractionDigits: 0 })}) is active because:
  • Audience geography (${countryKey}) features a typical premium membership rate of ${(premiumRate * 100).toFixed(1)}%.
  • Yields ${Math.round(premiumViews).toLocaleString()} ad-free premium views.
  • Paid directly from YouTube subscription pools rather than ads, delivering a premium premium RPM multiplier of 1.3x.`;

  const membershipExplanation = hasMembershipSignal
    ? `Channel membership lifetime value attribution ($${realizedProductMin.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $${realizedProductMax.toLocaleString(undefined, { maximumFractionDigits: 0 })}) is active because:
    • Custom subscription links (e.g. Patreon, memberships, or merch) were identified.
    • Calculated signup conversion: ${(memberConvRateMin * 100).toFixed(4)}% - ${(memberConvRateMax * 100).toFixed(4)}% based on loyalty index.
    • Standard membership churn life value: $15.97 average LTV per member (3.2 months of $4.99/mo).
    • Creator Net Share: 70% share from channel subscriptions after platform commission.`
    : `No custom digital products, courses, or subscription links detected. Adding digital goods or channel memberships could drive an estimated $${potentialMembershipMin.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $${potentialMembershipMax.toLocaleString(undefined, { maximumFractionDigits: 0 })} in additional video value.`;

  // Confidence scoring system
  const calculateConfidence = () => {
    let adSenseConf = "HIGH";
    let sponsorConf = subscribers >= 10000 ? "MEDIUM" : "LOW";
    let affiliateConf = (detectedNiche === "tech" || detectedNiche === "finance") ? "MEDIUM" : "LOW";
    let premiumConf = "MEDIUM";
    let membershipConf = "LOW";

    let overall = "Estimate reliability: Approximate — add channel data for better accuracy";
    if (adSenseConf === "HIGH" && subscribers >= 50000) {
      overall = "Estimate reliability: High";
    } else if (subscribers < 10000) {
      overall = "Estimate reliability: Rough range only";
    }

    return {
      adsense: adSenseConf,
      sponsor: sponsorConf,
      affiliate: affiliateConf,
      premium: premiumConf,
      membership: membershipConf,
      overall
    };
  };

  const confidence = calculateConfidence();

  // Tag analysis
  const allTags = data.tags || [];
  const totalTagCount = allTags.length;
  const channelTitleLower = data.channelTitle.toLowerCase();
  const videoTitleLower = data.title.toLowerCase();
  const nicheKeywords = NICHE_KEYWORDS[detectedNiche] || [];

  const strongRelevanceTags = allTags.filter(tag => {
    const tagLower = tag.toLowerCase();
    return channelTitleLower.includes(tagLower) || 
           tagLower.includes(channelTitleLower) || 
           videoTitleLower.includes(tagLower) || 
           tagLower.includes(videoTitleLower) ||
           nicheKeywords.some(kw => tagLower.includes(kw));
  });

  const tagAnalysis = {
    total: totalTagCount,
    strong: strongRelevanceTags.length,
    raw: totalTagCount - strongRelevanceTags.length
  };

  // Country Distribution Projection
  const countryDistribution = detectAudienceDistribution(data);

  // EPV
  const epvMin = totalEarningsMin / (data.viewCount || 1);
  const epvMax = totalEarningsMax / (data.viewCount || 1);

  // URL extraction
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urlsInDescription = (data.description || "").match(urlRegex) || [];
  const detectedSources: { url: string; platform: string; type: "affiliate" | "sponsor" | "product" | "social" | "general" }[] = [];
  
  urlsInDescription.forEach(urlStr => {
    let cleanUrl = urlStr.replace(/[.,\)\}\]]+$/, "");
    const urlLower = cleanUrl.toLowerCase();
    
    if (urlLower.length > 200 || urlLower.length < 8) return;
    if (detectedSources.some(item => item.url === cleanUrl)) return;
    
    if (urlLower.includes('amzn.to') || urlLower.includes('amazon.com') || urlLower.includes('target.com') || urlLower.includes('walmart.com') || urlLower.includes('aliexpress') || urlLower.includes('ebay.com')) {
      detectedSources.push({ url: cleanUrl, platform: "Amazon / Retail Affiliate", type: "affiliate" });
    } else if (urlLower.includes('patreon.com') || urlLower.includes('subscribestar') || urlLower.includes('buymeacoffee')) {
      detectedSources.push({ url: cleanUrl, platform: "Patreon / Fan Support", type: "product" });
    } else if (urlLower.includes('gumroad.com') || urlLower.includes('shopify.com') || urlLower.includes('myshopify.com') || urlLower.includes('teespring') || urlLower.includes('spri.ng') || urlLower.includes('redbubble')) {
      detectedSources.push({ url: cleanUrl, platform: "Merch / Digital Store", type: "product" });
    } else if (urlLower.includes('udemy.com') || urlLower.includes('teachable') || urlLower.includes('skillshare') || urlLower.includes('coursera') || urlLower.includes('teach')) {
      detectedSources.push({ url: cleanUrl, platform: "Online Academy / Course", type: "product" });
    } else if (urlLower.includes('bit.ly') || urlLower.includes('tinyurl.com') || urlLower.includes('rebrand.ly') || urlLower.includes('linktr.ee') || urlLower.includes('lnk.to') || urlLower.includes('geni.us') || urlLower.includes('link')) {
      detectedSources.push({ url: cleanUrl, platform: "Redirect / Referral Anchor", type: "affiliate" });
    } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com') || urlLower.includes('instagram.com') || urlLower.includes('facebook.com') || urlLower.includes('tiktok.com') || urlLower.includes('discord.gg') || urlLower.includes('linkedin.com') || urlLower.includes('github.com')) {
      detectedSources.push({ url: cleanUrl, platform: "Social Profile", type: "social" });
    } else if (urlLower.includes('sponsorship') || urlLower.includes('brand') || urlLower.includes('advertise') || urlLower.includes('business')) {
      detectedSources.push({ url: cleanUrl, platform: "Business Inquiry Inquiry Panel", type: "sponsor" });
    } else {
      detectedSources.push({ url: cleanUrl, platform: "External Resource / Brand Website", type: "general" });
    }
  });

  const fallbackActionPoints = [
    ...(durationMins <= 1.1 ? [{
      title: "Vertical Shorts Retention Hook",
      desc: "Shorts rely heavily on >100% video retention. Structure a 1.5-second visual loop with bold dynamic card overlays and place your primary affiliate anchor in the pinned comments."
    }] : durationMins < 8.0 ? [{
      title: "Unlock 8-Minute Mid-Roll Inventory",
      desc: "This video is currently " + durationMins.toFixed(1) + " minutes long. Structuring your future content to cross the 8.0-minute mark allows mid-rolls, boosting standard RPM by up to 80%."
    }] : [{
      title: "Optimize Mid-Roll Heatmaps",
      desc: "Since this video is over 8 minutes, manually schedule mid-rolls at clear narrative cliffhangers (every 180s) rather than relying on robotic automated layouts."
    }]),
    ...(!hasAffiliate ? [{
      title: "Contextual Affiliate Links",
      desc: "No active commercial links were found in the description. Seed 2-3 links pointing to recommended resources or software matching the " + customNicheName + " sector to establish an auxiliary stream."
    }] : [{
      title: "Affiliate Link Above-The-Fold",
      desc: "You have affiliate links in the description! Elevate your top high-paying referral url to the first 3 lines of the text box (above the fold) to maximize click CTR."
    }]),
    ...(!hasSponsor ? [{
      title: "Compile a Media Kit",
      desc: "No sponsor references were detected. Given your " + detectedNiche + " audience profile, prepare a simple PDF listing your core metrics to pitch to brands in the niche."
    }] : [{
      title: "Optimized Sponsor Integration",
      desc: "Sponsor signal found. Consider adding a dedicated video chapter marker and an on-screen lower-third animation during the brand integration segment."
    }]),
    ...(allTags.length < 10 ? [{
      title: "Enrich Search Metadata",
      desc: "Only " + allTags.length + " tags identified. Inject high-search-intent phrases to assist the recommendation algorithm in indexing this video correctly."
    }] : [])
  ];

  const breakdown = {
    preRoll: { min: netAdSenseMin * 0.45, max: netAdSenseMax * 0.45 },
    midRoll: { min: netAdSenseMin * 0.40, max: netAdSenseMax * 0.40, eligible: durationMins >= 8 },
    display: { min: netAdSenseMin * 0.15, max: netAdSenseMax * 0.15 }
  };

  const videoAgeDays = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
  const projectedTotalViews_lifetime = data.viewCount * 1.70;
  
  // Projected lifetime earnings
  const projectedLifetimeEarningsMin = potentialEarningsMin * 1.8;
  const projectedLifetimeEarningsMax = potentialEarningsMax * 1.8;

  return {
    videoInfo: {
      ...data,
      country: countryKey,
      durationMins,
      isShort,
      detectedNiche,
      customNicheName,
      engagementRate,
      tagAnalysis,
      countryDistribution,
      detectedSources,
      optimizationActionPoints: fallbackActionPoints
    },
    calculations: {
      totalEarningsMin,
      totalEarningsMax,
      effectiveRpmMin: rpmMin,
      effectiveRpmMax: rpmMax,
      cpmMin,
      cpmMax,
      monetizedViews,
      monetizedViewRate: adImpressionRate,
      epvMin,
      epvMax,
      breakdown,
      projectedLifetimeEarningsMin,
      projectedLifetimeEarningsMax,
      
      // Breakdown of all 5 Streams
      adsenseMin: netAdSenseMin,
      adsenseMax: netAdSenseMax,
      sponsorMin: realizedSponsorMin,
      sponsorMax: realizedSponsorMax,
      affiliateMin: realizedAffiliateMin,
      affiliateMax: realizedAffiliateMax,
      premiumMin: premiumEarnMin,
      premiumMax: premiumEarnMax,
      membershipMin: realizedProductMin,
      membershipMax: realizedProductMax,

      sponsorPotential: realizedSponsorMin,
      affiliatePotential: realizedAffiliateMin,
      productPotential: realizedProductMin,
      
      potentialValues: {
        sponsor: clampedSponsorMin,
        affiliate: potentialAffiliateMin,
        premium: premiumEarnMin,
        membership: potentialMembershipMin
      },
      explanations: {
        adsense: adsenseExplanation,
        sponsor: sponsorExplanation,
        affiliate: affiliateExplanation,
        premium: premiumExplanation,
        membership: membershipExplanation
      },
      confidence,
      signals: {
        hasAffiliate,
        hasSponsor,
        hasProduct: hasMembershipSignal,
        subscribers
      }
    },
    multipliers: {
      country: countryMultiplier,
      engagement: likeMult,
      seasonal: seasonalMultiplier,
      durationAd: midrollMult
    }
  };
}
