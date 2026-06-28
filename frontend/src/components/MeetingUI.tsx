"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  CalendarPlus,
  Check,
  Copy,
  Link2,
  Loader2,
  LogIn,
  MessageSquare,
  Send,
  Shield,
  UserPlus,
  X,
} from "lucide-react";

import { joinMeeting, scheduleMeeting } from "@/lib/api";
import type { MeetingStatus } from "@/types";

// =============================================================================
//  Formatting helpers
// =============================================================================

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
    hour:    "numeric",
    minute:  "2-digit",
    hour12:  true,
  });
}

export function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

// =============================================================================
//  StatusBadge
// =============================================================================

export function StatusBadge({ status }: { status: MeetingStatus }) {
  const cls: Record<MeetingStatus, string> = {
    ended:   "badge-ended",
    active:  "badge-active",
    waiting: "badge-waiting",
  };
  const text: Record<MeetingStatus, string> = {
    ended:   "Ended",
    active:  "Live",
    waiting: "Upcoming",
  };
  return <span className={cls[status]}>{text[status]}</span>;
}

// =============================================================================
//  Shared input / button styles
// =============================================================================

export const inputCls = [
  "w-full rounded-xl border border-[#E5E5E5] bg-[#F7F7F7] px-3.5 py-2.5",
  "text-[14px] text-[#1A1A1A] placeholder:text-[#ADADAD]",
  "focus:outline-none focus:ring-2 focus:ring-[#0B5CFF]/25 focus:border-[#0B5CFF]",
  "transition-all duration-150",
].join(" ");

export const primaryBtn = [
  "w-full flex items-center justify-center gap-2 rounded-xl",
  "bg-[#0B5CFF] hover:bg-[#0047e0] active:bg-[#003ccc]",
  "text-white font-semibold text-[14px] py-2.5 transition-colors",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

// =============================================================================
//  Modal primitives
// =============================================================================

function ModalBackdrop({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop" onClick={onClose} role="presentation" />;
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ title, onClose, children, maxWidth = "max-w-[440px]" }: ModalProps) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <>
      <ModalBackdrop onClose={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className={`modal-enter bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full ${maxWidth}`}>
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#E5E5E5]">
            <h2 id="modal-title" className="text-[17px] font-semibold text-[#1A1A1A]">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-[#747487] hover:bg-[#F5F5F5] hover:text-[#1A1A1A] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-[#1A1A1A]">{label}</label>
      {children}
    </div>
  );
}

// =============================================================================
//  CopyField — labelled row with a copy button
// =============================================================================

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(`${label} copied!`);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-[#747487] uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl px-3.5 py-2.5">
        <span className="flex-1 text-[13px] text-[#1A1A1A] font-mono truncate">{value}</span>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-[#747487] hover:bg-[#E5E5E5] hover:text-[#0B5CFF] transition-colors shrink-0"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#27AE60]" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
//  InviteModal — shown from dashboard UpcomingCard OR meeting room header
// =============================================================================

export interface InviteInfo {
  meetingId:   string;
  title:       string;
  inviteLink:  string;
}

export function InviteModal({ info, onClose }: { info: InviteInfo; onClose: () => void }) {
  const joinUrl = `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/meeting/${info.meetingId}`;

  function copyAll() {
    const text =
      `You're invited to: ${info.title}\n` +
      `Meeting ID: ${info.meetingId}\n` +
      `Join link:  ${joinUrl}`;
    navigator.clipboard.writeText(text).then(() => toast.success("Invite details copied!"));
  }

  return (
    <Modal title="Invite People" onClose={onClose}>
      <div className="flex flex-col gap-5">
        {/* Meeting title */}
        <div className="flex items-center gap-3 p-3 bg-[#EEF3FF] rounded-xl">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#0B5CFF]/10 shrink-0">
            <Shield className="w-4 h-4 text-[#0B5CFF]" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{info.title}</p>
            <p className="text-[11px] text-[#747487]">Secured meeting</p>
          </div>
        </div>

        {/* Copy fields */}
        <CopyField label="Meeting ID" value={info.meetingId} />
        <CopyField label="Join Link"  value={joinUrl} />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#E5E5E5]" />
          <span className="text-[11px] text-[#ADADAD] font-medium">or</span>
          <div className="flex-1 h-px bg-[#E5E5E5]" />
        </div>

        {/* Copy all details button */}
        <button
          onClick={copyAll}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-[#0B5CFF] text-[#0B5CFF] font-semibold text-[14px] hover:bg-[#EEF3FF] transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Copy Invite Details
        </button>

        {/* Info */}
        <p className="text-center text-[11px] text-[#ADADAD]">
          Anyone with the link can join this meeting
        </p>
      </div>
    </Modal>
  );
}

// =============================================================================
//  InviteButton — small trigger used on dashboard cards
// =============================================================================

export function InviteButton({ info }: { info: InviteInfo }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[#747487] hover:bg-[#F5F5F5] hover:text-[#0B5CFF] transition-colors"
        aria-label="Invite people"
        title="Invite people"
      >
        <UserPlus className="w-3.5 h-3.5" />
      </button>
      {open && <InviteModal info={info} onClose={() => setOpen(false)} />}
    </>
  );
}

// =============================================================================
//  JoinMeetingModal
// =============================================================================

export function JoinMeetingModal({
  onClose,
  defaultName = "",
  defaultCode = "",
  inviteLink,
}: {
  onClose: () => void;
  defaultName?: string;
  defaultCode?: string;
  inviteLink?: string;
}) {
  const router = useRouter();
  const [code, setCode]       = useState(defaultCode);
  const [name, setName]       = useState(defaultName);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setCode(defaultCode); }, [defaultCode]);
  useEffect(() => { setName(defaultName); }, [defaultName]);

  async function handleJoin() {
    if (!code.trim()) { toast.error("Please enter a Meeting ID"); return; }
    if (!name.trim()) { toast.error("Please enter your name");   return; }
    setLoading(true);
    try {
      const res = await joinMeeting(code.trim(), { displayName: name.trim(), inviteLink });
      toast.success("Joining meeting…");
      onClose();
      router.push(`/meeting/${res.meeting.meetingId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join meeting");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Join a Meeting" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Meeting ID">
          <input
            className={`${inputCls} font-mono tracking-wider`}
            placeholder="e.g. 123-456-789"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            autoFocus
          />
        </Field>
        <Field label="Your Name">
          <input
            className={inputCls}
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <button onClick={handleJoin} disabled={loading} className={`mt-1 ${primaryBtn}`}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          {loading ? "Joining…" : "Join Meeting"}
        </button>
      </div>
    </Modal>
  );
}

// =============================================================================
//  ScheduleMeetingForm + Modal
// =============================================================================

const DURATION_OPTIONS = [30, 60, 90, 120] as const;

export function ScheduleMeetingForm({
  onSuccess,
  onCancel,
  showCancel = false,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}) {
  const [title, setTitle]           = useState("");
  const [description, setDesc]      = useState("");
  const [date, setDate]             = useState("");
  const [time, setTime]             = useState("10:00");
  const [duration, setDuration]     = useState<number>(60);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    setDate(t.toISOString().split("T")[0]);
  }, []);

  async function handleSchedule() {
    if (!title.trim()) { toast.error("Please enter a meeting title"); return; }
    if (!date)         { toast.error("Please select a date");          return; }
    const localDate = new Date(`${date}T${time}:00`);
    if (localDate <= new Date()) { toast.error("Please choose a future date and time"); return; }
    setLoading(true);
    try {
      await scheduleMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt: localDate.toISOString(),
        durationMinutes: duration,
        type: "scheduled",
      });
      toast.success("Meeting scheduled!");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule meeting");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Title">
        <input className={inputCls} placeholder="e.g. Team Standup" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </Field>
      <Field label="Description (optional)">
        <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Add meeting agenda…" value={description} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
        </Field>
        <Field label="Time">
          <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="Duration">
        <select className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
          {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
        </select>
      </Field>
      <div className={showCancel ? "grid grid-cols-2 gap-3 mt-1" : "mt-1"}>
        {showCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#E5E5E5] text-[#1A1A1A] font-semibold text-[14px] py-2.5 hover:bg-[#F5F5F5] transition-colors"
          >
            Cancel
          </button>
        )}
        <button onClick={handleSchedule} disabled={loading} className={primaryBtn}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
          {loading ? "Scheduling…" : "Schedule Meeting"}
        </button>
      </div>
    </div>
  );
}

export function ScheduleMeetingModal({
  onClose,
  onScheduled,
}: {
  onClose: () => void;
  onScheduled: () => void;
}) {
  return (
    <Modal title="Schedule a Meeting" onClose={onClose}>
      <ScheduleMeetingForm onSuccess={() => { onScheduled(); onClose(); }} />
    </Modal>
  );
}

// =============================================================================
//  ChatPanel — used in the meeting room right sidebar
// =============================================================================

interface ChatMessage {
  id:     string;
  sender: string;
  text:   string;
  time:   string;
  isYou:  boolean;
}

function formatChatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

const SEED_MESSAGES: ChatMessage[] = [
  { id: "1", sender: "Priya Sharma",  text: "Hi everyone, can you all see my screen?",        time: "9:01 AM", isYou: false },
  { id: "2", sender: "Ankit Verma",   text: "Yes! Loud and clear.",                            time: "9:02 AM", isYou: false },
  { id: "3", sender: "Raj Kumar",     text: "Great, let's get started. Sharing agenda now.",   time: "9:03 AM", isYou: true  },
  { id: "4", sender: "Sunita Patel",  text: "Can we revisit the Q3 targets before we close?",  time: "9:05 AM", isYou: false },
  { id: "5", sender: "Ankit Verma",   text: "👍 Agreed",                                       time: "9:06 AM", isYou: false },
];

function nameToColor(name: string): string {
  const palette = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function toInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

export function ChatPanel({
  myName,
  onClose,
}: {
  myName: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [draft, setDraft]       = useState("");
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id:     String(Date.now()),
        sender: myName || "You",
        text,
        time:   formatChatTime(new Date()),
        isYou:  true,
      },
    ]);
    setDraft("");
  }

  return (
    <aside
      className="flex flex-col w-[280px] shrink-0 border-l"
      style={{ backgroundColor: "#1A1A2E", borderColor: "#2D2D3A" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#2D2D3A" }}>
        <h2 className="text-[14px] font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#0B5CFF]" />
          Chat
        </h2>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-[#9898A6] hover:bg-[#2D2D3A] hover:text-white transition-colors"
          aria-label="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.isYou ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            {!msg.isYou && (
              <div
                className="flex items-center justify-center w-7 h-7 rounded-full text-white text-[10px] font-bold shrink-0 self-end"
                style={{ backgroundColor: nameToColor(msg.sender) }}
              >
                {toInitials(msg.sender)}
              </div>
            )}

            {/* Bubble */}
            <div className={`max-w-[80%] ${msg.isYou ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
              {!msg.isYou && (
                <span className="text-[10px] text-[#9898A6] px-1">{msg.sender}</span>
              )}
              <div
                className={`px-3 py-2 rounded-2xl text-[13px] leading-snug ${
                  msg.isYou
                    ? "bg-[#0B5CFF] text-white rounded-br-sm"
                    : "bg-[#2D2D3A] text-[#E0E0EA] rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[9px] text-[#747487] px-1">{msg.time}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t" style={{ borderColor: "#2D2D3A" }}>
        <div className="flex items-center gap-2 bg-[#252535] rounded-xl px-3 py-2 border" style={{ borderColor: "#3a3a4a" }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Message everyone…"
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-[#747487] focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!draft.trim()}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0B5CFF] text-white disabled:opacity-40 hover:bg-[#0047e0] transition-colors shrink-0"
            aria-label="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
