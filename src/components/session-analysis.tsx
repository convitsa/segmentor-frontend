"use client";

import type { SessionAnalysis } from "@/lib/types/dto";
import { cn } from "@/lib/utils";

const SEVERITY_COLORS: Record<string, { dot: string; text: string }> = {
  red: { dot: "bg-red-500", text: "text-red-400" },
  orange: { dot: "bg-orange-400", text: "text-orange-300" },
  yellow: { dot: "bg-yellow-400", text: "text-yellow-300" },
};

const VERDICT_STYLES: Record<string, string> = {
  positive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  negative: "bg-red-500/10 text-red-400 border-red-500/20",
};

function MetadataRow({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-[14px] dark:text-[#C2C0B6]">{label}</span>
        <span className="text-[14px] dark:text-white text-right">{value}</span>
      </div>
      {!last && <div className="mx-3 border-t dark:border-[#484848]" />}
    </>
  );
}

export function SessionAnalysisView({ analysis }: { analysis: SessionAnalysis }) {
  const { metadata, activityOverview, frictionScore, frictionPoints, visitorJourney, recommendations, verdict } = analysis;

  const frictionColor =
    frictionScore.level === "high" ? "text-red-400 bg-red-500/10 border-red-500/20" :
    frictionScore.level === "medium" ? "text-orange-400 bg-orange-500/10 border-orange-500/20" :
    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

  return (
    <div className="flex flex-col gap-6 max-w-[724px]">
      {/* Section Title */}
      <h2 className="text-[20px] font-semibold dark:text-white">Session Analysis</h2>

      {/* Metadata Table */}
      <div className="rounded-2xl border dark:border-[#484848] overflow-hidden">
        <MetadataRow label="Visitor:" value={metadata.visitor} />
        <MetadataRow label="Location:" value={metadata.location} />
        <MetadataRow label="Device:" value={metadata.device} />
        <MetadataRow label="Browser:" value={metadata.browser} />
        <MetadataRow label="Date:" value={metadata.date} />
        <MetadataRow
          label="AI Verdict badge:"
          value={
            <span className={cn(
              "inline-block px-2 py-0.5 rounded-md text-[14px] border",
              VERDICT_STYLES[metadata.verdictType] || VERDICT_STYLES.warning
            )}>
              {metadata.verdict}
            </span>
          }
          last
        />
      </div>

      {/* Activity Overview */}
      <p className="text-[16px] dark:text-[#C2C0B6]">
        A snapshot of this visitor&apos;s overall activity during their session.
      </p>

      <div className="rounded-2xl border dark:border-[#484848] overflow-hidden">
        <div className="grid grid-cols-4 px-3 py-2.5">
          <span className="text-[14px] dark:text-[#C2C0B6]">Sessions</span>
          <span className="text-[14px] dark:text-[#C2C0B6]">Pageviews</span>
          <span className="text-[14px] dark:text-[#C2C0B6]">Rage Clicks</span>
          <span className="text-[14px] dark:text-[#C2C0B6]">Time on Site</span>
        </div>
        <div className="mx-3 border-t dark:border-[#484848]" />
        <div className="grid grid-cols-4 px-3 py-2.5">
          <span className="text-[14px] dark:text-white font-medium">{activityOverview.sessions}</span>
          <span className="text-[14px] dark:text-white font-medium">{activityOverview.pageviews}</span>
          <span className="text-[14px] dark:text-white font-medium">{activityOverview.rageClicks}</span>
          <span className="text-[14px] dark:text-white font-medium">{activityOverview.timeOnSite}</span>
        </div>
      </div>

      {/* Friction Score */}
      <div className="flex flex-col gap-2">
        <h3 className="text-[18px] font-semibold dark:text-white">Friction Score</h3>
        <p className="text-[14px] dark:text-[#C2C0B6]">{frictionScore.description}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className={cn("px-2 py-0.5 rounded-md text-[14px] font-semibold border", frictionColor)}>
            {frictionScore.score} / 100
          </span>
          <span className="text-[14px] dark:text-[#C2C0B6]">
            {frictionScore.level === "high" ? "🔴" : frictionScore.level === "medium" ? "🟠" : "🟢"}{" "}
            {frictionScore.level.charAt(0).toUpperCase() + frictionScore.level.slice(1)} friction
          </span>
        </div>
      </div>

      {/* Friction Points */}
      {frictionPoints.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[18px] font-semibold dark:text-white">Friction Points</h3>
          <p className="text-[14px] dark:text-[#C2C0B6]">
            Specific moments in the session where the visitor struggled, hesitated, or hit a dead end.
          </p>
          <div className="flex flex-col gap-1.5 mt-1">
            {frictionPoints.map((fp, i) => {
              const colors = SEVERITY_COLORS[fp.severity] || SEVERITY_COLORS.yellow;
              return (
                <div key={i} className="flex items-start gap-2">
                  <div className={cn("size-2.5 rounded-full mt-1.5 shrink-0", colors.dot)} />
                  <span className="text-[14px] dark:text-[#C2C0B6]">{fp.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visitor Journey */}
      {visitorJourney.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[18px] font-semibold dark:text-white">Visitor Journey</h3>
          <p className="text-[14px] dark:text-[#C2C0B6]">
            The exact path this visitor took through your site — repeated loops indicate unresolved intent.
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {visitorJourney.map((path, i) => (
              <span key={i} className="contents">
                <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[14px] dark:text-[#7CB3F5] border dark:border-[#484848]">
                  {path}
                </span>
                {i < visitorJourney.length - 1 && (
                  <span className="text-[14px] dark:text-[#C2C0B6]">→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[18px] font-semibold dark:text-white">Recommendations</h3>
          <p className="text-[14px] dark:text-[#C2C0B6]">
            Actions ranked by impact. These are the fastest ways to recover visitors like this one.
          </p>
          <div className="rounded-2xl border dark:border-[#484848] overflow-hidden mt-1">
            {recommendations.map((rec, i) => (
              <div key={i}>
                <div className="px-4 py-3">
                  <span className="text-[14px] dark:text-white font-semibold">{rec.title}:</span>{" "}
                  <span className="text-[14px] dark:text-[#C2C0B6]">{rec.description}</span>
                </div>
                {i < recommendations.length - 1 && (
                  <div className="mx-4 border-t dark:border-[#484848]" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verdict Bar */}
      <div className="flex flex-col gap-2">
        <h3 className="text-[18px] font-semibold dark:text-white">Verdict Bar</h3>
        <p className="text-[14px] dark:text-[#C2C0B6]">
          The single most important takeaway from this session, in plain language.
        </p>
        <div className="rounded-2xl border dark:border-[#484848] px-4 py-3 mt-1">
          <p className="text-[14px] dark:text-[#C2C0B6] italic">
            &ldquo;{verdict.summary}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
