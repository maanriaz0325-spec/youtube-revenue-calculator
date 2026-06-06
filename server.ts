import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

async function startServer() {
  const PORT = 3000;

  // API Route for YouTube Proxy
  app.get("/api/youtube-video", async (req, res) => {
    const { videoId } = req.query;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!videoId || !apiKey) {
      return res.status(400).json({ error: "Missing videoId or API Key" });
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

      const result = {
        videoId: videoId as string,
        title: item.snippet.title,
        description: item.snippet.description,
        tags: item.snippet.tags || [],
        categoryId: item.snippet.categoryId,
        channelTitle: item.snippet.channelTitle,
        channelId: channelId,
        country: country,
        publishedAt: item.snippet.publishedAt,
        viewCount: parseInt(item.statistics.viewCount),
        likeCount: parseInt(item.statistics.likeCount),
        commentCount: parseInt(item.statistics.commentCount),
        durationISO: item.contentDetails.duration,
        subscriberCount: subscriberCount,
      };

      res.json(result);
    } catch (error) {
      console.error("YouTube API Error:", error);
      res.status(500).json({ error: "Failed to fetch YouTube data" });
    }
  });

  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

startServer();

app.listen(3000, () => console.log("Local: http://localhost:3000"));
export default app;
