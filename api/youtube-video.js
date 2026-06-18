module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
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

    return res.json({
      videoId,
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
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch data" });
  }
};