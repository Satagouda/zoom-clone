"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  CalendarPlus,
  ChevronRight,
  Clock,
  LogIn,
  Monitor,
  Play,
  Plus,
  Users,
  Video,
  Sparkles,
} from "lucide-react";

import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import {
  formatDateOnly,
  formatDateTime,
  InviteButton,
  JoinMeetingModal,
  ScheduleMeetingModal,
  StatusBadge,
} from "@/components/MeetingUI";
import {
  createInstantMeeting,
  getUpcomingMeetings,
  getRecentMeetings,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Meeting } from "@/types";

// =============================================================================
//  Greeting helpers
// =============================================================================

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// =============================================================================
//  ActionCard — 160×160
// =============================================================================

function ActionCard({
  icon,
  label,
  sublabel,
  bg,
  textColor = "#1A1A1A",
  onClick,
  disabled,
  isOrange,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  bg: string;
  textColor?: string;
  onClick: () => void;
  disabled?: boolean;
  isOrange?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "action-card-hover group relative overflow-hidden",
        "flex flex-col items-center justify-center gap-3",
        "rounded-2xl border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        "w-[160px] h-[160px] mx-auto",
        isOrange
          ? "border-transparent shadow-[0_4px_20px_rgba(255,107,0,0.25)]"
          : "bg-white border-[#E5E5E5] shadow-sm",
      ].join(" ")}
      style={isOrange ? { background: bg } : undefined}
    >
      <span
        className={[
          "flex items-center justify-center w-10 h-10 rounded-xl",
          isOrange ? "bg-white/20" : "",
        ].join(" ")}
        style={!isOrange ? { backgroundColor: bg, color: "#fff" } : { color: "#fff" }}
      >
        {icon}
      </span>
      <div className="flex flex-col items-center gap-0.5">
        <span
          className="text-[14px] font-semibold leading-tight"
          style={{ color: isOrange ? "#fff" : textColor }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            className="text-[11px] leading-tight opacity-70"
            style={{ color: isOrange ? "#fff" : "#747487" }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </button>
  );
}

// =============================================================================
//  UpcomingCard — with Invite button
// =============================================================================

function UpcomingCard({ meeting }: { meeting: Meeting }) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 bg-white rounded-xl border border-[#E5E5E5] hover:border-[#0B5CFF]/30 hover:shadow-sm transition-all duration-150 group">
      {/* Date block */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-[#EEF3FF] shrink-0">
          <span className="text-[9px] font-semibold text-[#0B5CFF] uppercase leading-none tracking-wide">
            {meeting.scheduledAt
              ? new Date(meeting.scheduledAt).toLocaleString("en-US", { month: "short" })
              : "Now"}
          </span>
          <span className="text-[18px] font-bold text-[#0B5CFF] leading-tight">
            {meeting.scheduledAt ? new Date(meeting.scheduledAt).getDate() : "—"}
          </span>
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-[#1A1A1A] text-[14px] truncate">{meeting.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[12px] text-[#747487]">
              <Clock className="w-3 h-3 shrink-0" />
              {formatDateTime(meeting.scheduledAt)}
            </span>
            <span className="text-[#D1D5DB]">·</span>
            <span className="text-[12px] text-[#747487]">{meeting.durationMinutes} min</span>
          </div>
          <p className="text-[11px] text-[#ADADAD] mt-0.5 font-mono tracking-widest">{meeting.meetingId}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Invite button */}
        <InviteButton info={{ meetingId: meeting.meetingId, title: meeting.title, inviteLink: meeting.inviteLink }} />

        {/* Start button */}
        <button
          onClick={() => router.push(`/meeting/${meeting.meetingId}`)}
          className="flex items-center gap-1.5 rounded-lg bg-[#0B5CFF] hover:bg-[#0047e0] text-white text-[12px] font-semibold px-3 py-1.5 transition-colors"
        >
          <Play className="w-2.5 h-2.5 fill-white" />
          Start
        </button>
      </div>
    </div>
  );
}

// =============================================================================
//  RecentRow
// =============================================================================

function RecentRow({ meeting }: { meeting: Meeting }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/meeting/${meeting.meetingId}`)}
      className="w-full flex items-center justify-between gap-3 py-3 border-b border-[#F5F5F5] last:border-0 group text-left hover:bg-[#FAFAFA] rounded-lg px-1 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#F5F5F5] group-hover:bg-[#EEF3FF] shrink-0 transition-colors">
          <Video className="w-4 h-4 text-[#ADADAD] group-hover:text-[#0B5CFF] transition-colors" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{meeting.title}</p>
          <p className="text-[11px] text-[#747487]">{formatDateOnly(meeting.createdAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="hidden sm:flex items-center gap-1 text-[12px] text-[#747487]">
          <Users className="w-3.5 h-3.5" />
          {meeting.participantCount ?? "—"}
        </span>
        <StatusBadge status={meeting.status} />
        <ChevronRight className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#747487] transition-colors" />
      </div>
    </button>
  );
}

// =============================================================================
//  Skeletons
// =============================================================================

function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 bg-white rounded-xl border border-[#E5E5E5] animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-[#F5F5F5] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-[#F5F5F5] rounded w-3/5" />
        <div className="h-2.5 bg-[#F5F5F5] rounded w-2/5" />
      </div>
      <div className="w-14 h-7 bg-[#F5F5F5] rounded-lg" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 animate-pulse">
      <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 bg-[#F5F5F5] rounded w-1/2" />
        <div className="h-2 bg-[#F5F5F5] rounded w-1/4" />
      </div>
      <div className="w-12 h-4 bg-[#F5F5F5] rounded-full" />
    </div>
  );
}

// =============================================================================
//  Main dashboard content
// =============================================================================

type ModalState = "none" | "join" | "schedule";

function DashboardContent() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [modal, setModal] = useState<ModalState>("none");
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [creatingMeeting, setCreatingMeeting] = useState(false);

  const fetchUpcoming = useCallback(async () => {
    setLoadingUpcoming(true);
    try { setUpcoming(await getUpcomingMeetings()); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed to load upcoming meetings"); }
    finally { setLoadingUpcoming(false); }
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoadingRecent(true);
    try { setRecent(await getRecentMeetings()); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed to load recent meetings"); }
    finally { setLoadingRecent(false); }
  }, []);

  useEffect(() => {
    if (!ready) return;
    fetchUpcoming();
    fetchRecent();
  }, [ready, fetchUpcoming, fetchRecent]);

  async function handleNewMeeting() {
    setCreatingMeeting(true);
    const tid = toast.loading("Starting meeting…");
    try {
      const m = await createInstantMeeting({ title: "Instant Meeting" });
      toast.success("Meeting started!", { id: tid });
      router.push(`/meeting/${m.meetingId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create meeting", { id: tid });
      setCreatingMeeting(false);
    }
  }

  const closeModal = useCallback(() => setModal("none"), []);

  // Quick stats
  const totalParticipants = recent.reduce((s, m) => s + (m.participantCount ?? 0), 0);
  const meetingsThisWeek = recent.filter((m) => {
    const d = new Date(m.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }).length;

  return (
    <div className="min-h-screen bg-[#F4F4F4]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Greeting banner ────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#0B5CFF] to-[#5B8FFF] rounded-2xl px-6 py-5 flex items-center justify-between shadow-[0_4px_24px_rgba(11,92,255,0.25)]">
          <div>
            <p className="text-[13px] text-blue-200 font-medium">{getTodayLabel()}</p>
            <h1 className="text-[22px] font-bold text-white mt-0.5">
              {getGreeting()}, {user?.name?.split(" ")[0] ?? "there"} 👋
            </h1>
            <p className="text-[13px] text-blue-100 mt-1">
              Ready to connect? Your next meeting is waiting.
            </p>
          </div>
          {/* Quick stats */}
          {!loadingRecent && (
            <div className="hidden md:flex items-center gap-6 text-right shrink-0">
              <div>
                <p className="text-[22px] font-bold text-white">{meetingsThisWeek}</p>
                <p className="text-[11px] text-blue-200">meetings this week</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <p className="text-[22px] font-bold text-white">{totalParticipants}</p>
                <p className="text-[11px] text-blue-200">total participants</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Action cards ───────────────────────────────────────────────── */}
        <section aria-label="Quick actions">
          <h2 className="text-[13px] font-semibold text-[#747487] uppercase tracking-wide mb-4 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Quick Actions
          </h2>
          <div className="flex flex-wrap gap-4">
            <ActionCard
              icon={<Video className="w-6 h-6" />}
              label="New Meeting"
              sublabel="Start instantly"
              bg="linear-gradient(135deg, #FF6B00 0%, #FF8C38 100%)"
              onClick={handleNewMeeting}
              disabled={creatingMeeting}
              isOrange
            />
            <ActionCard
              icon={<LogIn className="w-6 h-6" />}
              label="Join"
              sublabel="Enter a code"
              bg="#0B5CFF"
              onClick={() => setModal("join")}
            />
            <ActionCard
              icon={<CalendarPlus className="w-6 h-6" />}
              label="Schedule"
              sublabel="Plan ahead"
              bg="#7C3AED"
              onClick={() => setModal("schedule")}
            />
            <ActionCard
              icon={<Monitor className="w-6 h-6" />}
              label="Share Screen"
              sublabel="Present now"
              bg="#27AE60"
              onClick={() => toast("Use Share Screen inside a meeting room", { icon: "🖥️" })}
            />
          </div>
        </section>

        {/* ── Upcoming + Recent ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Upcoming */}
          <section
            className="lg:col-span-3 bg-white rounded-2xl border border-[#E5E5E5] shadow-sm p-6"
            aria-label="Upcoming meetings"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Upcoming</h2>
                {!loadingUpcoming && (
                  <p className="text-[12px] text-[#747487] mt-0.5">
                    {upcoming.length === 0 ? "No scheduled meetings" : `${upcoming.length} meeting${upcoming.length !== 1 ? "s" : ""} scheduled`}
                  </p>
                )}
              </div>
              <button
                onClick={() => setModal("schedule")}
                className="flex items-center gap-1 text-[12px] font-medium text-[#0B5CFF] hover:bg-[#EEF3FF] rounded-lg px-2.5 py-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
            </div>

            {loadingUpcoming ? (
              <div className="space-y-2.5">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
            ) : upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#EEF3FF] mb-4">
                  <CalendarPlus className="w-7 h-7 text-[#0B5CFF]" />
                </div>
                <p className="text-[14px] font-medium text-[#1A1A1A]">No upcoming meetings</p>
                <p className="text-[12px] text-[#747487] mt-1">Schedule one to get started</p>
                <button
                  onClick={() => setModal("schedule")}
                  className="mt-4 text-[12px] font-semibold text-[#0B5CFF] hover:underline"
                >
                  + Schedule a meeting
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcoming.map((m) => <UpcomingCard key={m.id} meeting={m} />)}
              </div>
            )}
          </section>

          {/* Recent */}
          <section
            className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E5E5] shadow-sm p-6"
            aria-label="Recent meetings"
          >
            <div className="mb-5">
              <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Recent</h2>
              {!loadingRecent && (
                <p className="text-[12px] text-[#747487] mt-0.5">
                  {recent.length === 0 ? "No past meetings" : `Last ${Math.min(recent.length, 10)} meetings`}
                </p>
              )}
            </div>

            {loadingRecent ? (
              <div>{[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}</div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F5F5F5] mb-4">
                  <Clock className="w-7 h-7 text-[#ADADAD]" />
                </div>
                <p className="text-[14px] font-medium text-[#1A1A1A]">No recent meetings</p>
                <p className="text-[12px] text-[#747487] mt-1">Meetings you host will appear here</p>
              </div>
            ) : (
              <div>{recent.map((m) => <RecentRow key={m.id} meeting={m} />)}</div>
            )}
          </section>
        </div>
      </main>

      {/* Modals */}
      {modal === "join" && <JoinMeetingModal onClose={closeModal} defaultName={user?.name ?? ""} />}
      {modal === "schedule" && <ScheduleMeetingModal onClose={closeModal} onScheduled={fetchUpcoming} />}
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
