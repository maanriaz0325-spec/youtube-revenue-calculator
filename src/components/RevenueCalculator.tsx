import React, { useState, useMemo, useEffect } from "react";
import { 
  Search, 
  Youtube, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Globe, 
  Tag, 
  Heart, 
  MessageCircle, 
  BarChart3, 
  Calendar, 
  AlertCircle,
  ArrowRight,
  Info,
  Shield,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from "recharts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  calculateRevenue, 
  YouTubeVideoData, 
  NICHE_RPM,
  COUNTRY_MULTIPLIER,
  SEASONAL_MULTIPLIER
} from "../lib/youtubeLogic";


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function RevenueCalculator() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const extractVideoId = (inputUrl: string) => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = inputUrl.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleFetch = async () => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError("Invalid YouTube URL. Please provide a valid video link.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/youtube-video?videoId=${videoId}`);
      const videoResult = await response.json();
      
      if (videoResult.error) {
        throw new Error(videoResult.error);
      }

      const calculated = calculateRevenue(videoResult);
      setData(calculated);
    } catch (err: any) {
      setError(err.message || "Failed to fetch video data. check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const graphData = useMemo(() => {
    if (!data) return [];
    const baseline = data.calculations.totalEarningsMin;
    const optimized = baseline * 1.8; // Example optimization uplift
    
    return [
      { month: "Start", current: 0, optimized: 0 },
      { month: "Month 1", current: baseline * 0.4, optimized: optimized * 0.4 },
      { month: "Month 2", current: baseline * 0.7, optimized: optimized * 0.7 },
      { month: "Month 3", current: baseline * 0.85, optimized: optimized * 0.85 },
      { month: "Month 4", current: baseline * 0.95, optimized: optimized * 0.95 },
      { month: "Month 5", current: baseline, optimized: optimized },
      { month: "Month 6", current: baseline * 1.05, optimized: optimized * 1.05 },
    ];
  }, [data]);

  return (
    <div className="w-full max-w-[1024px] mx-auto p-6 flex flex-col gap-8 min-h-screen relative">
      <AnimatePresence mode="wait">
        {!data ? (
          <motion.div
            key="input-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center py-20"
          >
            <div className="text-center mb-10">
              <h1 className="font-serif font-black text-4xl md:text-5xl text-gray-900 leading-tight">
                Youtube Vedio Revenue Calculator
              </h1>
              <p className="text-xs text-gray-500 mt-4 uppercase tracking-[0.2em] font-black">
                Professional Financial Analysis & Growth Engine
              </p>
            </div>

            <div className="w-full max-w-2xl flex flex-col gap-4 relative">
              <div className="flex gap-2 p-2 bg-white rounded-xl shadow-xl border border-gray-100">
                <input
                  type="text"
                  placeholder="Paste YouTube Video URL here..."
                  className="flex-1 px-4 py-4 text-base bg-transparent outline-none font-medium"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                />
                <button
                  onClick={handleFetch}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-black text-sm uppercase transition-all disabled:opacity-50 shadow-lg shadow-red-200 cursor-pointer"
                >
                  {loading ? "Analyzing..." : "Calculate Revenue"}
                </button>
              </div>
              {error && (
                <div className="text-red-500 text-xs font-bold flex items-center justify-center gap-1 mt-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <div className="mt-8 flex flex-wrap justify-center gap-6 opacity-30 grayscale transition-all hover:grayscale-0 hover:opacity-100">
                <div className="flex items-center gap-1.5 font-serif font-bold text-[10px] uppercase tracking-widest">
                  <Zap className="w-3.5 h-3.5" /> Fast Detection
                </div>
                <div className="flex items-center gap-1.5 font-serif font-bold text-[10px] uppercase tracking-widest">
                  <Shield className="w-3.5 h-3.5" /> High Accuracy
                </div>
                <div className="flex items-center gap-1.5 font-serif font-bold text-[10px] uppercase tracking-widest">
                  <BarChart3 className="w-3.5 h-3.5" /> Path Analysis
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6"
          >
            {/* Results Header */}
            <header className="flex items-center justify-between border-b pb-6 border-gray-100 sticky top-0 bg-[#fafafa]/80 backdrop-blur-sm z-10 pt-2 flex-wrap gap-4">
              <div className="flex flex-col">
                <h1 className="font-serif font-black text-2xl text-gray-900 leading-none">
                  Youtube Vedio Revenue Calculator
                </h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px] text-gray-400 font-black uppercase tracking-widest">
                  <span>Analysis for ID: {data.videoInfo.videoId}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setData(null);
                  setUrl("");
                }}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-serif font-bold text-xs uppercase tracking-widest group"
              >
                <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-gray-100">
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </div>
                Back to Search
              </button>
            </header>

            {/* Stats Bar */}
            <Section1 data={data} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column (4/12) */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                <Section2 data={data} />
                <TargetedRevenue data={data} />
              </div>

              {/* Right Column (8/12) */}
              <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                <Section3 data={data} />
                <div className="bg-white border border-gray-100 rounded-xl p-8 flex flex-col shadow-sm">
                   <Section5 graphData={graphData} />
                   <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                      <Section4 data={data} />
                      <ActionItems data={data} />
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}

function Section1({ data }: { data: any }) {
  const { videoInfo } = data;
  const uploadMonth = new Date(videoInfo.publishedAt).getMonth() + 1;
  const qFactor = Math.ceil(uploadMonth / 3);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Views" value={videoInfo.viewCount.toLocaleString()} />
      <StatCard 
        label="Engagement Rate" 
        value={`${videoInfo.engagementRate.toFixed(2)}%`} 
        accent={videoInfo.engagementRate >= 3 ? "text-green-600" : "text-amber-600"}
      />
      <StatCard 
        label="Video Duration" 
        value={`${videoInfo.durationMins.toFixed(1)}m`} 
        sub={videoInfo.durationMins >= 8 ? `ELIGIBLE FOR ${videoInfo.durationMins >= 20 ? '3+' : videoInfo.durationMins >= 15 ? '2-3' : '1-2'} MID-ROLLS` : "UNDER 8 MINS"}
      />
      <StatCard 
        label="Publish Date" 
        value={new Date(videoInfo.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} 
        sub={`Q${qFactor} SEASON MULTIPLIER (x${SEASONAL_MULTIPLIER[uploadMonth]})`}
        subAccent="text-red-500 font-bold"
      />
    </div>
  );
}

function StatCard({ label, value, accent, sub, subAccent }: any) {
  return (
    <div className="bg-gray-50 p-5 rounded-lg flex flex-col justify-center border border-gray-100">
      <span className="text-[12px] uppercase tracking-widest text-gray-500 font-serif font-bold mb-1.5">{label}</span>
      <span className={cn("text-3xl font-sans font-black tracking-tight", accent)}>{value}</span>
      {sub && <div className={cn("text-[11px] font-desc font-medium mt-1.5 uppercase", subAccent || "text-gray-400")}>{sub}</div>}
    </div>
  );
}

function Section2({ data }: { data: any }) {
  const { calculations, videoInfo } = data;
  const nicheRpmRange = NICHE_RPM[videoInfo.detectedNiche as keyof typeof NICHE_RPM];

  return (
    <div className="corner-red-box p-8 flex flex-col justify-center min-h-[260px]">
      <span className="text-[14px] uppercase tracking-widest text-gray-500 font-serif font-bold block mb-4">Present Monthly Revenue</span>
      <div className="flex items-baseline gap-2">
        <span className="text-6xl font-sans font-black tracking-tighter">
          ${calculations.totalEarningsMin.toLocaleString()}
        </span>
        <span className="text-[16px] text-gray-400 font-serif font-bold uppercase">Estimated</span>
      </div>
      <div className="mt-8 pt-8 border-t border-gray-50 grid grid-cols-2 gap-y-8">
        <MiniStat label="Niche" value={videoInfo.detectedNiche} capitalize />
        <MiniStat label="Effective RPM" value={`$${calculations.effectiveRpmMin.toFixed(2)}`} valueColor="text-green-600" />
        <MiniStat label="Niche CPM" value={`$${nicheRpmRange.cpmMin.toFixed(0)}–$${nicheRpmRange.cpmMax.toFixed(0)}`} />
        <MiniStat label="Per View" value={`$${calculations.epvMin.toFixed(4)}`} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, valueColor, capitalize }: any) {
  return (
    <div className="flex flex-col">
      <span className="text-[12px] uppercase tracking-widest text-gray-400 font-serif font-bold">{label}</span>
      <span className={cn("text-[16px] font-sans font-black text-gray-800", valueColor, capitalize && "capitalize")}>{value}</span>
    </div>
  );
}

function TargetedRevenue({ data }: { data: any }) {
  const { calculations } = data;
  
  return (
    <div className="corner-red-box p-6 bg-white text-black border border-gray-100 flex flex-col gap-10 shadow-sm">
      <div className="flex justify-between items-start border-b border-gray-100 pb-5">
        <div className="flex flex-col text-left">
          <span className="text-[18px] uppercase tracking-[0.15em] text-gray-900 font-serif font-extrabold block">Revenue Attribution</span>
          <span className="text-[12px] text-gray-400 font-desc font-bold uppercase tracking-widest mt-1.5">Authentic Data-Driven Analysis</span>
        </div>
        <Zap className="w-5 h-5 text-red-500" />
      </div>
      
      <div className="space-y-10">
        {/* Direct Ad Revenue Path */}
        <div className="flex justify-between items-center group">
          <div className="flex flex-col text-left">
            <span className="text-gray-800 font-serif font-bold text-[16px] uppercase tracking-tighter">Direct Platform Ads</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]" />
              <span className="text-[12px] font-desc font-black uppercase text-gray-400 tracking-wider">Default Monetization Logic</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-sans font-black text-4xl leading-none text-gray-900 tracking-tight">
              ${calculations.totalEarningsMin.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Sponsorship */}
        <div className="flex justify-between items-center group">
          <div className="flex flex-col text-left">
            <span className="text-gray-800 font-serif font-bold text-[16px] uppercase tracking-tighter">Brand Sponsorships</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className={cn("w-2.5 h-2.5 rounded-full", calculations.signals.hasSponsor ? "bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.4)]" : "bg-gray-100")} />
              <span className="text-[12px] font-desc font-black uppercase text-gray-400 tracking-wider">
                {calculations.signals.hasSponsor ? "Integration Confirmed" : "No Authenticated Signals"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className={cn("font-sans font-black text-3xl leading-none", calculations.signals.hasSponsor ? "text-blue-600" : "text-gray-200")}>
              ${calculations.sponsorPotential.toLocaleString()}
            </span>
          </div>
        </div>
        
        {/* Affiliate */}
        <div className="flex justify-between items-center group">
          <div className="flex flex-col text-left">
            <span className="text-gray-800 font-serif font-bold text-[16px] uppercase tracking-tighter">Affiliate & Sales</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className={cn("w-2.5 h-2.5 rounded-full", calculations.signals.hasAffiliate ? "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.4)]" : "bg-gray-100")} />
              <span className="text-[12px] font-desc font-black uppercase text-gray-400 tracking-wider">
                {calculations.signals.hasAffiliate ? "Active Conversion Path" : "No Market Signal"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className={cn("font-sans font-black text-3xl leading-none", calculations.signals.hasAffiliate ? "text-green-600" : "text-gray-200")}>
              ${calculations.affiliatePotential.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-5 bg-gray-50 rounded border border-gray-100 border-dashed">
        <p className="text-[11px] text-gray-400 italic leading-snug font-medium">
          Logical Verification: Estimates are derived from verified monetization paths identified in video metadata and behavioral signals. Non-active paths return $0 to maintain logic-based authenticity.
        </p>
      </div>
    </div>
  );
}

function Section3({ data }: { data: any }) {
  const { videoInfo, calculations, multipliers } = data;
  const pubDate = new Date(videoInfo.publishedAt);
  const month = pubDate.getMonth();
  const nicheRpm = NICHE_RPM[videoInfo.detectedNiche as keyof typeof NICHE_RPM];

  // Logic for detailed stats
  const estWatchTimeMins = (videoInfo.durationMins * (videoInfo.engagementRate > 3 ? 0.45 : 0.35)).toFixed(2);
  const estWatchTimePercent = (videoInfo.engagementRate > 3 ? 45 : 35);
  
  const getTrafficQuality = (country: string) => {
    const tier1 = ['US', 'UK', 'CA', 'AU', 'DE', 'NO', 'SE'];
    if (tier1.includes(country)) return "High (Tier-1 Dominant)";
    if (['IN', 'BR', 'MX', 'PH'].includes(country)) return "Medium (Tier-2 Volume)";
    return "Variable (Emerging Market)";
  };

  const getPeakMonth = (m: number) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const q = Math.ceil((m + 1) / 3);
    if (q === 4) return "November (Annual Q4 Peak)";
    if (q === 1) return "March (Q1 Performance High)";
    if (q === 2) return "June (Mid-Year Budget Spike)";
    return "September (Q3 Re-allocation Peak)";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Niche Matrix */}
      <AnalysisMatrix 
        title="Niche Market Matrix"
        content={
          <div className="space-y-2 text-[13px] font-desc">
            <p><span className="font-bold text-gray-900">📊 Niche Type:</span> <span className="capitalize">{videoInfo.detectedNiche}</span></p>
            <p><span className="font-bold text-gray-900">💰 RPM Bracket:</span> <span className="font-sans font-semibold">${nicheRpm.min.toFixed(2)} - ${nicheRpm.max.toFixed(2)}</span></p>
          </div>
        }
        color="bg-blue-50/50"
      />

      {/* 2. Geography Matrix */}
      <AnalysisMatrix 
        title="Geography Distribution"
        content={
          <div className="space-y-2 text-[12px] font-desc">
            <p className="font-bold text-gray-900 mb-2">Top Measured Traffic Countries:</p>
            <div className="grid grid-cols-1 gap-2">
              {videoInfo.countryDistribution.map((c: any, i: number) => (
                <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-1.5 last:border-0">
                  <span className="font-bold">{c.name}</span>
                  <span className="font-sans font-bold text-green-600">{c.percent}%</span>
                </div>
              ))}
            </div>
            <p className="pt-1.5 text-[11px]"><span className="font-bold text-gray-900">📈 Quality:</span> {getTrafficQuality(videoInfo.country)}</p>
          </div>
        }
        color="bg-green-50/50"
      />

      {/* 3. Tag Relevance Matrix */}
      <AnalysisMatrix 
        title="Optimization Tag Matrix"
        content={
          <div className="space-y-2.5 text-[12px] font-desc">
            <div className="flex flex-col gap-2 border-b border-gray-100 pb-3">
              <span className="font-bold text-gray-900">Tag Distribution Analysis:</span>
              <div className="flex justify-between items-center bg-white/40 p-2 rounded">
                <span className="font-medium text-gray-600">Total Metadata Tags:</span>
                <span className="font-sans font-black text-gray-900">{videoInfo.tagAnalysis.total}</span>
              </div>
            </div>
            <div className="space-y-2 pt-1.5">
              <div className="flex justify-between items-center">
                <span className="text-blue-700 font-bold">Strong Relevance:</span>
                <span className="font-sans font-black text-blue-800 bg-blue-100 px-2 rounded">{videoInfo.tagAnalysis.strong}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-amber-700 font-bold">Raw/Untapped Tags:</span>
                <span className="font-sans font-black text-amber-800 bg-amber-100 px-2 rounded">{videoInfo.tagAnalysis.raw}</span>
              </div>
            </div>
          </div>
        }
        color="bg-amber-50/50"
      />

      {/* 4. Video Length Matrix */}
      <AnalysisMatrix 
        title="Ad Inventory Potential"
        content={
          <div className="space-y-2 text-[13px] font-desc">
            <p><span className="font-bold text-gray-900">🎬 Duration:</span> <span className="font-sans">{videoInfo.durationMins.toFixed(1)}m</span></p>
            <p><span className="font-bold text-gray-900">🔓 Ad Slots:</span> {videoInfo.durationMins >= 8 ? `High (Mid-Roll Enabled)` : "Standard (Single Pre-roll)"}</p>
          </div>
        }
        color="bg-purple-50/50"
      />

      {/* 5. Engagement Matrix */}
      <AnalysisMatrix 
        title="Audience Loyalty Score"
        content={
          <div className="space-y-2 text-[13px] font-desc">
            <p><span className="font-bold text-gray-900">⏱️ Retention:</span> <span className="font-sans">{estWatchTimePercent}%</span> Avg</p>
            <p><span className="font-bold text-gray-900">🎯 Sentiment:</span> {videoInfo.engagementRate >= 3 ? "Excellent" : "Standard"}</p>
          </div>
        }
        color="bg-orange-50/50"
      />

      {/* 6. Seasonality Matrix */}
      <AnalysisMatrix 
        title="Seasonal Market Trend"
        content={
          <div className="space-y-2 text-[13px] font-desc">
            <p><span className="font-bold text-gray-900">📅 Peak Month:</span> {getPeakMonth(month)}</p>
            <p><span className="font-bold text-gray-900">🚀 Budget:</span> {multipliers.seasonal > 1.1 ? "Surge Detected" : multipliers.seasonal < 0.8 ? "Rest Cycle" : "Stable"}</p>
          </div>
        }
        color="bg-red-50/50"
      />
    </div>
  );
}

function AnalysisMatrix({ title, content, color }: any) {
  return (
    <div className={cn("rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4", color)}>
      <div className="space-y-0.5">
        <h4 className="text-[12px] font-serif font-black uppercase text-gray-900 tracking-tight">{title}</h4>
      </div>
      <div className="bg-white/60 rounded-lg p-4 border border-white/50">
        <span className="text-[11px] font-desc font-black uppercase text-gray-400 block mb-2.5 tracking-tighter">Analysis Results:</span>
        {content}
      </div>
    </div>
  );
}

function Section5({ graphData }: { graphData: any[] }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-bold text-[10px] uppercase tracking-widest text-gray-900 italic">Growth Analysis & Projections</h3>
        <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-300"></span> CURRENT BASELINE
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600"></span> OPTIMIZED REVENUE
          </div>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis hide dataKey="month" />
            <YAxis hide />
            <Tooltip 
               contentStyle={{ fontSize: '10px', borderRadius: '4px', border: '1px solid #f3f4f6', fontWeight: 800 }}
               formatter={(v: any, name: string) => [
                 `$${v.toLocaleString()}`, 
                 name === 'current' ? 'CURRENT BASELINE' : 'OPTIMIZED REVENUE'
               ]}
            />
            <Area 
              type="monotone" 
              dataKey="optimized" 
              stroke="#ef4444" 
              strokeWidth={3}
              strokeDasharray="4 4"
              fillOpacity={1} 
              fill="url(#colorOptimized)" 
            />
            <Area 
              type="monotone" 
              dataKey="current" 
              stroke="#d1d5db" 
              strokeWidth={2}
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between mt-2 px-1">
        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">6 Months Ago</span>
        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Projected 12M</span>
      </div>
    </div>
  );
}

function Section4({ data }: { data: any }) {
  const optimizedVal = data.calculations.totalEarningsMin * 1.8;
  return (
    <div className="bg-red-50 p-4 rounded border-l-4 border-red-500 flex flex-col justify-center shadow-sm">
      <span className="text-[9px] uppercase tracking-widest text-red-700 font-serif font-bold mb-1">Lifetime Projection (Optimized)</span>
      <div className="text-3xl font-sans font-black text-red-700 tracking-tight">
        ${optimizedVal.toLocaleString()}
      </div>
      <p className="text-[10px] text-red-600 font-desc font-black uppercase mt-1.5 tracking-tighter">
        ⚡ +180% Increase Potential
      </p>
    </div>
  );
}

function ActionItems({ data }: { data: any }) {
  const { videoInfo } = data;
  const actions: any[] = [];
  const isHighTierGeo = ['US', 'UK', 'CA', 'AU', 'DE'].includes(videoInfo.country);

  if (videoInfo.durationMins < 8 && !videoInfo.isShort) {
    actions.push({ 
      title: "Add Mid-Rolls", 
      desc: `Video is ${videoInfo.durationMins.toFixed(1)}m. Extend past 8:00 to unlock multiple mid-roll slots and stay eligible for high-tier CPMs.` 
    });
  }
  
  if (videoInfo.engagementRate < 2.5) {
    actions.push({ 
      title: "Boost Interaction", 
      desc: "Current engagement is below average. Use pinned comments or polls to increase interaction and signal quality to the algorithm." 
    });
  }

  // Refined Logic for GEO/Language targeting
  if (!isHighTierGeo && (videoInfo.detectedNiche === 'finance' || videoInfo.detectedNiche === 'tech')) {
    actions.push({ 
      title: "Content Localization", 
      desc: "High-value niche detected. Adding English subtitles or metadata could bridge global audiences and increase RPM by 2x-3x." 
    });
  } else if (isHighTierGeo) {
    actions.push({ 
      title: "Retention Hook", 
      desc: "Tier-1 audience detected. Optimize first 30s to maximize ad inventory value and maintain high CPM premiums." 
    });
  }

  if (videoInfo.viewCount > 10000 && videoInfo.engagementRate > 3) {
    actions.push({
      title: "Direct Outreach",
      desc: `With ${videoInfo.viewCount.toLocaleString()} views and solid engagement, this video is eligible for direct brand collaboration in the ${videoInfo.detectedNiche} niche.`
    });
  }

  return (
    <div className="space-y-3 flex flex-col justify-center">
      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-serif font-bold block mb-1">Optimization Action Points</span>
      <ul className="text-[13px] space-y-4 font-desc">
        {actions.length > 0 ? actions.map((a, i) => (
          <li key={i} className="flex gap-3 items-start leading-tight">
            <span className="text-red-500 mt-0.5 text-[10px]">●</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-serif font-black text-gray-900 uppercase text-[9px] tracking-tight">{a.title}</span>
              <span className="text-gray-500 font-medium leading-relaxed">{a.desc}</span>
            </div>
          </li>
        )) : (
          <li className="text-gray-400 text-center py-4 font-medium italic">Video is perfectly optimized for its current niche and audience.</li>
        )}
      </ul>
    </div>
  );
}
