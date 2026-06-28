/**
 * types/index.ts
 *
 * TypeScript interfaces that mirror the FastAPI Pydantic schemas exactly.
 * Field names use camelCase on the frontend — the axios instance transforms
 * snake_case responses via the api.ts response interceptor.
 *
 * Backend source of truth: backend/schemas.py
 */

// =============================================================================
//  Enums
// =============================================================================

export type MeetingType   = "instant" | "scheduled";
export type MeetingStatus = "waiting" | "active" | "ended";

// =============================================================================
//  User
// =============================================================================

export interface User {
  id:        string;
  name:      string;
  email:     string;
  avatarUrl: string | null;
  createdAt: string; // ISO-8601 UTC
}

// =============================================================================
//  Meeting
// =============================================================================

/**
 * Full meeting representation — matches MeetingResponse from the backend.
 * meetingId is the Zoom-style join code, e.g. "123-456-789".
 */
export interface Meeting {
  id:               string;
  meetingId:        string;
  title:            string;
  description:      string | null;
  hostId:           string;
  hostName:         string;
  type:             MeetingType;
  status:           MeetingStatus;
  scheduledAt:      string | null; // ISO-8601 UTC, null for instant meetings
  durationMinutes:  number;
  inviteLink:       string;
  createdAt:        string;        // ISO-8601 UTC
  participantCount: number | null;
}

// =============================================================================
//  Participant
// =============================================================================

export interface Participant {
  id:          string;
  meetingId:   string;
  userId:      string | null; // null for guest participants
  displayName: string;
  joinedAt:    string; // ISO-8601 UTC
  leftAt:      string | null;
  isHost:      boolean;
}

// =============================================================================
//  Request payloads
// =============================================================================

/**
 * POST /api/meetings/instant
 * title is optional — backend defaults to "Instant Meeting".
 */
export interface CreateInstantMeetingPayload {
  title?: string;
}

/**
 * POST /api/meetings/schedule
 * Matches MeetingCreate on the backend.
 */
export interface ScheduleMeetingPayload {
  title:           string;
  description?:    string;
  scheduledAt:     string; // ISO-8601 UTC — must be in the future
  durationMinutes?: number; // defaults to 60
  type?:           MeetingType;
}

/**
 * POST /api/meetings/{meetingId}/join
 * Matches JoinMeetingRequest on the backend.
 */
export interface JoinMeetingPayload {
  displayName: string;
  inviteLink?: string;
}

// =============================================================================
//  API response wrappers
// =============================================================================

/**
 * Returned by POST /api/meetings/{meetingId}/join
 */
export interface JoinMeetingResponse {
  meeting:     Meeting;
  participant: Participant;
}

/**
 * Generic API error shape from FastAPI's HTTPException.
 */
export interface ApiError {
  detail: string | Array<{ msg: string; type?: string }>;
}

// =============================================================================
//  Auth types
// =============================================================================

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}
