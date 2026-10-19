import React, { useState, useMemo } from 'react';
import {
  Video,
  Clock,
  ExternalLink,
  Check,
  Copy,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

/**
 * VideoTimelineCard
 * Interactive, scrollable YouTube video roadmap pinned onto the student's whiteboard.
 * Displays 100% continuous chronological timestamps from 00:00 through video end.
 * Allows student to search timestamps and click "Ask Sir to Explain" to trigger
 * real-time, zero-hallucination explanation strictly grounded in the video transcript.
 */
export function VideoTimelineCard({ item, onAskChapter }) {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(null);

  const video = item.video || {
    title: item.topic?.replace(/^[🎬📺\s]+/u, '') || 'YouTube Video',
    channel: item.attribution || 'YouTube Channel',
    duration: '',
    url: item.imageUrl ? `https://www.youtube.com/results?search_query=${encodeURIComponent(item.topic || '')}` : '',
    thumbnail: item.imageUrl,
  };

  const timeline = useMemo(() => (Array.isArray(item.timeline) ? item.timeline : []), [item.timeline]);

  // Filter chapters based on user search term
  const filteredTimeline = useMemo(() => {
    if (!searchQuery.trim()) return timeline;
    const q = searchQuery.toLowerCase().trim();
    return timeline.filter(
      (ch) =>
        ch.timeRange?.toLowerCase().includes(q) ||
        ch.topic?.toLowerCase().includes(q) ||
        ch.text?.toLowerCase().includes(q)
    );
  }, [timeline, searchQuery]);

  const copyRoadmap = () => {
    if (!timeline || timeline.length === 0) return;
    const text = timeline
      .map((ch) => `${ch.index}. [${ch.timeRange}] ${ch.topic}\n   ${ch.text}`)
      .join('\n\n');
    const fullText = `=== ${video.title} ===\nChannel: ${video.channel}\nURL: ${video.url}\n\nCHRONOLOGICAL TIMELINE:\n${text}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleChapterClick = (ch) => {
    setSelectedChapterIndex(ch.index);
    if (onAskChapter) {
      onAskChapter(ch);
    }
  };

  return (
    <div
      className="my-3 rounded-2xl border-2 border-amber-300/80 bg-gradient-to-b from-[#fffefc] to-[#fbf7ee] p-4 sm:p-5 shadow-sm font-sans w-full max-w-3xl mx-auto transition-all duration-200"
      data-testid="video-timeline-card"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/70">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Video className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[11px] font-bold tracking-wide uppercase">
                YouTube Study Roadmap
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Zero Hallucination Grounded</span>
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif leading-snug mt-1 truncate">
              {video.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-stone-600 font-sans mt-0.5 flex-wrap">
              <span className="font-semibold text-stone-700">{video.channel}</span>
              {video.duration && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-stone-400" />
                    {video.duration}
                  </span>
                </>
              )}
              {timeline.length > 0 && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-amber-800">{timeline.length} Full Chapters (00:00 - End)</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {video.url && (
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:text-red-700 bg-stone-100 hover:bg-red-50 border border-stone-200/80 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Open video on YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Watch</span>
            </a>
          )}
          <button
            type="button"
            onClick={copyRoadmap}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 border border-stone-200/80 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Copy full timeline"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy Roadmap</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 border border-stone-200/80 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse Timeline' : 'Expand Timeline'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Search / Filter Bar */}
          <div className="mt-3 relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts or timestamps across this video (e.g. '04:15', 'experiment', 'formula')..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-stone-800 placeholder-stone-400 transition-all font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 px-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Chronological Timeline List */}
          <div className="mt-3 space-y-2.5 max-h-[420px] overflow-y-auto pr-1 select-text scrollbar-thin">
            {filteredTimeline.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-500 font-sans">
                No timestamps match &quot;{searchQuery}&quot;. Try another keyword.
              </div>
            ) : (
              filteredTimeline.map((ch) => {
                const isSelected = selectedChapterIndex === ch.index;
                return (
                  <div
                    key={ch.index}
                    className={`p-3 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-amber-100/80 border-amber-400 ring-2 ring-amber-300/40 shadow-xs'
                        : 'bg-white hover:bg-amber-50/50 border-stone-200/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-stone-900 text-amber-300 shadow-2xs">
                          {ch.timeRange}
                        </span>
                        {ch.isOfficialChapter && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Chapter
                          </span>
                        )}
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900 font-sans leading-tight">
                          {ch.topic}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleChapterClick(ch)}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold text-amber-900 bg-amber-200/70 hover:bg-amber-300 transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                        title="Ask Aristotle to explain this specific timestamp"
                      >
                        <MessageSquare className="w-3 h-3 text-amber-800" />
                        <span>Explain Part</span>
                      </button>
                    </div>

                    {/* Grounded Transcript Dialogue Excerpt */}
                    {ch.text && (
                      <p className="mt-2 text-xs text-stone-600 font-serif leading-relaxed line-clamp-2 hover:line-clamp-none transition-all">
                        &ldquo;{ch.text}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Guidance */}
          <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-stone-500 font-sans">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Tap &quot;Explain Part&quot; or say a timestamp (e.g. &quot;04:30 samjhao&quot;) to hear Aristotle explain strictly from the video.</span>
            </span>
            <span className="font-mono text-stone-400">100% video coverage</span>
          </div>
        </>
      )}
    </div>
  );
}
