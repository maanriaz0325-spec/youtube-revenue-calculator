/**
 * YouTube Revenue Logic Engine
 * Based on the detailed architecture provided by the user.
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
}

export type NicheType = "finance" | "tech" | "education" | "health" | "gaming" | "news" | "kids" | "music" | "entertainment" | "shorts";

const NICHE_KEYWORDS: Record<NicheType, string[]> = {
  finance: ["crypto", "stock", "invest", "money", "loan", "bank", "credit", "insurance", "trading", "passive income", "rich"],
  tech: ["review", "unboxing", "laptop", "iphone", "android", "software", "ai", "coding", "tutorial", "gadget", "specs", "benchmark"],
  education: ["how to", "tutorial", "learn", "course", "explained", "science", "history", "university", "school", "exam"],
  health: ["workout", "diet", "fitness", "yoga", "nutrition", "mental health", "doctor", "symptoms", "remedy"],
  gaming: ["gameplay", "walkthrough", "ps5", "xbox", "nintendo", "pc gaming", "stream", "let's play", "fortnite", "minecraft", "roblox"],
  news: ["politics", "breaking", "world", "local", "election", "current events", "report", "crisis"],
  kids: ["toy", "animation", "cartoons", "nursery rhymes", "play", "storytime", "for kids"],
  music: ["official video", "lyric video", "remix", "cover", "album", "single", "concert", "live performance"],
  entertainment: ["vlog", "comedy", "prank", "reaction", "movie", "celebrity", "drama", "challenge"],
  shorts: ["#shorts", "short"]
};

export const NICHE_RPM: Record<NicheType, { min: number; max: number; cpmMin: number; cpmMax: number }> = {
  finance: { min: 4.40, max: 13.75, cpmMin: 8, cpmMax: 25 },
  tech: { min: 2.20, max: 6.60, cpmMin: 4, cpmMax: 12 },
  education: { min: 1.65, max: 5.50, cpmMin: 3, cpmMax: 10 },
  health: { min: 1.65, max: 4.95, cpmMin: 3, cpmMax: 9 },
  gaming: { min: 0.55, max: 2.75, cpmMin: 1, cpmMax: 5 },
  news: { min: 1.10, max: 3.85, cpmMin: 2, cpmMax: 7 },
  kids: { min: 1.10, max: 3.30, cpmMin: 2, cpmMax: 6 },
  music: { min: 0.28, max: 1.65, cpmMin: 0.5, cpmMax: 3 },
  entertainment: { min: 0.28, max: 1.65, cpmMin: 0.5, cpmMax: 3 },
  shorts: { min: 0.03, max: 0.07, cpmMin: 0.05, cpmMax: 0.12 }
};

export const COUNTRY_MULTIPLIER: Record<string, number> = {
  US: 1.00, UK: 0.90, CA: 0.85, AU: 0.82,
  DE: 0.80, NO: 0.85, SE: 0.80, NL: 0.78,
  FR: 0.65, JP: 0.70, KR: 0.68, SG: 0.72,
  BR: 0.25, MX: 0.22, IN: 0.18, PK: 0.12,
  NG: 0.10, BD: 0.10, ID: 0.20, PH: 0.18,
  Unknown: 0.55
};

export const SEASONAL_MULTIPLIER: Record<number, number> = {
  1: 0.65, 2: 0.70, 3: 0.80, 4: 0.85, 5: 0.88, 6: 0.85,
  7: 0.82, 8: 0.85, 9: 0.90, 10: 1.00, 11: 1.20, 12: 1.35
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
  const analysisText = `${data.title} ${data.description} ${data.tags.join(" ")}`.toLowerCase();
  
  if (data.durationISO && parseISO8601Duration(data.durationISO) <= 62) return "shorts";

  let bestMatch: NicheType = "entertainment";
  let maxCount = 0;

  for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
    if (niche === "shorts") continue;
    let count = 0;
    keywords.forEach(kw => {
      if (analysisText.includes(kw)) count++;
    });
    if (count > maxCount) {
      maxCount = count;
      bestMatch = niche as NicheType;
    }
  }
  return bestMatch;
}

export function calculateRevenue(data: YouTubeVideoData) {
  // STEP 1 - Duration Parse
  const durationSeconds = parseISO8601Duration(data.durationISO);
  const durationMins = durationSeconds / 60;
  const isShort = durationSeconds <= 62;

  let adFormats: string[] = [];
  let baseAdSlots = 0;

  if (isShort) {
    adFormats = ["Shorts Feed Ads"];
    baseAdSlots = 0.3;
  } else if (durationMins < 8) {
    adFormats = ["Pre-roll", "Display Ad", "Overlay"];
    baseAdSlots = 1.0;
  } else if (durationMins < 15) {
    adFormats = ["Pre-roll", "1–2 Mid-rolls", "Display Ad", "Overlay"];
    baseAdSlots = 1.8;
  } else if (durationMins < 20) {
    adFormats = ["Pre-roll", "2–3 Mid-rolls", "Display Ad", "Overlay"];
    baseAdSlots = 2.5;
  } else {
    adFormats = ["Pre-roll", "3+ Mid-rolls", "Display Ad", "Overlay", "End Card"];
    baseAdSlots = 3.2;
  }

  // STEP 2 - Niche
  const detectedNiche = detectNiche(data);
  const nicheRpm = NICHE_RPM[detectedNiche];

  // STEP 3 - Country
  const countryMultiplier = COUNTRY_MULTIPLIER[data.country] || 0.55;

  // STEP 4 - Engagement
  const engagementRate = ((data.likeCount + data.commentCount) / data.viewCount) * 100;
  let engagementMultiplier = 1.0;
  if (engagementRate >= 6) engagementMultiplier = 1.25;
  else if (engagementRate >= 3) engagementMultiplier = 1.10;
  else if (engagementRate >= 1) engagementMultiplier = 1.00;
  else if (engagementRate >= 0.5) engagementMultiplier = 0.90;
  else engagementMultiplier = 0.75;

  // STEP 5 - Monetized View Rate
  const BASE_MONETIZED_RATE = 0.55;
  let nicheAdBlockPenalty = 1.00;
  if (detectedNiche === "tech" || detectedNiche === "gaming") nicheAdBlockPenalty = 0.85;
  else if (detectedNiche === "finance") nicheAdBlockPenalty = 0.95;

  let countryMonetizedRate = 0.55;
  if (data.country === "IN" || data.country === "PK") countryMonetizedRate = 0.40;
  else if (data.country === "US" || data.country === "UK") countryMonetizedRate = 0.70;

  const monetizedViewRate = BASE_MONETIZED_RATE * nicheAdBlockPenalty * countryMonetizedRate;
  const monetizedViews = Math.round(data.viewCount * monetizedViewRate);

  // STEP 6 - Ad Slot Multiplier
  const durationAdMultiplier = baseAdSlots;
  let adjustedRpmMin = nicheRpm.min * countryMultiplier * engagementMultiplier;
  let adjustedRpmMax = nicheRpm.max * countryMultiplier * engagementMultiplier;

  let effectiveRpmMin = adjustedRpmMin * (durationAdMultiplier / 1.0);
  let effectiveRpmMax = adjustedRpmMax * (durationAdMultiplier / 1.0);

  // Cap at reasonable maximums
  effectiveRpmMin = Math.min(effectiveRpmMin, nicheRpm.max * 2);
  effectiveRpmMax = Math.min(effectiveRpmMax, nicheRpm.max * 3);

  // STEP 7 - Seasonality
  const uploadMonth = new Date(data.publishedAt).getMonth() + 1;
  const seasonalMultiplier = SEASONAL_MULTIPLIER[uploadMonth] || 1.0;
  effectiveRpmMin *= seasonalMultiplier;
  effectiveRpmMax *= seasonalMultiplier;

  // STEP 8 - Total Earnings
  let totalEarningsMin = (monetizedViews / 1000) * effectiveRpmMin;
  let totalEarningsMax = (monetizedViews / 1000) * effectiveRpmMax;
  totalEarningsMin = Math.round(totalEarningsMin * 100) / 100;
  totalEarningsMax = Math.round(totalEarningsMax * 100) / 100;

  // STEP 9 - Ad Format Breakdown
  const preRollShare = 0.45;
  const midRollShare = durationMins >= 8 ? 0.40 : 0;
  const displayShare = 0.10;
  const breakdown = {
    preRoll: { min: totalEarningsMin * preRollShare, max: totalEarningsMax * preRollShare },
    midRoll: { min: totalEarningsMin * midRollShare, max: totalEarningsMax * midRollShare, eligible: durationMins >= 8 },
    display: { min: totalEarningsMin * displayShare, max: totalEarningsMax * displayShare }
  };

  // STEP 10 - Projections
  const videoAgeDays = (Date.now() - new Date(data.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  const projectedTotalViews_lifetime = data.viewCount * 1.70;
  const projectedLifetimeEarningsMin = (projectedTotalViews_lifetime * monetizedViewRate / 1000) * effectiveRpmMin;
  const projectedLifetimeEarningsMax = (projectedTotalViews_lifetime * monetizedViewRate / 1000) * effectiveRpmMax;

  // STEP 10.1 - Tag Analysis
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

  // STEP 10.2 - Country Distribution Projection
  const getDist = (c: string) => {
    const maps: Record<string, any[]> = {
      'US': [{ name: 'US', percent: 45 }, { name: 'UK', percent: 12 }, { name: 'CA', percent: 8 }],
      'IN': [{ name: 'IN', percent: 65 }, { name: 'US', percent: 8 }, { name: 'AE', percent: 4 }],
      'UK': [{ name: 'UK', percent: 42 }, { name: 'US', percent: 18 }, { name: 'DE', percent: 6 }],
      'PK': [{ name: 'PK', percent: 72 }, { name: 'IN', percent: 8 }, { name: 'SA', percent: 5 }],
    };
    return maps[c] || [{ name: c, percent: 55 }, { name: 'US', percent: 15 }, { name: 'Global', percent: 30 }];
  };
  const countryDistribution = getDist(data.country);

  // EPV
  const epvMin = totalEarningsMin / data.viewCount;
  const epvMax = totalEarningsMax / data.viewCount;

  // STEP 11 - Reality-Based Revenue Attribution Logic
  const description = data.description.toLowerCase();
  const title = data.title.toLowerCase();
  
  // High-Confidence Detection (Signals that the video is ACTIVELY earning from this path)
  const affiliateKeywords = [
    'amzn.to', 'amazon.com/shop', 'bit.ly', 'affiliate', 'referral', 'discount code', 
    'coupon', 'buy here', 'shop my', 'link in bio', 'my gear', 'associates', 'earn a commission',
    'rakuten', 'impact.com', 'shareasale', 'bluehost', 'nordvpn'
  ];
  const sponsorKeywords = [
    'sponsored by', 'partnership with', '#ad', 'paid promotion', 'brought to you by', 
    'thanks to our sponsor', 'sponsored segment', 'check out [brand]', 'promo code',
    'integrated sponsor', 'brand deal', 'collaboration with', 'exclusive offer'
  ];
  const productKeywords = [
    'my course', 'on my store', 'buy my merch', 'patreon.com', 'gumroad', 'newsletter', 
    'book is out', 'join my membership', 'exclusive content', 'teespring', 'shopify',
    'masterclass', 'consulting', 'coaching', 'download my'
  ];

  const hasAffiliate = affiliateKeywords.some(kw => description.includes(kw));
  const hasSponsor = sponsorKeywords.some(kw => description.includes(kw) || title.includes(kw));
  const hasProduct = productKeywords.some(kw => description.includes(kw));

  // Logic Refinement: Confidence Scoring
  const affiliateStrength = affiliateKeywords.filter(kw => description.includes(kw)).length;
  const sponsorStrength = sponsorKeywords.filter(kw => description.includes(kw) || title.includes(kw)).length;
  
  // NEW CALCULATION 13 — OTHER REVENUE STREAMS
  
  // 1. Sponsorships (Sponsorship Value per Video)
  const SPONSORSHIP_NICHE_MULTIPLIER: Record<string, number> = {
    finance: 2.8, tech: 2.2, education: 1.5, health: 1.8, gaming: 1.3, 
    news: 0.9, kids: 0.5, music: 0.4, entertainment: 1.2, shorts: 0.3
  };
  const nicheSponsorMultiplier = SPONSORSHIP_NICHE_MULTIPLIER[detectedNiche] || 1.0;
  
  // High-end sponsorship estimation for high-quality channels
  const sponsorshipBase = (data.viewCount / 1000) * 28; 
  
  const subscribers = data.subscriberCount || 0;
  let subSponsorMultiplier = 0.45; // Baseline
  if (subscribers >= 1000000) subSponsorMultiplier = 1.8;
  else if (subscribers >= 100000) subSponsorMultiplier = 1.35;
  else if (subscribers >= 10000) subSponsorMultiplier = 1.0;
  else if (subscribers < 3000) subSponsorMultiplier = 0.15; // Very hard to get paid sponsors under 3k subs

  // Authenticity Tuning: Full Integration vs shoutout
  const integrationTypeMultiplier = sponsorStrength >= 2 ? 1.2 : 0.8; 

  // Pure Potential (What it COULD earn)
  const potentialSponsorVal = Math.round(sponsorshipBase * nicheSponsorMultiplier * subSponsorMultiplier * engagementMultiplier * integrationTypeMultiplier);

  // 2. Affiliate Revenue
  const AFFILIATE_AOV: Record<string, number> = {
    finance: 200, tech: 90, health: 50, education: 70, gaming: 40, entertainment: 60, news: 45, music: 35, kids: 35, shorts: 20
  };
  const currentAOV = AFFILIATE_AOV[detectedNiche] || 50;
  const affiliateCommissionRate = detectedNiche === "finance" ? 0.20 : detectedNiche === "tech" ? 0.10 : 0.07;
  
  // Typical: Click Rate scale with subscriber loyalty
  const baseCTR = subscribers > 100000 ? 0.008 : 0.005;
  const estClicks = data.viewCount * baseCTR * (affiliateStrength > 2 ? 1.3 : 1.0);
  const estConversions = estClicks * 0.025; // 2.5% conversion on clicks
  const potentialAffiliateVal = Math.round(estConversions * currentAOV * affiliateCommissionRate * engagementMultiplier);

  // 3. Digital Ecosystem (Memberships/Merch)
  const memberConvRate = 0.003; // Realistically 0.3% of active viewers
  const estMembers = subscribers * memberConvRate;
  const potentialMemberVal = Math.round((estMembers * 3.99 * 0.70) / 30); // Monthly share
  const potentialProductVal = Math.round(data.viewCount * 0.012 * subSponsorMultiplier); // Scaled byproduct sales

  // --- FINAL AUTHENTICITY GATE ---
  const realizedSponsor = hasSponsor ? potentialSponsorVal : 0;
  const realizedAffiliate = hasAffiliate ? potentialAffiliateVal : 0;
  
  // Product Gate: Store, Membership, or Keyword
  const hasMembershipSignal = subscribers > 30000 || hasProduct;
  const realizedProduct = hasMembershipSignal ? (potentialProductVal + potentialMemberVal) : 0;

  return {
    videoInfo: {
      ...data,
      durationMins,
      isShort,
      detectedNiche,
      engagementRate,
      tagAnalysis,
      countryDistribution
    },
    calculations: {
      totalEarningsMin,
      totalEarningsMax,
      effectiveRpmMin,
      effectiveRpmMax,
      monetizedViews,
      monetizedViewRate,
      epvMin,
      epvMax,
      breakdown,
      projectedLifetimeEarningsMin,
      projectedLifetimeEarningsMax,
      sponsorPotential: realizedSponsor,
      affiliatePotential: realizedAffiliate,
      productPotential: realizedProduct,
      potentialValues: {
        sponsor: potentialSponsorVal,
        affiliate: potentialAffiliateVal,
        product: potentialProductVal + potentialMemberVal
      },
      signals: {
        hasAffiliate,
        hasSponsor,
        hasProduct,
        subscribers
      }
    },
    multipliers: {
      country: countryMultiplier,
      engagement: engagementMultiplier,
      seasonal: seasonalMultiplier,
      durationAd: durationAdMultiplier
    }
  };
}
