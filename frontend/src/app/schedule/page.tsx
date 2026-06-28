"use client";

import { useRouter } from "next/navigation";

import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { ScheduleMeetingForm } from "@/components/MeetingUI";

function ScheduleContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F4F4F4]">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm p-8">
          <h1 className="text-[22px] font-bold text-[#1A1A1A] mb-1">Schedule a Meeting</h1>
          <p className="text-[13px] text-[#747487] mb-6">
            Pick a date, time, and duration. Your meeting will appear in Upcoming.
          </p>
          <ScheduleMeetingForm
            showCancel
            onCancel={() => router.push("/")}
            onSuccess={() => router.push("/meetings")}
          />
        </div>
      </main>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <AuthGuard>
      <ScheduleContent />
    </AuthGuard>
  );
}
