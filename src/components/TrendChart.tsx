"use client";

import { useState, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { lineupData, GENRE_COLORS, Genre } from "@/data/lineups";

const MIN_THRESHOLD = 5;

function computeTrendData() {
  const activeYears = lineupData.filter((yd) => !yd.cancelled);
  const allGenres = new Set<Genre>();
  activeYears.forEach((yd) =>
    yd.artists.forEach((a) => allGenres.add(a.genre))
  );

  const genrePeaks = new Map<Genre, number>();
  for (const genre of allGenres) {
    let peak = 0;
    for (const yd of activeYears) {
      const total = yd.artists.length;
      const count = yd.artists.filter((a) => a.genre === genre).length;
      const pct = Math.round((count / total) * 1000) / 10;
      if (pct > peak) peak = pct;
    }
    genrePeaks.set(genre, peak);
  }

  const significantGenres = Array.from(allGenres)
    .filter((g) => (genrePeaks.get(g) || 0) >= MIN_THRESHOLD)
    .sort((a, b) => (genrePeaks.get(b) || 0) - (genrePeaks.get(a) || 0));

  const dataPoints = activeYears.map((yd) => {
    const total = yd.artists.length;
    const point: Record<string, number | string> = { year: yd.year };
    for (const genre of significantGenres) {
      const count = yd.artists.filter((a) => a.genre === genre).length;
      point[genre] = Math.round((count / total) * 1000) / 10;
    }
    return point;
  });

  return { dataPoints, genres: significantGenres };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const sorted = [...payload].sort(
    (a: { value: number }, b: { value: number }) => b.value - a.value
  );
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 max-w-xs shadow-xl z-50">
      <p className="font-bold text-white text-sm mb-2">HARD Summer {label}</p>
      <div className="space-y-1">
        {sorted
          .filter((entry: { value: number }) => entry.value > 0)
          .map((entry: { name: string; value: number; color: string }) => (
            <div key={entry.name} className="flex items-center gap-2 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-zinc-300 flex-1">{entry.name}</span>
              <span className="text-zinc-400 font-mono">{entry.value}%</span>
            </div>
          ))}
      </div>
    </div>
  );
}

export default function TrendChart() {
  const { dataPoints, genres } = useMemo(() => computeTrendData(), []);
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
  const [hiddenGenres, setHiddenGenres] = useState<Set<string>>(new Set());

  const visibleGenres = useMemo(
    () => genres.filter((g) => !hiddenGenres.has(g)),
    [genres, hiddenGenres]
  );

  const toggleGenre = useCallback((genre: string) => {
    setHiddenGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) {
        next.delete(genre);
      } else {
        next.add(genre);
      }
      return next;
    });
  }, []);

  const isolateGenre = useCallback(
    (genre: string) => {
      const allHiddenExceptThis = new Set(
        genres.filter((g) => g !== genre)
      );
      const currentlyIsolated =
        hiddenGenres.size === genres.length - 1 && !hiddenGenres.has(genre);
      if (currentlyIsolated) {
        setHiddenGenres(new Set());
      } else {
        setHiddenGenres(allHiddenExceptThis);
      }
    },
    [genres, hiddenGenres]
  );

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-px bg-zinc-700 mx-auto mb-8" />
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
          Genre Trend Lines
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Only genres reaching {MIN_THRESHOLD}%+ of any lineup are shown.
          Click a genre to toggle it. Double-click to isolate.
        </p>
      </div>

      {/* Genre Legend (clickable to toggle) */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() => toggleGenre(genre)}
            onDoubleClick={() => isolateGenre(genre)}
            onMouseEnter={() => setHoveredGenre(genre)}
            onMouseLeave={() => setHoveredGenre(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              hiddenGenres.has(genre)
                ? "opacity-30 line-through border-zinc-800"
                : hoveredGenre === genre
                ? "opacity-100 border-zinc-400 bg-zinc-800"
                : "opacity-100 border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{
                backgroundColor: GENRE_COLORS[genre as Genre] || "#666",
              }}
            />
            <span className="text-zinc-200">{genre}</span>
          </button>
        ))}
      </div>

      {/* Line Chart */}
      <div className="mb-12">
        <ResponsiveContainer width="100%" height={450}>
          <LineChart
            data={dataPoints}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#222"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              stroke="#666"
              tick={{ fontSize: 13, fill: "#aaa" }}
              tickFormatter={(v) => `'${String(v).slice(-2)}`}
              axisLine={{ stroke: "#333" }}
            />
            <YAxis
              stroke="#666"
              tick={{ fontSize: 12, fill: "#aaa" }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, "auto"]}
              axisLine={{ stroke: "#333" }}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            {visibleGenres.map((genre) => {
              const isHovered = hoveredGenre === genre;
              const somethingHovered = hoveredGenre !== null;
              return (
                <Line
                  key={genre}
                  type="monotone"
                  dataKey={genre}
                  stroke={GENRE_COLORS[genre as Genre] || "#666"}
                  strokeWidth={isHovered ? 5 : somethingHovered ? 1.5 : 3}
                  dot={{
                    r: isHovered ? 6 : somethingHovered ? 0 : 4,
                    fill: GENRE_COLORS[genre as Genre] || "#666",
                    stroke: "#0a0a0a",
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 7, stroke: "#fff", strokeWidth: 2 }}
                  opacity={
                    somethingHovered && !isHovered ? 0.15 : 1
                  }
                  connectNulls
                  onMouseEnter={() => setHoveredGenre(genre)}
                  onMouseLeave={() => setHoveredGenre(null)}
                  style={{ cursor: "pointer" }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stacked Area Chart */}
      <div className="mb-12">
        <h3 className="text-lg font-bold text-white mb-4 text-center">
          Stacked Genre Share
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={dataPoints}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#222"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              stroke="#666"
              tick={{ fontSize: 13, fill: "#aaa" }}
              tickFormatter={(v) => `'${String(v).slice(-2)}`}
              axisLine={{ stroke: "#333" }}
            />
            <YAxis
              stroke="#666"
              tick={{ fontSize: 12, fill: "#aaa" }}
              tickFormatter={(v) => `${v}%`}
              axisLine={{ stroke: "#333" }}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            {visibleGenres.map((genre) => (
              <Area
                key={genre}
                type="monotone"
                dataKey={genre}
                stackId="1"
                stroke={GENRE_COLORS[genre as Genre] || "#666"}
                fill={GENRE_COLORS[genre as Genre] || "#666"}
                fillOpacity={0.7}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Key Takeaways */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TakeawayCard
          title="House & Tech House Rising"
          color="#6366f1"
          description="House music genres have grown from ~25% of lineups in 2015 to 40%+ by 2025-2026, becoming the dominant sound of the festival."
        />
        <TakeawayCard
          title="Hip-Hop Retreat"
          color="#eab308"
          description="Hip-Hop peaked at 25-30% during 2017-2019 (Migos, Travis Scott era) and has declined to under 5% by 2025-2026."
        />
        <TakeawayCard
          title="Drum & Bass Emerges"
          color="#10b981"
          description="Virtually absent before 2022, DnB now commands 5-7% of lineups with acts like Chase & Status, Dimension, and Andy C."
        />
        <TakeawayCard
          title="Hard Techno Wave"
          color="#4c1d95"
          description="A new genre appearing in 2024-2025 with Sara Landry, 999999999, and Brutalismus 3000 leading the charge."
        />
        <TakeawayCard
          title="Future Bass Faded"
          color="#06b6d4"
          description="Once claiming 15-20% of lineups (2015-2016), Future Bass has steadily declined as tastes shifted toward harder sounds."
        />
        <TakeawayCard
          title="Trap Evolution"
          color="#f59e0b"
          description="Trap maintained a strong 10-15% through 2019, then gradually decreased as festival-trap artists pivoted to other styles."
        />
      </div>
    </div>
  );
}

function TakeawayCard({
  title,
  color,
  description,
}: {
  title: string;
  color: string;
  description: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h4 className="text-sm font-bold text-white">{title}</h4>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}
