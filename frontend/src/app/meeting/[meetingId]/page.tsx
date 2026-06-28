"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  Circle,
  Copy,
  Home,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  MicOff as MicOffSmall,
  Monitor,
  PhoneOff,
  Shield,
  Smile,
  Users,
  UserPlus,
  Video,
  VideoOff,
  X,
} from "lucide-react";

import {
  endMeeting,
  getMeeting,
  getParticipants,
  joinMeeting,
  leaveMeeting,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ChatPanel, InviteModal } from "@/components/MeetingUI";
import { RECORDINGS_KEY } from "@/lib/recordings"
import type { Meeting, Participant } from "@/types";

// =============================================================================
//  Helpers
// =============================================================================

function formatElapsed(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
}

function nameToColor(name: string): string {
  const palette = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function toInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

// =============================================================================
//  VideoTile
// =============================================================================

interface VideoTileProps {
  name: string;
  initials: string;
  color: string;
  isYou?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isHost?: boolean;
  stream?: MediaStream | null;
}

function VideoTile({ name, initials, color, isYou = false, isMuted = false, isVideoOff = false, isHost = false, stream = null }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) { el.srcObject = stream; el.play().catch(() => { }); }
    else { el.srcObject = null; }
  }, [stream]);

  return (
    <div
      className={[
        "relative flex items-center justify-center overflow-hidden select-none",
        "rounded-xl border transition-all duration-200",
        isYou
          ? "border-[#0B5CFF] shadow-[0_0_0_2px_rgba(11,92,255,0.35)]"
          : "border-[#3a3a4a] hover:border-[#4a4a5a]",
      ].join(" ")}
      style={{ backgroundColor: "#2D2D3A" }}
    >
      {stream && !isVideoOff ? (
        <video ref={videoRef} autoPlay playsInline muted={isYou} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        /* Gradient background behind avatar */
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, ${color}22 0%, transparent 70%)` }} />
      )}

      {(!stream || isVideoOff) && (
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-xl z-10"
          style={{ backgroundColor: color }}
        >
          {initials}
        </div>
      )}

      {/* Name bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between gap-1.5 z-10">
        <span className="text-[12px] font-medium text-white truncate">
          {name}
          {isYou && <span className="ml-1 text-[#4A9EFF]">(You)</span>}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {isHost && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#0B5CFF]/25">
              <Shield className="w-2.5 h-2.5 text-[#0B5CFF]" />
            </span>
          )}
          {isMuted && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#EB5757]/25">
              <MicOffSmall className="w-2.5 h-2.5 text-[#EB5757]" />
            </span>
          )}
        </div>
      </div>

      {/* Video-off overlay */}
      {isVideoOff && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl z-[5]" style={{ backgroundColor: "rgba(26,26,26,0.6)" }}>
          <VideoOff className="w-7 h-7 text-slate-500" />
        </div>
      )}
    </div>
  );
}

// =============================================================================
//  CtrlBtn — 48px circle
// =============================================================================

function CtrlBtn({
  icon,
  label,
  onClick,
  isOff = false,
  isActive = false,
  disabled = false,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isOff?: boolean;
  isActive?: boolean;
  disabled?: boolean;
  badge?: number;
}) {
  const bg = isOff ? "#EB5757" : isActive ? "#27AE60" : "#2D2D3A";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="ctrl-btn group relative flex flex-col items-center gap-[6px] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span
        className="flex items-center justify-center w-12 h-12 rounded-full text-white transition-colors duration-150"
        style={{ backgroundColor: bg }}
      >
        {icon}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 right-0 flex items-center justify-center w-4 h-4 rounded-full bg-[#0B5CFF] text-[9px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <span className="text-[10px] font-medium text-[#9898A6] group-hover:text-[#C8C8D4] transition-colors whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

// =============================================================================
//  EndBtn — red pill
// =============================================================================

function EndBtn({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      className="ctrl-btn group flex flex-col items-center gap-[6px] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span
        className="flex items-center justify-center h-12 px-5 rounded-full text-white font-semibold text-[14px]"
        style={{ backgroundColor: "#EB5757" }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : label}
      </span>
      <span className="text-[10px] font-medium text-[#9898A6] group-hover:text-[#C8C8D4] transition-colors whitespace-nowrap">
        Meeting
      </span>
    </button>
  );
}

// =============================================================================
//  ParticipantsPanel
// =============================================================================

function ParticipantsPanel({
  participants,
  currentUserId,
  onClose,
  loading,
}: {
  participants: Participant[];
  currentUserId: string | null;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <aside className="flex flex-col w-[280px] shrink-0 border-l" style={{ backgroundColor: "#1A1A2E", borderColor: "#2D2D3A" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#2D2D3A" }}>
        <h2 className="text-[14px] font-semibold text-white">
          Participants
          <span className="ml-2 text-[12px] text-[#9898A6] font-normal">({participants.length})</span>
        </h2>
        <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-lg text-[#9898A6] hover:bg-[#2D2D3A] hover:text-white transition-colors" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-[#2D2D3A] shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-[#2D2D3A] rounded w-3/4" />
              </div>
            </div>
          ))
        ) : participants.length === 0 ? (
          <p className="text-[12px] text-[#747487] text-center py-10">No participants yet</p>
        ) : (
          participants.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[#2D2D3A]/60 transition-colors">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full text-white text-[11px] font-bold shrink-0"
                style={{ backgroundColor: nameToColor(p.displayName) }}
              >
                {toInitials(p.displayName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] text-white font-medium truncate">{p.displayName}</span>
                  {currentUserId && p.userId === currentUserId && (
                    <span className="text-[10px] text-[#0B5CFF] font-medium shrink-0">(You)</span>
                  )}
                </div>
                {p.isHost && (
                  <span className="flex items-center gap-0.5 text-[10px] text-[#0B5CFF]">
                    <Shield className="w-2.5 h-2.5" /> Host
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

// =============================================================================
//  Guard screens
// =============================================================================

function MeetingNotFound({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4" style={{ backgroundColor: "#1A1A1A" }}>
      <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-[#EB5757]/10">
        <PhoneOff className="w-9 h-9 text-[#EB5757]" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white">Meeting Not Found</h1>
        <p className="text-[#747487] text-[14px]">
          No meeting with ID <span className="font-mono text-[#9898A6] tracking-widest">{meetingId}</span>
        </p>
      </div>
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B5CFF] hover:bg-[#0047e0] text-white text-[14px] font-semibold transition-colors"
      >
        <Home className="w-4 h-4" />
        Go Home
      </button>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#1A1A1A" }}>
      <Loader2 className="w-10 h-10 text-[#0B5CFF] animate-spin" />
      <p className="text-[#747487] text-[14px]">Joining meeting…</p>
    </div>
  );
}

// =============================================================================
//  Main Page
// =============================================================================

type SidePanel = "none" | "participants" | "chat";

export default function MeetingRoomPage() {
  const router = useRouter();
  const params = useParams<{ meetingId: string }>();
  const meetingId = params.meetingId;
  const { user, loading: authLoading } = useAuth();

  // ── Data ───────────────────────────────────────────────────────────────────
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "notfound">("loading");
  const [loadingParts, setLoadingParts] = useState(true);

  // ── Media controls ─────────────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [sidePanel, setSidePanel] = useState<SidePanel>("none");
  const [elapsed, setElapsed] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  // ── Recording ──────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Streams ────────────────────────────────────────────────────────────────
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const isHost = !!(user && meeting && meeting.hostId === user.id);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
  }, [screenStream]);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!meetingId || authLoading) return;

    async function init() {
      try {
        const m = await getMeeting(meetingId);
        if (m.status === "ended") {
          toast.error("This meeting has ended.");
          setLoadState("notfound");
          return;
        }

        setMeeting(m);
        const displayName = user?.name ?? "Guest";
        await joinMeeting(meetingId, { displayName });

        const parts = await getParticipants(meetingId);
        setParticipants(parts);
        setLoadingParts(false);
        setLoadState("ready");
        startTimer();

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
          setLocalStream(stream);
        } catch {
          setIsVideoOff(true);
          setIsMuted(true);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.toLowerCase().includes("not found") || msg.includes("404")) {
          setLoadState("notfound");
        } else {
          toast.error(msg || "Failed to join meeting");
          setLoadState("notfound");
        }
      }
    }

    init();
  }, [meetingId, authLoading, user?.name, startTimer]);

  // ── Sync audio/video tracks ────────────────────────────────────────────────
  useEffect(() => { localStream?.getAudioTracks().forEach((t) => { t.enabled = !isMuted; }); }, [isMuted, localStream]);
  useEffect(() => { localStream?.getVideoTracks().forEach((t) => { t.enabled = !isVideoOff; }); }, [isVideoOff, localStream]);

  // ── Copy invite link ───────────────────────────────────────────────────────
  function copyLink() {
    if (!meeting) return;
    navigator.clipboard.writeText(meeting.inviteLink).then(() => toast.success("Invite link copied!"));
  }

  // ── Leave / End ────────────────────────────────────────────────────────────
  async function handleLeaveOrEnd() {
    setLeaving(true);
    const tid = toast.loading(isHost ? "Ending meeting…" : "Leaving meeting…");
    try {
      if (isHost) {
        await endMeeting(meetingId);
        toast.success("Meeting ended", { id: tid });
      } else if (user) {
        await leaveMeeting(meetingId);
        toast.success("You left the meeting", { id: tid });
      } else {
        toast.success("You left the meeting", { id: tid });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed", { id: tid });
      setLeaving(false);
      return;
    } finally {
      stopRecording();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStream?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      router.push(user ? "/" : "/login");
    }
  }

  // ── Refresh participants ───────────────────────────────────────────────────
  async function refreshParticipants() {
    setLoadingParts(true);
    try { setParticipants(await getParticipants(meetingId)); }
    catch { /* keep stale */ }
    finally { setLoadingParts(false); }
  }

  function togglePanel(panel: SidePanel) {
    setSidePanel((prev) => {
      const next = prev === panel ? "none" : panel;
      if (next === "participants") refreshParticipants();
      return next;
    });
  }

  // ── Screen share ───────────────────────────────────────────────────────────
  async function toggleScreenShare() {
    if (isSharing) {
      screenStream?.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setIsSharing(false);
      toast.success("Screen sharing stopped");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setScreenStream(null);
        setIsSharing(false);
      });
      setScreenStream(stream);
      setIsSharing(true);
      toast.success("You are sharing your screen");
    } catch {
      toast.error("Screen sharing was cancelled or not supported");
    }
  }

  // ── Reactions ──────────────────────────────────────────────────────────────
  const REACTIONS = ["👍", "👏", "😂", "❤️", "🎉", "🔥", "💯", "🙌"];
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  function sendReaction(emoji: string) {
    setReaction(emoji);
    toast(emoji, { duration: 1500 });
    setTimeout(() => setReaction(null), 2500);
    setShowReactionPicker(false);
  }

  // ── Recording (simulated) ──────────────────────────────────────────────────
  function startRecording() {
    setIsRecording(true);
    setRecSeconds(0);
    recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    toast.success("Recording started");
  }

  function stopRecording() {
    if (!isRecording) return;
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setIsRecording(false);

    const ts = new Date().toISOString();
    const tsSafe = ts.replace(/[:.]/g, "-").slice(0, 19);
    const filename = `zoom_recording_${tsSafe}.webm`;
    const durationSec = recSeconds;

    // Persist to localStorage so /recordings page can display it
    const newRec = {
      id: `rec-${Date.now()}`,
      meetingId: meetingId,
      title: meeting?.title ?? "Meeting Recording",
      filename,
      durationSec,
      sizeMB: parseFloat((durationSec * 0.015).toFixed(1)), // ~15 KB/s estimate
      createdAt: ts,
    };
    try {
      const raw = localStorage.getItem(RECORDINGS_KEY);
      const recs = raw ? JSON.parse(raw) : [];
      localStorage.setItem(RECORDINGS_KEY, JSON.stringify([newRec, ...recs]));
    } catch { /* ignore storage errors */ }

    toast(
      (t) => (
        <span className="flex items-center gap-2">
          Recording saved!
          <button
            onClick={() => { window.location.href = "/recordings"; toast.dismiss(t.id); }}
            className="ml-1 font-semibold text-[#0B5CFF] hover:underline"
          >
            View
          </button>
        </span>
      ),
      { duration: 6000, icon: "🎬" }
    );
  }

  function toggleRecording() {
    if (isRecording) stopRecording();
    else startRecording();
  }

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (authLoading || loadState === "loading") return <LoadingScreen />;
  if (loadState === "notfound") return <MeetingNotFound meetingId={meetingId} />;

  // ── Video grid ─────────────────────────────────────────────────────────────
  const gridTiles = participants.map((p) => {
    const isYou = !!(user && p.userId === user.id);
    return {
      key: p.id,
      name: p.displayName,
      initials: toInitials(p.displayName),
      color: isYou ? "#0B5CFF" : nameToColor(p.displayName),
      isYou,
      isMuted: isYou ? isMuted : false,
      isVideoOff: isYou ? isVideoOff : false,
      isHost: p.isHost,
      stream: isYou ? (screenStream ?? localStream) : null,
    };
  });

  while (gridTiles.length < 4) {
    gridTiles.push({
      key: `empty-${gridTiles.length}`,
      name: "Waiting…",
      initials: "…",
      color: "#3a3a4a",
      isYou: false,
      isMuted: false,
      isVideoOff: true,
      isHost: false,
      stream: null,
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: "#1A1A1A" }}>

      {/* ═══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <header
        className="flex items-center justify-between shrink-0 px-4 z-10 border-b"
        style={{ backgroundColor: "#1A1A2E", height: "56px", borderColor: "#2D2D3A" }}
      >
        {/* Left: title + REC badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0" style={{ backgroundColor: "rgba(11,92,255,0.15)" }}>
            <Video className="w-4 h-4 text-[#0B5CFF]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[14px] font-semibold text-white truncate leading-tight">{meeting?.title ?? "Meeting"}</h1>
            <p className="text-[11px] text-[#747487] capitalize">{meeting?.status ?? "active"}</p>
          </div>

          {/* REC badge */}
          {isRecording && (
            <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-lg bg-[#EB5757]/15 border border-[#EB5757]/30">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EB5757] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EB5757]" />
              </span>
              <span className="text-[11px] font-bold text-[#EB5757] tracking-wider">
                REC {formatElapsed(recSeconds)}
              </span>
            </div>
          )}
        </div>

        {/* Center: Meeting ID */}
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <span
            className="text-[12px] font-mono text-[#9898A6] px-3 py-1.5 rounded-lg border"
            style={{ backgroundColor: "#252535", borderColor: "#3a3a4a", letterSpacing: "0.15em" }}
          >
            {meetingId}
          </span>
          <button
            onClick={copyLink}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[#9898A6] hover:bg-[#2D2D3A] hover:text-white transition-colors"
            aria-label="Copy meeting ID"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Invite + timer */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Invite button */}
          {meeting && (
            <button
              onClick={() => setShowInvite(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3a3a4a] text-[#9898A6] hover:bg-[#2D2D3A] hover:text-white text-[12px] font-medium transition-colors"
              title="Invite people"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Invite
            </button>
          )}

          {/* Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border" style={{ backgroundColor: "#252535", borderColor: "#3a3a4a" }}>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EB5757] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EB5757]" />
            </span>
            <span className="text-[12px] font-mono font-medium text-white tabular-nums min-w-[38px]">
              {formatElapsed(elapsed)}
            </span>
          </div>
        </div>
      </header>

      {/* ═══ BODY ═════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Floating reaction */}
        {reaction && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 text-5xl animate-bounce pointer-events-none select-none">
            {reaction}
          </div>
        )}

        {/* Reaction picker popover */}
        {showReactionPicker && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowReactionPicker(false)} />
            <div
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 flex gap-2 p-3 rounded-2xl border shadow-2xl modal-enter"
              style={{ backgroundColor: "#252535", borderColor: "#3a3a4a" }}
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-2xl hover:scale-125 transition-transform duration-100 p-1 rounded-lg hover:bg-[#2D2D3A]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Video grid */}
        <main className="flex-1 p-3 overflow-hidden">
          <div className="h-full grid grid-cols-2 grid-rows-2 gap-2.5">
            {gridTiles.slice(0, 4).map((tile) => (
              <VideoTile
                key={tile.key}
                name={tile.name}
                initials={tile.initials}
                color={tile.color}
                isYou={tile.isYou}
                isMuted={tile.isMuted}
                isVideoOff={tile.isVideoOff}
                isHost={tile.isHost}
                stream={tile.stream}
              />
            ))}
          </div>
        </main>

        {/* Side panels */}
        {sidePanel === "participants" && (
          <ParticipantsPanel
            participants={participants}
            currentUserId={user?.id ?? null}
            onClose={() => setSidePanel("none")}
            loading={loadingParts}
          />
        )}
        {sidePanel === "chat" && (
          <ChatPanel
            myName={user?.name ?? "You"}
            onClose={() => setSidePanel("none")}
          />
        )}
      </div>

      {/* ═══ CONTROL BAR — 72px ══════════════════════════════════════════════ */}
      <footer
        className="shrink-0 flex items-center justify-center gap-2 sm:gap-3 px-4 border-t"
        style={{ backgroundColor: "#1A1A2E", height: "72px", borderColor: "#2D2D3A" }}
      >
        {/* Mute */}
        <CtrlBtn
          icon={isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          label={isMuted ? "Unmute" : "Mute"}
          onClick={() => setIsMuted((v) => !v)}
          isOff={isMuted}
        />

        {/* Video */}
        <CtrlBtn
          icon={isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          label={isVideoOff ? "Start Video" : "Stop Video"}
          onClick={() => setIsVideoOff((v) => !v)}
          isOff={isVideoOff}
        />

        {/* Participants */}
        <CtrlBtn
          icon={<Users className="w-5 h-5" />}
          label="Participants"
          onClick={() => togglePanel("participants")}
          isActive={sidePanel === "participants"}
          badge={participants.length}
        />

        {/* Chat */}
        <CtrlBtn
          icon={<MessageSquare className="w-5 h-5" />}
          label="Chat"
          onClick={() => togglePanel("chat")}
          isActive={sidePanel === "chat"}
        />

        {/* Share Screen */}
        <CtrlBtn
          icon={<Monitor className="w-5 h-5" />}
          label={isSharing ? "Stop Share" : "Share Screen"}
          onClick={toggleScreenShare}
          isOff={isSharing}
        />

        {/* React */}
        <CtrlBtn
          icon={<Smile className="w-5 h-5" />}
          label="React"
          onClick={() => setShowReactionPicker((v) => !v)}
          isActive={showReactionPicker}
        />

        {/* Record */}
        <CtrlBtn
          icon={
            isRecording
              ? <Circle className="w-5 h-5 fill-[#EB5757] text-[#EB5757]" />
              : <Circle className="w-5 h-5" />
          }
          label={isRecording ? "Stop Rec" : "Record"}
          onClick={toggleRecording}
          isOff={isRecording}
        />

        <div className="w-px h-10 mx-1" style={{ backgroundColor: "#3a3a4a" }} role="separator" />

        {/* End / Leave */}
        <EndBtn
          onClick={handleLeaveOrEnd}
          loading={leaving}
          label={isHost ? "End" : "Leave"}
        />
      </footer>

      {/* Invite modal */}
      {showInvite && meeting && (
        <InviteModal
          info={{ meetingId: meeting.meetingId, title: meeting.title, inviteLink: meeting.inviteLink }}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
