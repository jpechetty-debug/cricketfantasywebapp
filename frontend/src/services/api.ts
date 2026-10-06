import axios from 'axios';
import type { AxiosError } from 'axios';
import type {
  AdminStats,
  AuthResponse,
  CricHeroesImportPlayer,
  CricHeroesImportResult,
  CricHeroesPreview,
  FantasyTeam,
  LeaderboardEntry,
  Match,
  MatchStatus,
  Player,
  UserProfile,
} from '../types';

const AUTH_STORAGE_KEY = 'pfl_auth';

// VITE_API_URL is the backend origin when it is hosted separately (e.g. Netlify + API host).
// Leave it unset for same-origin deploys and for local dev (Vite proxies /api).
const apiOrigin = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

const api = axios.create({
  baseURL: `${apiOrigin}/api`,
  timeout: 15000,
});

function readToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? ((JSON.parse(raw) as { token?: string }).token ?? null) : null;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// An expired or revoked token: drop the session and send the user back to the right login page.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && readToken()) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      const isAdminArea = window.location.pathname.startsWith('/admin');
      window.location.assign(isAdminArea ? '/admin/login' : '/login');
    }
    return Promise.reject(error);
  },
);

export function apiError(error: unknown, fallback = 'Something went wrong'): string {
  const err = error as AxiosError<{ detail?: string }>;
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (err.response?.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (err.response?.status === 422) return 'Please check the details you entered.';
  if (!err.response) return 'Cannot reach the server. Check your connection.';
  return fallback;
}

export const authApi = {
  register: (payload: { name: string; mobile: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', payload).then((r) => r.data),
  login: (payload: { mobile: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', payload).then((r) => r.data),
  me: () => api.get<UserProfile>('/auth/me').then((r) => r.data),
};

export const matchApi = {
  list: () => api.get<Match[]>('/matches').then((r) => r.data),
  get: (id: number) => api.get<Match>(`/matches/${id}`).then((r) => r.data),
  create: (payload: { match_name: string; team_a: string; team_b: string; match_date: string }) =>
    api.post<Match>('/matches', payload).then((r) => r.data),
  setStatus: (id: number, status: MatchStatus) =>
    api.patch<Match>(`/matches/${id}/status`, { status }).then((r) => r.data),
};

export const playerApi = {
  list: (matchId?: number) =>
    api.get<Player[]>('/players', { params: matchId ? { match_id: matchId } : {} }).then((r) => r.data),
  create: (payload: { player_name: string; team_name: string; role: string; active: boolean }) =>
    api.post<Player>('/players', payload).then((r) => r.data),
  update: (id: number, payload: Partial<Player>) => api.put<Player>(`/players/${id}`, payload).then((r) => r.data),
  remove: (id: number) => api.delete(`/players/${id}`).then((r) => r.data),
};

export const teamApi = {
  save: (payload: { match_id: number; captain_id: number; vice_captain_id: number; selected_players: number[] }) =>
    api.post<FantasyTeam>('/teams', payload).then((r) => r.data),
  mine: () => api.get<FantasyTeam[]>('/teams/me').then((r) => r.data),
  forMatch: (matchId: number) => api.get<FantasyTeam | null>(`/teams/match/${matchId}`).then((r) => r.data),
};

export const pointsApi = {
  get: (matchId: number) =>
    api.get<{ player_id: number; points: number }[]>(`/points/${matchId}`).then((r) => r.data),
  save: (payload: { match_id: number; entries: { player_id: number; points: number }[] }) =>
    api.post('/points', payload).then((r) => r.data),
};

export const leaderboardApi = {
  get: (matchId: number) => api.get<LeaderboardEntry[]>(`/leaderboard/${matchId}`).then((r) => r.data),
};

export const adminApi = {
  stats: () => api.get<AdminStats>('/admin/stats').then((r) => r.data),
};

// Fetching from CricHeroes can be slow, so these calls get a longer timeout.
export const cricheroesApi = {
  preview: (payload: { url: string; match_id?: number | null }) =>
    api.post<CricHeroesPreview>('/cricheroes/preview', payload, { timeout: 45000 }).then((r) => r.data),
  import: (payload: {
    url: string;
    match_id?: number | null;
    match_name?: string | null;
    players: CricHeroesImportPlayer[];
    save_points: boolean;
  }) => api.post<CricHeroesImportResult>('/cricheroes/import', payload, { timeout: 45000 }).then((r) => r.data),
};

export default api;
