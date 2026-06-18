import { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Type } from "@google/genai";
import { calculateRevenue } from "../src/lib/youtubeLogic.js";
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function generateContentWithFallbackAndRetry(
  prompt: string,
  schema: any
): Promise<any> {
  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    const maxRetries = 1;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Requesting model "${model}" (Attempt ${attempt + 1})...`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });
        console.log(`[Gemini API] Success with model "${model}".`);
        return response;
      } catch (err: any) {
        lastError = err;
        const errMessage = String(err?.message || err);
        const errStatus = String(err?.status || "");
        const errCode = err?.code || 0;

        const isQuotaOrUnavailable =
          errCode === 429 ||
          errCode === 503 ||
          errStatus.includes("RESOURCE_EXHAUSTED") ||
          errStatus.includes("UNAVAILABLE") ||
          errMessage.includes("429") ||
          errMessage.includes("503") ||
          errMessage.includes("quota") ||
          errMessage.includes("RESOURCE_EXHAUSTED") ||
          errMessage.includes("UNAVAILABLE") ||
          errMessage.includes("Rate limit") ||
          errMessage.includes("high demand") ||
          errMessage.includes("temporarily");

        if (isQuotaOrUnavailable) {
          console.log(`[Gemini API] Model "${model}" busy. Switching to next...`);
          break;
        }

        if (attempt < maxRetries) {
          const delay = 800 + Math.random() * 400;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError || new Error("All models exhausted.");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { videoId } = req.query;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId parameter" });
  }

  if (!apiKey || apiKey === "YOUR_YOUTUBE_API_KEY" || apiKey.trim() === "") {
    return res.status(400).json({
      error: "YouTube API Key is missing. Please configure YOUTUBE_API_KEY in Vercel environment variables.",
    });
  }

  try {
    // Fetch Video Stats
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`
    );
    const videoData = await videoResponse.json();

    if (!videoData.items || videoData.items.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    const item = videoData.items[0];
    const channelId = item.snippet.channelId;

    // Fetch Channel Info
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
    );
    const channelData = await channelResponse.json();
    const channelItem = channelData.items?.[0];
    const country = channelItem?.snippet?.country || "Unknown";
    const subscriberCount = parseInt(channelItem?.statistics?.subscriberCount || "0");

    const viewCount = parseInt(item.statistics.viewCount || "0");
    const likeCount = parseInt(item.statistics.likeCount || "0");
    const commentCount = parseInt(item.statistics.commentCount || "0");
    const publishedAt = item.snippet.publishedAt;
    const title = item.snippet.title;
    const description = item.snippet.description || "";
    const tags = item.snippet.tags || [];
    const durationISO = item.contentDetails.duration;
    const channelTitle = item.snippet.channelTitle;

    const videoResult = {
      videoId: videoId as string,
      title,
      description,
      tags,
      categoryId: item.snippet.categoryId,
      channelTitle,
      channelId,
      country,
      publishedAt,
      viewCount,
      likeCount,
      commentCount,
      durationISO,
      subscriberCount,
    };

    const hasGeminiKey = !!process.env.GEMINI_API_KEY;

    if (!hasGeminiKey) {
      console.warn("GEMINI_API_KEY not defined. Using offline logic.");
      const calculated = calculateRevenue(videoResult);
      return res.json(calculated);
    }

    try {
      const prompt = `
You are an expert YouTube financial auditor and revenue optimization analyst.
Perform an extremely deep, audit-grade, logic-backed analysis of the following YouTube video using its real-time API metadata.

VIDEO METADATA AND STATISTICS:
- Video ID: ${videoId}
- Title: "${title}"
- Channel Name: "${channelTitle}"
- Channel Country: "${country}"
- Subscribers: ${subscriberCount}
- Publish Date: ${publishedAt}
- View Count: ${viewCount}
- Likes: ${likeCount}
- Comments: ${commentCount}
- Duration (ISO-8601): ${durationISO}
- Description preview:
"""
${description.slice(0, 1500)}
"""
- Tags: ${JSON.stringify(tags)}

YOUR DETAILED AUDIT INSTRUCTIONS:
1. DETECT THE NICHE TYPE: Assign one of these standard niche keys absolutely: "finance", "tech", "education", "health", "gaming", "news", "kids", "music", "entertainment", "shorts". Provide a beautiful, highly specific "customNicheName". Choose "shorts" ONLY if duration is <= 62s.
2. CPM & RPM RANGES: Assess a highly realistic CPM range and RPM range, based on:
   - The detected niche and quality theme of the video.
   - CRITICAL: The true geographical distribution of the audience, NOT just the default channel country. Look deeply at title/description text for language indicators (Hindi, Urdu, Spanish, Portuguese, German, etc.) and regional characters (e.g. Urdu/Arabic script or Devanagari script), local payments (e.g. EasyPaisa, JazzCash, Paytm, Pix, BHIM, UPI), and local currencies (PKR, INR, BRL, EUR, GBP, USD).
   - If the video contains Pakistani tokens, Roman Urdu language, or Urdu script, assign Pakistani-tier CPMs ($0.50 - $2.20).
   - If the video contains Indian references, Devanagari, UPI, Paytm, or Hindi language, assign Indian-tier CPMs ($1.50 - $4.50).
   - If the video is purely English with global tech/finance appeal, assign Tier-1 standard weights ($12.00 - $45.00).
   - Handle video duration carefully: if >= 8 minutes, mid-rolls are unlocked; if < 8m, only pre/post rolls; if Short (<=62s), CPM is tiny ($0.05-$0.25).
3. CONSTRUCT COUNTRY DISTRIBUTION: Predict the realistic distribution of viewer countries based on video language, content focus, scripts, and description references. DO NOT assume 100% US default.
   - Scan for Urdu words (e.g., "tarika", "kaise", "online earning in pakistan", "pakistani") or Urdu script -> Assign Pakistan (60%+), India (15%+), UAE/Saudi (10%+), US/Canada Diaspora (5%+).
   - Scan for Hindi keywords or Devanagari script -> Assign India (70%+), Pakistan (8%+), Middle East (5%+), USA/UK (5%+).
   - Scan for Portuguese -> Brazil (80%+).
   - Return 3-5 country names (written beautifully, e.g. "Pakistan (PK)") with their precise integer percentage contributions, summing exactly to 100%.
4. ANALYZE REVENUE ATTRIBUTION: Read the video description carefully to find confirmation/signals of sponsor links, affiliate links, digital products. Calculate potential and realized values.
5. LIFETIME PROJECTION (OPTIMIZED): Project realistic lifetime views and earnings under optimized scenario.
6. COMPILE ACTIONABLE OPTIMIZATION ACTION POINTS: Provide 3-5 hyper-actionable growth points based on actual stats.

Return JSON only, strictly matching the responseSchema.
      `;

      const geminiResponse = await generateContentWithFallbackAndRetry(prompt, {
        type: Type.OBJECT,
        properties: {
          detectedNiche: { type: Type.STRING },
          customNicheName: { type: Type.STRING },
          cpmMin: { type: Type.NUMBER },
          cpmMax: { type: Type.NUMBER },
          rpmMin: { type: Type.NUMBER },
          rpmMax: { type: Type.NUMBER },
          trafficDistribution: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                percent: { type: Type.INTEGER },
              },
              required: ["name", "percent"],
            },
          },
          signals: {
            type: Type.OBJECT,
            properties: {
              hasAffiliate: { type: Type.BOOLEAN },
              hasSponsor: { type: Type.BOOLEAN },
              hasProduct: { type: Type.BOOLEAN },
              sponsorPotential: { type: Type.NUMBER },
              sponsorRealized: { type: Type.NUMBER },
              affiliatePotential: { type: Type.NUMBER },
              affiliateRealized: { type: Type.NUMBER },
              productPotential: { type: Type.NUMBER },
              productRealized: { type: Type.NUMBER },
            },
            required: ["hasAffiliate", "hasSponsor", "hasProduct", "sponsorPotential", "sponsorRealized", "affiliatePotential", "affiliateRealized", "productPotential", "productRealized"],
          },
          lifetimeViewsProjected: { type: Type.NUMBER },
          lifetimeRevenueProjectedMin: { type: Type.NUMBER },
          lifetimeRevenueProjectedMax: { type: Type.NUMBER },
          optimizationActionPoints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                desc: { type: Type.STRING },
              },
              required: ["title", "desc"],
            },
          },
        },
        required: [
          "detectedNiche", "customNicheName", "cpmMin", "cpmMax",
          "rpmMin", "rpmMax", "trafficDistribution", "signals",
          "lifetimeViewsProjected", "lifetimeRevenueProjectedMin",
          "lifetimeRevenueProjectedMax", "optimizationActionPoints",
        ],
      });

      const analysis = JSON.parse(geminiResponse.text || "{}");

      const validNiches = ["finance", "tech", "education", "health", "gaming", "news", "kids", "music", "entertainment", "shorts"];
      const detectedNicheOverride = analysis.detectedNiche && validNiches.includes(analysis.detectedNiche)
        ? (analysis.detectedNiche as any)
        : undefined;

      const calculated = calculateRevenue({ ...videoResult, detectedNiche: detectedNicheOverride });

      if (analysis.customNicheName) calculated.videoInfo.customNicheName = analysis.customNicheName;
      if (analysis.trafficDistribution) calculated.videoInfo.countryDistribution = analysis.trafficDistribution;
      if (analysis.optimizationActionPoints) calculated.videoInfo.optimizationActionPoints = analysis.optimizationActionPoints;

      return res.json(calculated);

    } catch (geminiError) {
      console.log("[Gemini API] Falling back to offline formula.");
      const calculated = calculateRevenue(videoResult);
      return res.json(calculated);
    }

  } catch (error) {
    console.error("YouTube API Error:", error);
    return res.status(500).json({ error: "Failed to fetch YouTube data" });
  }
}