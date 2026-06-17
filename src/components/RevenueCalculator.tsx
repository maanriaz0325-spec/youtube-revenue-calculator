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
  
  // Simulation overrides state
  const [overrides, setOverrides] = useState<{
    niche?: string;
    views?: number;
    cpmMinOverride?: number;
    cpmMaxOverride?: number;
  }>({});

  // View mode of top card ("monthly" or "lifetime")
  const [viewMode, setViewMode] = useState<"monthly" | "lifetime">("monthly");

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

      setData(videoResult);
      setOverrides({});
      setViewMode("monthly"); // Default to monthly run-rate for accuracy
    } catch (err: any) {
      setError(err.message || "Failed to fetch video data. check your API key.");
    } finally {
      setLoading(false);
    }
  };

  // Re-run the core calculation engine in the browser on user parameter tweaks
  const activeData = useMemo(() => {
    if (!data) return null;
    const originalVideoInfo = data.videoInfo;
    
    const customVideoData: any = {
      ...originalVideoInfo,
      viewCount: overrides.views !== undefined ? overrides.views : originalVideoInfo.viewCount,
      detectedNiche: overrides.niche !== undefined ? overrides.niche : originalVideoInfo.detectedNiche,
    };
    
    const recalculated = calculateRevenue(customVideoData);
    
    if (overrides.cpmMinOverride !== undefined || overrides.cpmMaxOverride !== undefined) {
      const cpmMinVal = overrides.cpmMinOverride !== undefined ? overrides.cpmMinOverride : recalculated.calculations.cpmMin;
      const cpmMaxVal = overrides.cpmMaxOverride !== undefined ? overrides.cpmMaxOverride : recalculated.calculations.cpmMax;
      
      recalculated.calculations.cpmMin = cpmMinVal;
      recalculated.calculations.cpmMax = cpmMaxVal;
      
      const adImpressionRate = recalculated.calculations.monetizedViewRate;
      const monetizedViews = recalculated.calculations.monetizedViews;
      
      const grossAdSenseMin = (monetizedViews / 1000) * cpmMinVal;
      const grossAdSenseMax = (monetizedViews / 1000) * cpmMaxVal;
      
      const netAdSenseMin = grossAdSenseMin * 0.55;
      const netAdSenseMax = grossAdSenseMax * 0.55;
      
      recalculated.calculations.adsenseMin = netAdSenseMin;
      recalculated.calculations.adsenseMax = netAdSenseMax;
      
      const rpmMin = customVideoData.viewCount > 0 ? (netAdSenseMin / customVideoData.viewCount) * 1000 : 0;
      const rpmMax = customVideoData.viewCount > 0 ? (netAdSenseMax / customVideoData.viewCount) * 1000 : 0;
      
      recalculated.calculations.effectiveRpmMin = rpmMin;
      recalculated.calculations.effectiveRpmMax = rpmMax;
      
      recalculated.calculations.premiumMin = netAdSenseMin * 0.05;
      recalculated.calculations.premiumMax = netAdSenseMax * 0.05;
      
      const totalEarningsMin = Math.round((netAdSenseMin + recalculated.calculations.sponsorMin + recalculated.calculations.affiliateMin + recalculated.calculations.premiumMin + recalculated.calculations.membershipMin) * 100) / 100;
      const totalEarningsMax = Math.round((netAdSenseMax + recalculated.calculations.sponsorMax + recalculated.calculations.affiliateMax + recalculated.calculations.premiumMax + recalculated.calculations.membershipMax) * 100) / 100;
      
      recalculated.calculations.totalEarningsMin = totalEarningsMin;
      recalculated.calculations.totalEarningsMax = totalEarningsMax;
      
      recalculated.calculations.epvMin = totalEarningsMin / (customVideoData.viewCount || 1);
      recalculated.calculations.epvMax = totalEarningsMax / (customVideoData.viewCount || 1);
      
      recalculated.calculations.projectedLifetimeEarningsMin = totalEarningsMin * 1.8;
      recalculated.calculations.projectedLifetimeEarningsMax = totalEarningsMax * 1.8;
    }
    
    return recalculated;
  }, [data, overrides]);

  const graphData = useMemo(() => {
    if (!activeData) return [];
    const baseline = activeData.calculations.totalEarningsMin;
    const optimized = activeData.calculations.projectedLifetimeEarningsMin || (baseline * 1.8);
    
    return [
      { month: "Start", current: 0, optimized: 0 },
      { month: "Month 1", current: baseline * 0.35, optimized: optimized * 0.25 },
      { month: "Month 2", current: baseline * 0.65, optimized: optimized * 0.48 },
      { month: "Month 3", current: baseline * 0.85, optimized: optimized * 0.68 },
      { month: "Month 4", current: baseline * 0.95, optimized: optimized * 0.82 },
      { month: "Month 5", current: baseline, optimized: optimized * 0.94 },
      { month: "Month 6", current: baseline * 1.05, optimized: optimized },
    ];
  }, [activeData]);

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
                YouTube Video Revenue Calculator
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
                  YouTube Video Revenue Calculator
                </h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px] text-gray-400 font-black uppercase tracking-widest">
                  <span>Analysis for ID: {activeData.videoInfo.videoId}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setData(null);
                  setUrl("");
                  setOverrides({});
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
            <Section1 data={activeData} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column (4/12) */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                <Section2 data={activeData} viewMode={viewMode} setViewMode={setViewMode} />
                <CustomizerPanel videoInfo={data.videoInfo} overrides={overrides} setOverrides={setOverrides} />
                <TargetedRevenue data={activeData} />
              </div>

              {/* Right Column (8/12) */}
              <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                <Section3 data={activeData} />
                <div className="bg-white border border-gray-100 rounded-xl p-8 flex flex-col shadow-sm">
                   <Section5 graphData={graphData} />
                   <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                      <Section4 data={activeData} />
                      <ActionItems data={activeData} />
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

function Section2({ data, viewMode, setViewMode }: { data: any; viewMode: "monthly" | "lifetime"; setViewMode: (mode: "monthly" | "lifetime") => void }) {
  const { calculations, videoInfo } = data;
  
  const cpmMinVal = calculations.cpmMin !== undefined ? calculations.cpmMin : 0;
  const cpmMaxVal = calculations.cpmMax !== undefined ? calculations.cpmMax : 0;

  const pubDate = new Date(videoInfo.publishedAt);
  const videoAgeDays = Math.max(1, (Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24));
  const ageMonths = Math.max(1.0, videoAgeDays / 30.417);

  const displayMin = viewMode === "monthly" 
    ? Math.round(calculations.totalEarningsMin / ageMonths) 
    : Math.round(calculations.totalEarningsMin);
    
  const displayMax = viewMode === "monthly" 
    ? Math.round(calculations.totalEarningsMax / ageMonths) 
    : Math.round(calculations.totalEarningsMax);

  return (
    <div className="corner-red-box p-8 flex flex-col justify-center min-h-[290px]">
      <div className="flex justify-between items-center mb-5">
        <span className="text-[12px] uppercase tracking-widest text-gray-500 font-serif font-black">
          {viewMode === "monthly" ? "Present Monthly Revenue" : "Accumulated Video Earnings"}
        </span>
        <div className="flex bg-gray-100 p-0.5 rounded border border-gray-200/50 text-[9px] font-sans font-black">
          <button 
            onClick={() => setViewMode("monthly")}
            className={cn("px-2.5 py-1 rounded transition-colors uppercase tracking-tight cursor-pointer", viewMode === "monthly" ? "bg-white text-red-600 shadow-sm font-black" : "text-gray-500 hover:text-gray-800")}
          >
            Monthly
          </button>
          <button 
            onClick={() => setViewMode("lifetime")}
            className={cn("px-2.5 py-1 rounded transition-colors uppercase tracking-tight cursor-pointer", viewMode === "lifetime" ? "bg-white text-red-600 shadow-sm font-black" : "text-gray-500 hover:text-gray-800")}
          >
            Lifetime
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-left">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-4xl md:text-5xl font-sans font-black tracking-tighter text-gray-900 leading-none">
            ${displayMin.toLocaleString()}–${displayMax.toLocaleString()}
          </span>
        </div>
        <span className="text-[11px] text-gray-400 font-serif font-bold uppercase tracking-wider mt-1 block">
          {viewMode === "monthly" 
            ? `Estimated Monthly Run-rate` 
            : `Gross Video Accumulated Income`
          }
        </span>
      </div>

      <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-2 gap-y-7 gap-x-4 text-left">
        <MiniStat label="Audience Niche" value={videoInfo.customNicheName || videoInfo.detectedNiche} capitalize />
        <MiniStat label="Effective RPM" value={`$${calculations.effectiveRpmMin.toFixed(2)}–$${calculations.effectiveRpmMax.toFixed(2)}`} valueColor="text-green-600" />
        <MiniStat label="Blended CPM" value={`$${cpmMinVal.toFixed(2)}–$${cpmMaxVal.toFixed(2)}`} />
        <MiniStat label="Value Per View" value={`$${calculations.epvMin.toFixed(4)}–$${calculations.epvMax.toFixed(4)}`} />
      </div>

      <div className="mt-4 text-[10px] text-gray-400 font-medium font-serif italic text-left pt-3 border-t border-gray-100 leading-relaxed">
        {viewMode === "monthly" 
          ? `* Normalized run-rate computed across ${ageMonths.toFixed(1)} active months since upload (${Math.round(videoInfo.viewCount / ageMonths).toLocaleString()} views/mo average).`
          : `* Total gross historical value accrued based on ${videoInfo.viewCount.toLocaleString()} total video impressions.`
        }
      </div>
    </div>
  );
}

function CustomizerPanel({ 
  videoInfo, 
  overrides, 
  setOverrides 
}: { 
  videoInfo: any; 
  overrides: any; 
  setOverrides: React.Dispatch<React.SetStateAction<any>> 
}) {
  const niches = [
    { value: "finance", label: "Finance & Wealth ($15 - $45 CPM)" },
    { value: "tech", label: "Tech, AI & Gadgets ($8 - $22 CPM)" },
    { value: "education", label: "Education & Tutorials ($7 - $20 CPM)" },
    { value: "health", label: "Health & Workout ($5 - $16 CPM)" },
    { value: "gaming", label: "Gaming, streams & Commentary ($2 - $8 CPM)" },
    { value: "news", label: "News & Politics ($3 - $10 CPM)" },
    { value: "kids", label: "Kids Content ($1 - $4 CPM)" },
    { value: "music", label: "Music & Beats ($0.80 - $3 CPM)" },
    { value: "entertainment", label: "Vlogs, Comedy & Entertainment ($1.50 - $6 CPM)" },
    { value: "shorts", label: "Shorts Format ($0.05 - $0.25 CPM)" }
  ];

  const currentNiche = overrides.niche || videoInfo.detectedNiche;
  const currentViews = overrides.views !== undefined ? overrides.views : videoInfo.viewCount;
  
  return (
    <div className="bg-white border border-gray-150 rounded-xl p-6 flex flex-col gap-5 shadow-sm text-left">
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <span className="text-[12px] uppercase tracking-widest text-gray-800 font-serif font-black flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-red-600" /> Revenue Customizer
        </span>
        {Object.keys(overrides).length > 0 && (
          <button 
            onClick={() => setOverrides({})}
            className="text-[10px] uppercase tracking-wider font-extrabold text-red-600 hover:underline cursor-pointer"
          >
            Reset to Auto
          </button>
        )}
      </div>

      {/* 1. Niche Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-serif font-bold">Category (Niche)</label>
        <select 
          value={currentNiche}
          onChange={(e) => setOverrides((prev: any) => ({ ...prev, niche: e.target.value }))}
          className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-xs font-semibold outline-none focus:border-red-500 transition-colors"
        >
          {niches.map((n) => (
            <option key={n.value} value={n.value}>{n.label}</option>
          ))}
        </select>
        <span className="text-[9px] text-gray-400 italic">Adjusts base CPM rates according to high/low advertiser bids of this sector.</span>
      </div>

      {/* 2. Simulation Views */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-wider text-gray-400 font-serif font-bold flex justify-between items-center">
          <span>Simulation Views</span>
          <span className="font-sans font-black text-gray-800">{Number(currentViews).toLocaleString()}</span>
        </label>
        <input 
          type="range"
          min="1000"
          max={Math.max(10000000, videoInfo.viewCount * 2)}
          step="1000"
          value={currentViews}
          onChange={(e) => setOverrides((prev: any) => ({ ...prev, views: Number(e.target.value) }))}
          className="w-full accent-red-600 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between items-center mt-1">
          <input 
            type="number"
            value={currentViews}
            onChange={(e) => setOverrides((prev: any) => ({ ...prev, views: Math.max(0, Number(e.target.value)) }))}
            className="w-full max-w-[150px] bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-xs font-mono text-gray-700 outline-none"
          />
          <span className="text-[9px] text-gray-400 font-serif italic">Simulate views velocity</span>
        </div>
      </div>

      {/* 3. Base CPM overrides */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-serif font-bold">Min CPM Override</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input 
              type="number"
              min="0.01"
              max="100"
              step="0.5"
              placeholder="Auto"
              value={overrides.cpmMinOverride || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                setOverrides((prev: any) => ({ ...prev, cpmMinOverride: val }));
              }}
              className="w-full bg-gray-50 border border-gray-200 rounded pl-5 pr-2 py-1.5 text-xs font-mono outline-none"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-serif font-bold">Max CPM Override</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input 
              type="number"
              min="0.1"
              max="200"
              step="0.5"
              placeholder="Auto"
              value={overrides.cpmMaxOverride || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                setOverrides((prev: any) => ({ ...prev, cpmMaxOverride: val }));
              }}
              className="w-full bg-gray-50 border border-gray-200 rounded pl-5 pr-2 py-1.5 text-xs font-mono outline-none"
            />
          </div>
        </div>
      </div>
      <p className="text-[9px] text-gray-450 leading-normal font-serif italic pt-1 border-t border-gray-100">
        Simulations feed instantly into direct platform Ads, Sponsorships, Affiliates, Premium, and members pipelines.
      </p>
    </div>
  );
}

function MiniStat({ label, value, valueColor, capitalize }: any) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-widest text-gray-400 font-serif font-bold">{label}</span>
      <span className={cn("text-[15px] font-sans font-black text-gray-800 leading-snug", valueColor, capitalize && "capitalize")}>{value}</span>
    </div>
  );
}

function TargetedRevenue({ data }: { data: any }) {
  const { calculations, videoInfo } = data;
  const [openStream, setOpenStream] = useState<string | null>(null);
  
  const streams = [
    {
      id: "adsense",
      title: "Direct Platform Ads",
      sub: "Google AdSense Net Revenue",
      min: calculations.adsenseMin || Math.round(calculations.totalEarningsMin * 0.8),
      max: calculations.adsenseMax || Math.round(calculations.totalEarningsMax * 0.8),
      active: true,
      activeLabel: "Monetization Active",
      explanation: calculations.explanations?.adsense || "Calculated using view rate, CPM tables, and duration multipliers.",
      color: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]",
      activeText: "text-red-600"
    },
    {
      id: "sponsor",
      title: "Brand Sponsorships",
      sub: "Guaranteed Commercial Slots",
      min: calculations.sponsorMin,
      max: calculations.sponsorMax,
      active: calculations.signals.hasSponsor,
      activeLabel: calculations.signals.hasSponsor ? "Integration Confirmed" : "No Authenticated Signals",
      explanation: calculations.explanations?.sponsor || "Determined by subscriber count ranges and business keywords in description.",
      color: calculations.signals.hasSponsor ? "bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.4)]" : "bg-gray-200",
      activeText: calculations.signals.hasSponsor ? "text-blue-600" : "text-gray-400"
    },
    {
      id: "affiliate",
      title: "Affiliate & Sales",
      sub: "Referral Conversion Income",
      min: calculations.affiliateMin,
      max: calculations.affiliateMax,
      active: calculations.signals.hasAffiliate,
      activeLabel: calculations.signals.hasAffiliate ? "Active Conversion Path" : "No Market Signal",
      explanation: calculations.explanations?.affiliate || "Estimated from e-commerce referral links extracted from description text.",
      color: calculations.signals.hasAffiliate ? "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.4)]" : "bg-gray-200",
      activeText: calculations.signals.hasAffiliate ? "text-green-600" : "text-gray-400"
    },
    {
      id: "premium",
      title: "Premium View Share",
      sub: "YouTube Premium Subscription Pool",
      min: calculations.premiumMin || Math.round(calculations.totalEarningsMin * 0.05),
      max: calculations.premiumMax || Math.round(calculations.totalEarningsMax * 0.05),
      active: true,
      activeLabel: "Platform Automatic Stream",
      explanation: calculations.explanations?.premium || "Calculated based on local YouTube Premium penetration benchmarks.",
      color: "bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.3)]",
      activeText: "text-purple-600"
    },
    {
      id: "membership",
      title: "Channel Memberships",
      sub: "Loyalty Backing & Subscriptions",
      min: calculations.membershipMin,
      max: calculations.membershipMax,
      active: calculations.signals.hasProduct,
      activeLabel: calculations.signals.hasProduct ? "Loyalty Support Active" : "No Subscription Links",
      explanation: calculations.explanations?.membership || "Derived from Patreon, buy-me-a-coffee, or YouTube membership links in text.",
      color: calculations.signals.hasProduct ? "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]" : "bg-gray-200",
      activeText: calculations.signals.hasProduct ? "text-amber-600" : "text-gray-400"
    }
  ];

  return (
    <div className="corner-red-box p-6 bg-white text-black border border-gray-100 flex flex-col gap-6 shadow-sm">
      <div className="flex justify-between items-start border-b border-gray-100 pb-5">
        <div className="flex flex-col text-left">
          <span className="text-[18px] uppercase tracking-[0.15em] text-gray-900 font-serif font-extrabold block">Revenue Attribution</span>
          <span className="text-[12px] text-gray-400 font-desc font-bold uppercase tracking-widest mt-1.5">Authentic Data-Driven Analysis</span>
        </div>
        <Zap className="w-5 h-5 text-red-500" />
      </div>
      
      <div className="space-y-4">
        {streams.map((stream) => {
          const isOpen = openStream === stream.id;
          return (
            <div key={stream.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
              <button 
                onClick={() => setOpenStream(isOpen ? null : stream.id)}
                className="w-full flex justify-between items-center group text-left cursor-pointer hover:opacity-95 transition-opacity"
              >
                <div className="flex flex-col">
                  <span className="text-gray-900 font-serif font-black text-[15px] uppercase tracking-tight group-hover:text-red-600 transition-colors">
                    {stream.title}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={cn("w-2 h-2 rounded-full", stream.color)} />
                    <span className={cn("text-[11px] font-desc font-bold uppercase tracking-wider", stream.activeText)}>
                      {stream.activeLabel}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={cn("font-sans font-black text-xl leading-none text-gray-900 tracking-tight")}>
                    ${Math.round(stream.min).toLocaleString()}–${Math.round(stream.max).toLocaleString()}
                  </span>
                  <span className="text-[9px] text-gray-400 font-desc uppercase font-bold mt-1 tracking-tight flex items-center gap-1">
                    {isOpen ? "Hide Work" : "Show Your Work"} <ArrowRight className={cn("w-2.5 h-2.5 transition-transform", isOpen ? "rotate-90" : "")} />
                  </span>
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-4 bg-gray-50 rounded border border-gray-100/80 text-left">
                      <span className="text-[10px] font-mono uppercase font-black tracking-widest block text-gray-400 mb-2">Calculation Transparency Logs</span>
                      <p className="text-[11px] text-gray-600 font-medium whitespace-pre-line leading-relaxed font-sans">
                        {stream.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Direct link scans from description */}
      <div className="mt-2 pt-5 border-t border-gray-100">
        <span className="text-[11px] uppercase tracking-widest text-gray-600 font-serif font-black block mb-3 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-red-600" /> Scanned Video Links ({videoInfo.detectedSources?.length || 0})
        </span>
        
        {videoInfo.detectedSources && videoInfo.detectedSources.length > 0 ? (
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {videoInfo.detectedSources.map((item: any, i: number) => {
              const badgeColors: Record<string, string> = {
                affiliate: "bg-green-50 text-green-700 border-green-200/40 text-[10px]",
                product: "bg-purple-50 text-purple-700 border-purple-200/40 text-[10px]",
                sponsor: "bg-blue-50 text-blue-700 border-blue-200/40 text-[10px]",
                social: "bg-gray-50 text-gray-600 border-gray-200 text-[10px]",
                general: "bg-amber-50 text-amber-700 border-amber-200/40 text-[10px]",
              };
              return (
                <div key={i} className="bg-gray-50 p-2.5 rounded border border-gray-100 flex flex-col gap-1 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] uppercase font-black tracking-widest text-gray-400 font-mono truncate max-w-[150px]">
                      {item.platform}
                    </span>
                    <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded border", badgeColors[item.type] || "bg-gray-100 text-gray-800 border-gray-200")}>
                      {item.type}
                    </span>
                  </div>
                  <a href={item.url} target="_blank" referrerPolicy="no-referrer" rel="noopener noreferrer" className="text-[11px] font-mono text-red-600 hover:underline truncate">
                    {item.url}
                  </a>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 p-3.5 rounded border border-gray-100 text-center">
            <p className="text-[11px] text-gray-400 font-medium italic leading-relaxed">
              * Direct description scan successfully analyzed. No commercial URLs, affiliate networks, or brand sponsor anchors detected in this video's description block.
            </p>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 rounded border border-gray-100 border-dashed text-left">
        <span className="text-[10px] font-mono uppercase font-black text-gray-500 tracking-wider block mb-1">Scale Reliability Rating</span>
        <p className="text-[11px] text-gray-400 italic leading-relaxed font-serif">
          {calculations.confidence?.overall || "Logical Verification: Estimates are derived from verified monetization paths identified in video metadata and behavioral signals."}
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

  const rpmMinVal = calculations.effectiveRpmMin !== undefined ? calculations.effectiveRpmMin : (nicheRpm?.min || 0);
  const rpmMaxVal = calculations.effectiveRpmMax !== undefined ? calculations.effectiveRpmMax : (nicheRpm?.max || 0);

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
            <p><span className="font-bold text-gray-900">📊 Niche Type:</span> <span className="capitalize">{videoInfo.customNicheName || videoInfo.detectedNiche}</span></p>
            <p><span className="font-bold text-gray-900">💰 RPM Bracket:</span> <span className="font-sans font-semibold">${rpmMinVal.toFixed(2)} - ${rpmMaxVal.toFixed(2)}</span></p>
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
  const minVal = data.calculations.projectedLifetimeEarningsMin;
  const maxVal = data.calculations.projectedLifetimeEarningsMax;
  
  const formattedRange = minVal !== undefined && maxVal !== undefined
    ? `${Math.round(minVal).toLocaleString()} – $${Math.round(maxVal).toLocaleString()}`
    : `${(data.calculations.totalEarningsMin * 1.8).toLocaleString()}`;

  const hasRangeValue = minVal !== undefined && maxVal !== undefined;

  return (
    <div className="bg-red-50 p-5 rounded border-l-4 border-red-500 flex flex-col justify-center shadow-sm">
      <span className="text-[10px] uppercase tracking-widest text-red-700 font-serif font-bold mb-1">Lifetime Projection (Optimized)</span>
      <div className="text-2xl md:text-3xl font-sans font-black text-red-700 tracking-tight">
        ${formattedRange}
      </div>
      <p className="text-[10px] text-red-600 font-desc font-black uppercase mt-1.5 tracking-tighter">
        {hasRangeValue ? "⚡ Dynamic Future Earnings Potential" : "⚡ +180% Increase Potential"}
      </p>
    </div>
  );
}

function ActionItems({ data }: { data: any }) {
  const { videoInfo } = data;
  
  // Try to use Gemini dynamic optimization suggestions if available, fallback to local algorithmic hooks
  const actions: any[] = videoInfo.optimizationActionPoints || [];

  if (actions.length === 0) {
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
