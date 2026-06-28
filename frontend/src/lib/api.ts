/**
 * lib/api.ts
 *
 * Axios instance + typed API functions for the Zoom Clone backend.
 */

import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

import type {
  ApiError,
  CreateInstantMeetingPayload,
  JoinMeetingPayload,
  JoinMeetingResponse,
  LoginPayload,
  Meeting,
  Participant,
  RegisterPayload,
  ScheduleMeetingPayload,
  TokenResponse,
  UserProfile,
} from "@/types";

// =============================================================================
//  Snake_case ↔ camelCase helpers
// =============================================================================

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function transformKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(transformKeys);
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        snakeToCamel(k),
        transformKeys(v),
      ])
    );
  }
  return obj;
}

function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, (letter: string) => `_${letter.toLowerCase()}`);
}

function transformKeysToSnake(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToSnake);
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        camelToSnake(k),
        transformKeysToSnake(v),
      ])
    );
  }
  return obj;
}

function formatApiError(detail: ApiError["detail"]): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(", ");
  }
  return JSON.stringify(detail);
}

// =============================================================================
//  Axios instance
// =============================================================================

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL:         BASE_URL,
  headers:         { "Content-Type": "application/json" },
  withCredentials: false,
  timeout:         15_000,
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// -- Request interceptor: add auth header + transform to snake_case --
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    if (config.data && typeof config.data === "object") {
      config.data = transformKeysToSnake(config.data);
    }
    return config;
  }
);

// -- Response interceptor: transform snake_case JSON to camelCase ------------
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    if (response.data && typeof response.data === "object") {
      response.data = transformKeys(response.data);
    }
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      config &&
      !config._retry &&
      typeof window !== "undefined"
    ) {
      const savedRefresh = localStorage.getItem("refresh_token");
      if (savedRefresh) {
        config._retry = true;
        try {
          const res = await axios.post<TokenResponse>(
            `${BASE_URL}/auth/refresh`,
            { refresh_token: savedRefresh },
            { headers: { "Content-Type": "application/json" } }
          );
          const tokens = transformKeys(res.data) as TokenResponse;
          localStorage.setItem("access_token", tokens.accessToken);
          localStorage.setItem("refresh_token", tokens.refreshToken);
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return apiClient.request(config);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      }
    }

    const detail = error.response?.data?.detail;
    if (detail) {
      const enhanced = new Error(formatApiError(detail)) as Error & { status: number };
      enhanced.status = status ?? 500;
      return Promise.reject(enhanced);
    }

    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("Request timed out. Is the backend running on port 8000?"));
    }

    if (!error.response) {
      return Promise.reject(
        new Error("Cannot reach the API server. Start the backend with: uvicorn main:app --reload --port 8000")
      );
    }

    return Promise.reject(error);
  }
);

// =============================================================================
//  Meeting API functions
// =============================================================================

export async function createInstantMeeting(
  payload: CreateInstantMeetingPayload = {}
): Promise<Meeting> {
  const params = payload.title ? { title: payload.title } : {};
  const res = await apiClient.post<Meeting>("/api/meetings/instant", null, { params });
  return res.data;
}

export async function scheduleMeeting(
  payload: ScheduleMeetingPayload
): Promise<Meeting> {
  const res = await apiClient.post<Meeting>("/api/meetings/schedule", payload);
  return res.data;
}

export async function getUpcomingMeetings(): Promise<Meeting[]> {
  const res = await apiClient.get<Meeting[]>("/api/meetings/upcoming");
  return res.data;
}

export async function getRecentMeetings(): Promise<Meeting[]> {
  const res = await apiClient.get<Meeting[]>("/api/meetings/recent");
  return res.data;
}

export async function getMeeting(meetingId: string): Promise<Meeting> {
  const res = await apiClient.get<Meeting>(`/api/meetings/${encodeURIComponent(meetingId)}`);
  return res.data;
}

export async function getMeetingByInvite(token: string): Promise<Meeting> {
  const res = await apiClient.get<Meeting>(`/api/meetings/by-invite/${encodeURIComponent(token)}`);
  return res.data;
}

export async function joinMeeting(
  meetingId: string,
  payload: JoinMeetingPayload
): Promise<JoinMeetingResponse> {
  const res = await apiClient.post<JoinMeetingResponse>(
    `/api/meetings/${encodeURIComponent(meetingId)}/join`,
    payload
  );
  return res.data;
}

export async function getParticipants(
  meetingId: string
): Promise<Participant[]> {
  const res = await apiClient.get<Participant[]>(
    `/api/meetings/${encodeURIComponent(meetingId)}/participants`
  );
  return res.data;
}

export async function endMeeting(meetingId: string): Promise<void> {
  await apiClient.delete(`/api/meetings/${encodeURIComponent(meetingId)}`);
}

export async function leaveMeeting(meetingId: string): Promise<void> {
  await apiClient.post(`/api/meetings/${encodeURIComponent(meetingId)}/leave`);
}

/** @deprecated Use endMeeting instead */
export const deleteMeeting = endMeeting;

// =============================================================================
//  Auth API functions
// =============================================================================

export async function registerUser(payload: RegisterPayload): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>("/auth/register", payload);
  return res.data;
}

export async function loginUser(payload: LoginPayload): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>("/auth/login", payload);
  return res.data;
}

export async function refreshToken(refreshTokenValue: string): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>("/auth/refresh", {
    refreshToken: refreshTokenValue,
  });
  return res.data;
}

export async function logoutUser(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function getUserProfile(): Promise<UserProfile> {
  const res = await apiClient.get<UserProfile>("/users/me");
  return res.data;
}
