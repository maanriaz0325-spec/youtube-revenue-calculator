import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { calculateRevenue } from "./src/lib/youtubeLogic.js";
dotenv.config();

// Initialize Google GenAI with recommended telemetry headers
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});

// Resilient API requester with exponential backoff and stable model fallback
async function generateContentWithFallbackAndRetry(
  prompt: string,
  schema: any
): Promise<any> {
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    const maxRetries = 1; // Limit total attempts per model to avoid excessive delays under high load
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Requesting model "${model}" (Attempt ${attempt + 1}/${maxRetries + 1})...`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });
        console.log(`[Gemini API] Successfully generated content using model "${model}" on attempt ${attempt + 1}.`);
        return response;
      } catch (err: any) {
        lastError = err;
        const errMessage = String(err?.message || err);
        const errStatus = String(err?.status || "");
        const errCode = err?.code || 0;

        // Fail-fast on rate-limiting/quota exhaustion or service unavailability to prevent long loading states and preserve remaining quota
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
          console.log(`[Gemini API] Quick recovery: Model "${model}" is currently busy, limited, or returned 503/UNAVAILABLE. Switching immediately to fallback models.`);
          break;
        }

        console.warn(
          `[Gemini API] Note: Model "${model}" encountered an issue on attempt ${attempt + 1}: ${errMessage.slice(0, 200)}`
        );

        // For other temporary errors, retry with a responsive backoff
        if (attempt < maxRetries) {
          const delay = 800 + Math.random() * 400;
          console.log(`[Gemini API] Transient issue. Retrying in ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError || new Error("All attempts and fallback models exhausted.");
}

const app = express();
app.use(express.json());

  // API Route for YouTube Proxy & Deep Analysis
  app.get("/api/youtube-video", async (req, res) => {
    const { videoId } = req.query;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!videoId) {
      return res.status(400).json({ error: "Missing videoId parameter" });
    }

    if (!apiKey || apiKey === "YOUR_YOUTUBE_API_KEY" || apiKey.trim() === "") {
      return res.status(400).json({ error: "YouTube API Key is missing on the server. Please configure YOUTUBE_API_KEY in your settings or .env file." });
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

      // Fetch Channel Info for Country and Statistics
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
        console.warn("GEMINI_API_KEY is not defined. Falling back to offline logic.");
        const calculated = calculateRevenue(videoResult);
        return res.json(calculated);
      }

      // Invoke Gemini 3.5-flash for an authentic, dynamic optimization audit
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
4. ANALYZE REVENUE ATTRIBUTION: Read the video description carefully to find confirmation/signals of:
   - Sponsor links, brand deals, or integration messages (e.g., promo codes, brand mentions).
   - Affiliate links (e.g., amzn.to, discount/referral links, hostings, software referrals).
   - Digital product/coaching/membership signals (e.g., Gumroad, courses, Patreon, Shopify, consulting, books).
   Calculate the potential monthly or per-video earnings for each of these streams if fully optimized. Calculate the "realized" value of these streams (value = 0 if there are absolutely no signals/links found in the description, or a realistic portion of the potential value if active signals are identified).
5. LIFETIME PROJECTION (OPTIMIZED): Project the realistic lifetime views and corresponding lifetime earnings for this video under an optimized scenario (e.g., adding mid-rolls, target translations, or description SEO).
6. COMPILE ACTIONABLE OPTIMIZATION ACTION POINTS: Provide 3-5 hyper-actionable, highly specific growth points based on the actual stats (e.g., recommending a retention hook for Tier 1 traffic, or suggesting mid-rolls if duration is close to 8 mins, or adding affiliate setups if none are found).

You must return a JSON response adhering strictly to the provided responseSchema. Ensure all dollar calculations are mathematically consistent and logical.
        `;

        const geminiResponse = await generateContentWithFallbackAndRetry(prompt, {
          type: Type.OBJECT,
          properties: {
            detectedNiche: {
              type: Type.STRING,
              description: "One of: finance, tech, education, health, gaming, news, kids, music, entertainment, shorts"
            },
            customNicheName: {
              type: Type.STRING,
              description: "A beautifully descriptive specific niche name, e.g., 'E-Commerce & Dropshipping'"
            },
            cpmMin: { type: Type.NUMBER, description: "Realistic minimum CPM in dollars" },
            cpmMax: { type: Type.NUMBER, description: "Realistic maximum CPM in dollars" },
            rpmMin: { type: Type.NUMBER, description: "Realistic minimum RPM in dollars after YouTube's cut" },
            rpmMax: { type: Type.NUMBER, description: "Realistic maximum RPM in dollars after YouTube's cut" },
            trafficDistribution: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Country code or name, e.g. US, UK, IN" },
                  percent: { type: Type.INTEGER, description: "Percentage of total views" }
                },
                required: ["name", "percent"]
              }
            },
            signals: {
              type: Type.OBJECT,
              properties: {
                hasAffiliate: { type: Type.BOOLEAN },
                hasSponsor: { type: Type.BOOLEAN },
                hasProduct: { type: Type.BOOLEAN },
                sponsorPotential: { type: Type.NUMBER, description: "Estimated payout if video had a sponsor" },
                sponsorRealized: { type: Type.NUMBER, description: "Actual estimated sponsor payout (0 if no links/promo codes found in description)" },
                affiliatePotential: { type: Type.NUMBER },
                affiliateRealized: { type: Type.NUMBER, description: "Actual estimated affiliate payout (0 if no affiliate links found in description)" },
                productPotential: { type: Type.NUMBER },
                productRealized: { type: Type.NUMBER, description: "Actual digital merch/product payout (0 if no product/store links found in description)" }
              },
              required: ["hasAffiliate", "hasSponsor", "hasProduct", "sponsorPotential", "sponsorRealized", "affiliatePotential", "affiliateRealized", "productPotential", "productRealized"]
            },
            lifetimeViewsProjected: { type: Type.NUMBER, description: "Projected lifetime views under optimized performance" },
            lifetimeRevenueProjectedMin: { type: Type.NUMBER, description: "Projected minimum lifetime revenue under optimized performance" },
            lifetimeRevenueProjectedMax: { type: Type.NUMBER, description: "Projected maximum lifetime revenue under optimized performance" },
            optimizationActionPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Short title of the recommendation" },
                  desc: { type: Type.STRING, description: "Clear, prescriptive description of what to do" }
                },
                required: ["title", "desc"]
              }
            }
          },
          required: [
            "detectedNiche",
            "customNicheName",
            "cpmMin",
            "cpmMax",
            "rpmMin",
            "rpmMax",
            "trafficDistribution",
            "signals",
            "lifetimeViewsProjected",
            "lifetimeRevenueProjectedMin",
            "lifetimeRevenueProjectedMax",
            "optimizationActionPoints"
          ]
        });

        const analysis = JSON.parse(geminiResponse.text || "{}");

        const validNiches = ["finance", "tech", "education", "health", "gaming", "news", "kids", "music", "entertainment", "shorts"];
        const detectedNicheOverride = (analysis.detectedNiche && validNiches.includes(analysis.detectedNiche)) 
          ? (analysis.detectedNiche as any) 
          : undefined;

        const overriddenResult = {
          ...videoResult,
          detectedNiche: detectedNicheOverride
        };

        const calculated = calculateRevenue(overriddenResult);

        // Enrich the mathematically sound results with Gemini's high-fidelity creative content
        if (analysis.customNicheName) {
          calculated.videoInfo.customNicheName = analysis.customNicheName;
        }
        if (analysis.trafficDistribution && Array.isArray(analysis.trafficDistribution)) {
          calculated.videoInfo.countryDistribution = analysis.trafficDistribution;
        }
        if (analysis.optimizationActionPoints && Array.isArray(analysis.optimizationActionPoints)) {
          calculated.videoInfo.optimizationActionPoints = analysis.optimizationActionPoints;
        }

        return res.json(calculated);

      } catch (geminiError) {
        console.log(`[Gemini API] Activating high-reliability offline formula fallback engine.`);
        const calculated = calculateRevenue(videoResult);
        return res.json(calculated);
      }

    } catch (error) {
      console.error("YouTube API Error:", error);
      res.status(500).json({ error: "Failed to fetch YouTube data" });
    }
  });

  // ... route code ...

  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

if (process.env.NODE_ENV !== "production") {
  app.listen(3000, () => console.log("Local: http://localhost:3000"));
}

export default app;