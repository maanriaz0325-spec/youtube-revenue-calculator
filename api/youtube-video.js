module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { videoId } = req.query;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!videoId) return res.status(400).json({ error: "Missing videoId" });
  if (!apiKey) return res.status(400).json({ error: "YouTube API Key missing" });

  try {
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`
    );
    const videoData = await videoResponse.json();

    if (!videoData.items || videoData.items.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    const item = videoData.items[0];
    const channelId = item.snippet.channelId;

    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
    );
    const channelData = await channelResponse.json();
    const channelItem = channelData.items?.[0];

    const videoResult = {
      videoId: videoId,
      title: item.snippet.title,
      description: item.snippet.description || "",
      tags: item.snippet.tags || [],
      categoryId: item.snippet.categoryId,
      channelTitle: item.snippet.channelTitle,
      channelId,
      country: channelItem?.snippet?.country || "Unknown",
      publishedAt: item.snippet.publishedAt,
      viewCount: parseInt(item.statistics.viewCount || "0"),
      likeCount: parseInt(item.statistics.likeCount || "0"),
      commentCount: parseInt(item.statistics.commentCount || "0"),
      durationISO: item.contentDetails.duration,
      subscriberCount: parseInt(channelItem?.statistics?.subscriberCount || "0"),
    };

    // Gemini AI Analysis
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Analyze this YouTube video and return JSON only:
Title: "${videoResult.title}"
Country: "${videoResult.country}"
Views: ${videoResult.viewCount}
Duration: "${videoResult.durationISO}"
Description: "${videoResult.description.slice(0, 500)}"

Return ONLY this JSON:
{
  "detectedNiche": "one of: finance/tech/education/health/gaming/news/kids/music/entertainment/shorts",
  "customNicheName": "specific niche name",
  "cpmMin": 1.5,
  "cpmMax": 4.5,
  "trafficDistribution": [
    {"name": "Country Name", "percent": 60}
  ],
  "optimizationActionPoints": [
    {"title": "tip title", "desc": "tip description"}
  ]
}`
                }]
              }]
            })
          }
        );

        const geminiData = await geminiResponse.json();
        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        const analysis = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

        return res.json({
          ...videoResult,
          aiAnalysis: analysis
        });

      } catch (geminiError) {
        console.error("Gemini error:", geminiError);
        return res.json(videoResult);
      }
    }

    return res.json(videoResult);

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch data" });
  }
};