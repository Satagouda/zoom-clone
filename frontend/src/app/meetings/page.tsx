"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CalendarPlus, Clock, Copy, Play, Video } from "lucide-react";

import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { formatDateTime, StatusBadge } from "@/components/MeetingUI";
import { getRecentMeetings, getUpcomingMeetings } from "@/lib/api";
import type { Meeting } from "@/types";

function MeetingsContent() {
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "recent">("upcoming");
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([getUpcomingMeetings(), getRecentMeetings()]);
      setUpcoming(u);
      setRecent(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const meetings = tab === "upcoming" ? upcoming : recent;

  return (
    <div className="min-h-screen bg-[#F4F4F4]">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[22px] font-bold text-[#1A1A1A]">My Meetings</h1>
          <button
            onClick={() => router.push("/schedule")}
            className="flex items-center gap-2 rounded-xl bg-[#0B5CFF] hover:bg-[#0047e0] text-white text-[13px] font-semibold px-4 py-2 transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            Schedule
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {(["upcoming", "recent"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={[
                "rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors",
                tab === key
                  ? "bg-[#0B5CFF] text-white"
                  : "bg-white text-[#747487] border border-[#E5E5E5] hover:text-[#1A1A1A]",
              ].join(" ")}
            >
              {key === "upcoming" ? "Upcoming" : "Recent"}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm p-4">
          {loading ? (
            <div className="py-16 text-center text-[#747487] text-[14px]">Loading meetings…</div>
          ) : meetings.length === 0 ? (
            <div className="py-16 text-center">
              <Video className="w-10 h-10 text-[#ADADAD] mx-auto mb-3" />
              <p className="text-[14px] font-medium text-[#1A1A1A]">No {tab} meetings</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F5F5F5]">
              {meetings.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1A1A1A] truncate">{m.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-[12px] text-[#747487]">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDateTime(m.scheduledAt ?? m.createdAt)}
                      <span>·</span>
                      <span className="font-mono tracking-wider">{m.meetingId}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={m.status} />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(m.inviteLink);
                        toast.success("Invite link copied!");
                      }}
                      className="p-2 rounded-lg text-[#747487] hover:bg-[#F5F5F5]"
                      aria-label="Copy invite link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {m.status !== "ended" && (
                      <button
                        onClick={() => router.push(`/meeting/${m.meetingId}`)}
                        className="flex items-center gap-1 rounded-lg bg-[#0B5CFF] hover:bg-[#0047e0] text-white text-[12px] font-semibold px-3 py-1.5"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        Open
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function MeetingsPage() {
  return (
    <AuthGuard>
      <MeetingsContent />
    </AuthGuard>
  );
}
