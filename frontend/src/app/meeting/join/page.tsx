"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, LogIn, Video } from "lucide-react";

import { getMeetingByInvite, joinMeeting } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { inputCls, primaryBtn } from "@/components/MeetingUI";

function JoinByInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? "";
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user?.name]);

  useEffect(() => {
    if (!inviteToken) {
      setError("Missing invite token in the link.");
      setLoading(false);
      return;
    }

    async function loadMeeting() {
      try {
        const meeting = await getMeetingByInvite(inviteToken);
        setMeetingTitle(meeting.title);
        setMeetingId(meeting.meetingId);
        setInviteLink(meeting.inviteLink);
        if (meeting.status === "ended") {
          setError("This meeting has already ended.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid invite link.");
      } finally {
        setLoading(false);
      }
    }

    loadMeeting();
  }, [inviteToken]);

  async function handleJoin() {
    if (!displayName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!meetingId) return;

    setJoining(true);
    try {
      await joinMeeting(meetingId, {
        displayName: displayName.trim(),
        inviteLink,
      });
      toast.success("Joining meeting…");
      router.push(`/meeting/${meetingId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join meeting");
    } finally {
      setJoining(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#F4F4F4] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#0B5CFF] animate-spin" />
        <p className="text-[14px] text-[#747487]">Loading invite…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex items-center justify-center w-10 h-10 rounded-[12px] bg-[#0B5CFF]">
            <Video className="w-5 h-5 text-white" />
          </span>
          <div>
            <h1 className="text-[18px] font-bold text-[#1A1A1A]">Join Meeting</h1>
            <p className="text-[12px] text-[#747487]">{meetingTitle || "Video meeting"}</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl bg-[#FDEEEE] border border-[#EB5757]/20 px-4 py-3 text-[13px] text-[#EB5757] mb-4">
            {error}
          </div>
        ) : (
          <>
            {meetingId && (
              <p className="text-[12px] text-[#747487] mb-4 font-mono tracking-widest">
                ID: {meetingId}
              </p>
            )}
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-[13px] font-medium text-[#1A1A1A]">Your Name</label>
              <input
                className={inputCls}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
              />
            </div>
            <button onClick={handleJoin} disabled={joining || !!error} className={primaryBtn}>
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {joining ? "Joining…" : "Join Meeting"}
            </button>
          </>
        )}

        {!isAuthenticated && (
          <p className="text-[12px] text-[#747487] text-center mt-4">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-[#0B5CFF] hover:underline font-medium"
            >
              Sign in
            </button>
            {" "}to host your own meetings
          </p>
        )}
      </div>
    </div>
  );
}

export default function JoinByInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F4F4] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#0B5CFF] animate-spin" />
        </div>
      }
    >
      <JoinByInviteContent />
    </Suspense>
  );
}
