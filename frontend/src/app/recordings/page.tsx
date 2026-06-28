"use client";

import { RECORDINGS_KEY } from "@/lib/recordings";
import { useEffect, useState } from "react";
import {
  Circle,
  Clock,
  Download,
  Film,
  Play,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";

// =============================================================================
//  Types
// =============================================================================

export interface Recording {
  id: string;   // uuid
  meetingId: string;
  title: string;
  filename: string;
  durationSec: number;
  sizeMB: number;
  createdAt: string;   // ISO string
}


// =============================================================================
//  Helpers
// =============================================================================

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatBytes(mb: number): string {
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(mb * 1024).toFixed(0)} KB`;
}

// =============================================================================
//  Seed mock recordings if localStorage is empty
// =============================================================================

function seedMockRecordings(): Recording[] {
  const now = Date.now();
  return [
    {
      id: "rec-001",
      meetingId: "433-323-038",
      title: "Sprint 13 Retrospective",
      filename: "zoom_recording_2026-06-21T10-00-00.webm",
      durationSec: 3612,
      sizeMB: 48.2,
      createdAt: new Date(now - 7 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "rec-002",
      meetingId: "967-093-204",
      title: "Backend Architecture Review",
      filename: "zoom_recording_2026-06-14T14-30-00.webm",
      durationSec: 4521,
      sizeMB: 61.5,
      createdAt: new Date(now - 14 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "rec-003",
      meetingId: "995-881-767",
      title: "Client Demo — Acme Corp",
      filename: "zoom_recording_2026-06-07T15-00-00.webm",
      durationSec: 2847,
      sizeMB: 38.7,
      createdAt: new Date(now - 21 * 24 * 3600 * 1000).toISOString(),
    },
  ];
}

function loadRecordings(): Recording[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(RECORDINGS_KEY);
  if (raw) {
    try { return JSON.parse(raw) as Recording[]; }
    catch { /* fall through */ }
  }
  // Seed mock recordings on first visit
  const mock = seedMockRecordings();
  localStorage.setItem(RECORDINGS_KEY, JSON.stringify(mock));
  return mock;
}

function saveRecordings(recs: Recording[]) {
  localStorage.setItem(RECORDINGS_KEY, JSON.stringify(recs));
}

// =============================================================================
//  Recording Card
// =============================================================================

function RecordingCard({
  rec,
  onDelete,
  onPlay,
}: {
  rec: Recording;
  onDelete: (id: string) => void;
  onPlay: (rec: Recording) => void;
}) {

  return (
    <div className="group bg-white rounded-2xl border border-[#E5E5E5] hover:border-[#0B5CFF]/30 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Thumbnail */}
      <div
        className="relative flex items-center justify-center bg-gradient-to-br from-[#1A1A2E] to-[#2D2D3A] cursor-pointer"
        style={{ height: "140px" }}
        onClick={() => onPlay(rec)}
      >
        {/* Decorative grid of fake video tiles */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 p-2 opacity-30">
          {["#6366f1", "#27AE60", "#D97706", "#0B5CFF"].map((c, i) => (
            <div key={i} className="rounded-lg flex items-center justify-center" style={{ backgroundColor: c + "33" }}>
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: c }} />
            </div>
          ))}
        </div>
        {/* Play overlay */}
        <div className="relative z-10 flex flex-col items-center gap-2 group/play">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/90 group-hover/play:scale-110 transition-transform shadow-lg">
            <Play className="w-5 h-5 text-[#1A1A1A] fill-[#1A1A1A] ml-0.5" />
          </div>
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 text-white text-[11px] font-mono">
          <Clock className="w-3 h-3" />
          {formatDuration(rec.durationSec)}
        </div>
        {/* REC dot */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EB5757]/80 text-white text-[10px] font-bold tracking-wider">
          <Circle className="w-2 h-2 fill-white" />
          REC
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-[14px] font-semibold text-[#1A1A1A] truncate" title={rec.title}>{rec.title}</p>
        <p className="text-[11px] font-mono text-[#ADADAD] tracking-widest mt-0.5">{rec.meetingId}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="space-y-0.5">
            <p className="text-[12px] text-[#747487]">{formatDate(rec.createdAt)}</p>
            <p className="text-[11px] text-[#ADADAD]">{formatBytes(rec.sizeMB)}</p>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                toast.success(`Downloading ${rec.filename}…`, { icon: "⬇️" });
              }}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-[#747487] hover:bg-[#EEF3FF] hover:text-[#0B5CFF] transition-colors"
              aria-label="Download"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this recording?")) onDelete(rec.id);
              }}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-[#747487] hover:bg-[#FFF5F5] hover:text-[#EB5757] transition-colors"
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
//  Playback Modal
// =============================================================================

function PlaybackModal({ rec, onClose }: { rec: Recording; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="relative w-full max-w-[760px] bg-[#1A1A2E] rounded-2xl overflow-hidden shadow-2xl modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2D2D3A]">
          <div>
            <p className="text-[15px] font-semibold text-white">{rec.title}</p>
            <p className="text-[12px] text-[#747487] font-mono mt-0.5">{rec.filename}</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#9898A6] hover:bg-[#2D2D3A] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simulated video player */}
        <div
          className="relative flex items-center justify-center bg-[#0D0D14]"
          style={{ height: "400px" }}
        >
          {/* Fake video frame with grid of participant tiles */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-2 p-4">
            {[
              { name: "Raj Kumar", color: "#0B5CFF", init: "RK" },
              { name: "Priya Sharma", color: "#6366f1", init: "PS" },
              { name: "Ankit Verma", color: "#27AE60", init: "AV" },
              { name: "Sunita Patel", color: "#D97706", init: "SP" },
            ].map((p, i) => (
              <div key={i} className="relative flex items-center justify-center bg-[#2D2D3A] rounded-xl overflow-hidden"
                style={{ background: `radial-gradient(ellipse at center, ${p.color}22 0%, #2D2D3A 70%)` }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg"
                  style={{ backgroundColor: p.color }}
                >
                  {p.init}
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                  <span className="text-[11px] text-white font-medium">{p.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* "Playback" overlay */}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/60 rounded-xl text-white text-[13px]">
              <Film className="w-4 h-4 text-[#0B5CFF]" />
              Simulated playback — no real video captured
            </div>
          </div>

          {/* Bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-[#0B5CFF] rounded-full" />
            </div>
            <span className="text-[11px] text-white/70 font-mono">{formatDuration(rec.durationSec)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#2D2D3A]">
          <div className="flex items-center gap-4 text-[12px] text-[#747487]">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDuration(rec.durationSec)}</span>
            <span>{formatBytes(rec.sizeMB)}</span>
            <span>{formatDate(rec.createdAt)}</span>
          </div>
          <button
            onClick={() => toast.success(`Downloading ${rec.filename}…`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B5CFF] hover:bg-[#0047e0] text-white text-[13px] font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
//  Main page
// =============================================================================

function RecordingsContent() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState<Recording | null>(null);

  useEffect(() => {
    setRecordings(loadRecordings());
  }, []);

  function deleteRecording(id: string) {
    const updated = recordings.filter((r) => r.id !== id);
    setRecordings(updated);
    saveRecordings(updated);
    toast.success("Recording deleted");
  }

  const filtered = recordings.filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase()) ||
    r.meetingId.includes(query)
  );

  const totalDuration = recordings.reduce((s, r) => s + r.durationSec, 0);
  const totalSize = recordings.reduce((s, r) => s + r.sizeMB, 0);

  return (
    <div className="min-h-screen bg-[#F4F4F4]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[24px] font-bold text-[#1A1A1A]">Recordings</h1>
            <p className="text-[13px] text-[#747487] mt-1">
              {recordings.length} recording{recordings.length !== 1 ? "s" : ""} · {formatDuration(totalDuration)} total · {formatBytes(totalSize)}
            </p>
          </div>
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-white border border-[#E5E5E5] rounded-xl px-3 py-2 w-full sm:w-[280px] shadow-sm">
            <Search className="w-4 h-4 text-[#ADADAD] shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recordings…"
              className="flex-1 text-[14px] text-[#1A1A1A] placeholder:text-[#ADADAD] focus:outline-none bg-transparent"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-[#ADADAD] hover:text-[#1A1A1A]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Stats strip */}
        {recordings.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Recordings", value: String(recordings.length), icon: <Video className="w-4 h-4 text-[#0B5CFF]" /> },
              { label: "Total Duration", value: formatDuration(totalDuration), icon: <Clock className="w-4 h-4 text-[#7C3AED]" /> },
              { label: "Storage Used", value: formatBytes(totalSize), icon: <Film className="w-4 h-4 text-[#27AE60]" /> },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-[#E5E5E5] px-5 py-4 flex items-center gap-4 shadow-sm">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#F5F5F5]">
                  {s.icon}
                </div>
                <div>
                  <p className="text-[18px] font-bold text-[#1A1A1A]">{s.value}</p>
                  <p className="text-[11px] text-[#747487]">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-[#E5E5E5]">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F5F5F5] mb-4">
              <Video className="w-7 h-7 text-[#ADADAD]" />
            </div>
            <p className="text-[15px] font-semibold text-[#1A1A1A]">
              {query ? "No recordings match your search" : "No recordings yet"}
            </p>
            <p className="text-[13px] text-[#747487] mt-1">
              {query ? "Try a different search term" : "Start a meeting and click Record to capture it"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((rec) => (
              <RecordingCard
                key={rec.id}
                rec={rec}
                onDelete={deleteRecording}
                onPlay={setPlaying}
              />
            ))}
          </div>
        )}
      </main>

      {playing && <PlaybackModal rec={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

export default function RecordingsPage() {
  return (
    <AuthGuard>
      <RecordingsContent />
    </AuthGuard>
  );
}
