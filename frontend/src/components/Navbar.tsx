"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BellDot,
  Calendar,
  Check,
  ChevronRight,
  Edit2,
  LogIn,
  LogOut,
  Search,
  Settings,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth";

// =============================================================================
//  Constants
// =============================================================================

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/meetings", label: "Meetings" },
  { href: "/recordings", label: "Recordings" },
  { href: "/schedule", label: "Schedule" },
] as const;

// =============================================================================
//  Helpers
// =============================================================================

function toInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function useClickOutside(ref: React.RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

// =============================================================================
//  Fake notifications data
// =============================================================================

interface Notification {
  id: string;
  icon: "meeting" | "schedule" | "recording";
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    icon: "meeting",
    title: "Meeting starting soon",
    body: "Team Standup starts in 15 minutes",
    time: "5m ago",
    unread: true,
  },
  {
    id: "2",
    icon: "schedule",
    title: "New meeting scheduled",
    body: "Product Demo on Friday 2:00 PM",
    time: "1h ago",
    unread: true,
  },
  {
    id: "3",
    icon: "recording",
    title: "Recording saved",
    body: "zoom_recording_2026-06-28.webm is ready",
    time: "3h ago",
    unread: false,
  },
  {
    id: "4",
    icon: "meeting",
    title: "Meeting ended",
    body: "Backend Architecture Review lasted 1h 15m",
    time: "Yesterday",
    unread: false,
  },
];

function NotifIcon({ icon }: { icon: Notification["icon"] }) {
  const styles: Record<Notification["icon"], { bg: string; el: React.ReactNode }> = {
    meeting: { bg: "bg-[#EEF3FF]", el: <Video className="w-4 h-4 text-[#0B5CFF]" /> },
    schedule: { bg: "bg-[#F3EEFF]", el: <Calendar className="w-4 h-4 text-[#7C3AED]" /> },
    recording: { bg: "bg-[#FFF0EE]", el: <Video className="w-4 h-4 text-[#EB5757]" /> },
  };
  const s = styles[icon];
  return (
    <span className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${s.bg}`}>
      {s.el}
    </span>
  );
}

// =============================================================================
//  Bell dropdown
// =============================================================================

function BellDropdown({ onClose }: { onClose: () => void }) {
  const [notifs, setNotifs] = useState(MOCK_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  function markAllRead() {
    setNotifs((n) => n.map((x) => ({ ...x, unread: false })));
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[360px] bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] border border-[#E5E5E5] z-[100] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
        <h3 className="text-[15px] font-semibold text-[#1A1A1A]">
          Notifications
          {notifs.some((n) => n.unread) && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0B5CFF] text-white text-[10px] font-bold">
              {notifs.filter((n) => n.unread).length}
            </span>
          )}
        </h3>
        <button
          onClick={markAllRead}
          className="text-[12px] text-[#0B5CFF] font-medium hover:underline"
        >
          Mark all read
        </button>
      </div>

      {/* List */}
      <div className="max-h-[320px] overflow-y-auto">
        {notifs.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 px-5 py-3.5 border-b border-[#F9F9F9] last:border-0 hover:bg-[#FAFAFA] transition-colors cursor-pointer ${n.unread ? "bg-[#F5F8FF]" : ""
              }`}
            onClick={() => setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, unread: false } : x))}
          >
            <NotifIcon icon={n.icon} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-[13px] font-semibold leading-tight ${n.unread ? "text-[#1A1A1A]" : "text-[#4A4A4A]"}`}>
                  {n.title}
                </p>
                {n.unread && <span className="shrink-0 w-2 h-2 rounded-full bg-[#0B5CFF] mt-1" />}
              </div>
              <p className="text-[12px] text-[#747487] mt-0.5 truncate">{n.body}</p>
              <p className="text-[11px] text-[#ADADAD] mt-0.5">{n.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#F0F0F0]">
        <button className="w-full text-[13px] text-center text-[#0B5CFF] font-medium hover:underline">
          View all notifications
        </button>
      </div>
    </div>
  );
}

// =============================================================================
//  Search modal
// =============================================================================

function SearchModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Mock recent meetings for search
  const SEARCHABLE = [
    { id: "1", label: "Team Standup", type: "meeting", href: "/meetings" },
    { id: "2", label: "Product Demo", type: "meeting", href: "/meetings" },
    { id: "3", label: "1:1 with Manager", type: "meeting", href: "/meetings" },
    { id: "4", label: "Sprint 13 Retrospective", type: "meeting", href: "/meetings" },
    { id: "5", label: "Backend Architecture Review", type: "meeting", href: "/meetings" },
    { id: "6", label: "Schedule a meeting", type: "action", href: "/schedule" },
    { id: "7", label: "View recordings", type: "action", href: "/recordings" },
  ];

  const results = query.trim()
    ? SEARCHABLE.filter((s) => s.label.toLowerCase().includes(query.toLowerCase()))
    : SEARCHABLE.slice(0, 5);

  function go(href: string) {
    router.push(href);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Search card */}
      <div
        className="relative w-full max-w-[540px] mx-4 bg-white rounded-2xl shadow-[0_16px_60px_rgba(0,0,0,0.2)] overflow-hidden modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F0F0F0]">
          <Search className="w-5 h-5 text-[#ADADAD] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder="Search meetings, recordings, actions…"
            className="flex-1 text-[15px] text-[#1A1A1A] placeholder:text-[#ADADAD] focus:outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[#ADADAD] hover:text-[#1A1A1A]">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 text-[11px] text-[#ADADAD] bg-[#F5F5F5] rounded-md px-1.5 py-0.5 font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="text-center text-[13px] text-[#ADADAD] py-8"> No results for &quot;{query}&quot; </p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => go(r.href)}
                className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-[#F5F8FF] transition-colors text-left group"
              >
                <span className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${r.type === "action" ? "bg-[#EEF3FF]" : "bg-[#F5F5F5]"
                  }`}>
                  {r.type === "action"
                    ? <Settings className="w-3.5 h-3.5 text-[#0B5CFF]" />
                    : <Video className="w-3.5 h-3.5 text-[#747487]" />
                  }
                </span>
                <span className="flex-1 text-[14px] text-[#1A1A1A] font-medium truncate">{r.label}</span>
                <ChevronRight className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#747487] transition-colors shrink-0" />
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        {!query && (
          <div className="px-5 py-3 border-t border-[#F0F0F0]">
            <p className="text-[11px] text-[#ADADAD]">Recent meetings · Actions</p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
//  Profile Edit Modal
// =============================================================================

function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  function handleSave() {
    // Persist to localStorage (mock — no backend call)
    const stored = localStorage.getItem("zoom_user");
    const current = stored ? JSON.parse(stored) : {};
    localStorage.setItem("zoom_user", JSON.stringify({ ...current, name, email }));
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await logout();
    onClose();
    router.push("/login");
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[300px] bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] border border-[#E5E5E5] z-[100] overflow-hidden modal-enter"
    >
      {/* Avatar + name header */}
      <div className="flex flex-col items-center gap-3 px-6 py-6 bg-gradient-to-b from-[#EEF3FF] to-white border-b border-[#F0F0F0]">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#0B5CFF] text-white text-[22px] font-bold ring-4 ring-[#0B5CFF]/20">
          {toInitials(user?.name ?? "?")}
        </div>
        {!editing ? (
          <>
            <div className="text-center">
              <p className="text-[16px] font-semibold text-[#1A1A1A]">{user?.name}</p>
              <p className="text-[12px] text-[#747487]">{user?.email}</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-[12px] text-[#0B5CFF] font-medium hover:underline"
            >
              <Edit2 className="w-3 h-3" />
              Edit Profile
            </button>
          </>
        ) : (
          <div className="w-full space-y-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              className="w-full text-[13px] text-[#1A1A1A] border border-[#E5E5E5] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B5CFF]/25 focus:border-[#0B5CFF] bg-white"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full text-[13px] text-[#1A1A1A] border border-[#E5E5E5] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B5CFF]/25 focus:border-[#0B5CFF] bg-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setEditing(false); setName(user?.name ?? ""); setEmail(user?.email ?? ""); }}
                className="flex-1 py-1.5 text-[12px] text-[#747487] border border-[#E5E5E5] rounded-xl hover:bg-[#F5F5F5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-1.5 text-[12px] font-semibold text-white bg-[#0B5CFF] rounded-xl hover:bg-[#0047e0] transition-colors flex items-center justify-center gap-1"
              >
                {saved ? <Check className="w-3.5 h-3.5" /> : null}
                {saved ? "Saved!" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Menu items */}
      <div className="py-2">
        <Link
          href="/recordings"
          onClick={onClose}
          className="flex items-center gap-3 px-5 py-2.5 text-[13px] text-[#1A1A1A] hover:bg-[#F5F5F5] transition-colors"
        >
          <Video className="w-4 h-4 text-[#747487]" />
          My Recordings
        </Link>
        <Link
          href="/schedule"
          onClick={onClose}
          className="flex items-center gap-3 px-5 py-2.5 text-[13px] text-[#1A1A1A] hover:bg-[#F5F5F5] transition-colors"
        >
          <Calendar className="w-4 h-4 text-[#747487]" />
          Schedule Meeting
        </Link>
        <div className="my-1 mx-4 h-px bg-[#F0F0F0]" />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-2.5 text-[13px] text-[#EB5757] hover:bg-[#FFF5F5] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// =============================================================================
//  Logo
// =============================================================================

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 select-none shrink-0" aria-label="ZoomClone home">
      <span className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-[#0B5CFF]">
        <Video className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
      </span>
      <span className="text-white font-bold text-[20px] tracking-[-0.5px] leading-none">
        zoom<span className="text-[#0B5CFF]">clone</span>
      </span>
    </Link>
  );
}

// =============================================================================
//  NavItem
// =============================================================================

function NavItem({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={[
        "relative text-[13px] font-medium pb-[2px] transition-colors duration-150",
        "after:absolute after:-bottom-[1px] after:left-0 after:h-[2px] after:rounded-full",
        "after:transition-all after:duration-200",
        isActive
          ? "text-white after:w-full after:bg-[#0B5CFF]"
          : "text-[#9898A6] hover:text-white after:w-0 hover:after:w-full after:bg-[#9898A6]",
      ].join(" ")}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

// =============================================================================
//  NavActions — Bell, Search, Avatar
// =============================================================================

function NavActions() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [showBell, setShowBell] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => n.unread).length;

  // Keyboard shortcut: Cmd/Ctrl+K to open search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex items-center gap-2 shrink-0">

      {/* Bell */}
      <div ref={bellRef} className="relative">
        <button
          onClick={() => { setShowBell((v) => !v); setShowProfile(false); }}
          className="relative flex items-center justify-center w-8 h-8 rounded-full text-[#9898A6] hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Notifications"
          title="Notifications"
        >
          {unreadCount > 0 ? <BellDot className="w-[18px] h-[18px]" /> : <Bell className="w-[18px] h-[18px]" />}
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#EB5757] text-white text-[8px] font-bold">
              {unreadCount}
            </span>
          )}
        </button>
        {showBell && <BellDropdown onClose={() => setShowBell(false)} />}
      </div>

      {/* Search */}
      <button
        onClick={() => setShowSearch(true)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-[#9898A6] hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Search"
        title="Search (Ctrl+K)"
      >
        <Search className="w-[18px] h-[18px]" />
      </button>
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}

      {/* Divider */}
      <div className="w-px h-5 bg-white/10" />

      {isAuthenticated && user ? (
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setShowProfile((v) => !v); setShowBell(false); }}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Profile menu"
            title="Profile"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0B5CFF] text-white text-[12px] font-bold select-none ring-2 ring-[#0B5CFF]/40">
              {toInitials(user.name)}
            </div>
            <span className="hidden md:block text-[13px] font-medium text-[#D0D0DC] whitespace-nowrap">
              {user.name}
            </span>
          </button>
          {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
        </div>
      ) : (
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-1.5 rounded-lg bg-[#0B5CFF] hover:bg-[#0047e0] text-white text-[12px] font-semibold px-3 py-1.5 transition-colors"
        >
          <LogIn className="w-3.5 h-3.5" />
          Sign In
        </button>
      )}
    </div>
  );
}

// =============================================================================
//  Navbar
// =============================================================================

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-white/[0.06]"
      style={{ backgroundColor: "#1C1C2E", height: "56px" }}
    >
      <nav
        className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-6"
        aria-label="Main navigation"
      >
        <Logo />

        <ul className="hidden sm:flex items-center gap-7" role="list">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <NavItem
                href={href}
                label={label}
                isActive={href === "/" ? pathname === "/" : pathname.startsWith(href)}
              />
            </li>
          ))}
        </ul>

        <NavActions />
      </nav>
    </header>
  );
}
