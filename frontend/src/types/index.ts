export type Role = 'user' | 'admin';
export type MatchStatus = 'open' | 'locked' | 'closed';

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: Role;
  name: string;
  user_id: number;
}

export interface UserProfile {
  id: number;
  name: string;
  mobile: string;
  role: Role;
  created_at: string;
}

export interface Match {
  id: number;
  match_name: string;
  team_a: string;
  team_b: string;
  match_date: string;
  status: MatchStatus;
}

export interface Player {
  id: number;
  player_name: string;
  team_name: string;
  role: string;
  active: boolean;
}

export interface FantasyTeam {
  id: number;
  user_id: number;
  match_id: number;
  captain_id: number;
  vice_captain_id: number;
  selected_players: number[];
  total_points: number;
  created_at: string;
  user_name?: string | null;
  match_name?: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  name: string;
  points: number;
  team_id: number;
}

export interface AdminStats {
  total_users: number;
  total_matches: number;
  total_teams: number;
}

export interface AuthState {
  token: string;
  role: Role;
  name: string;
  userId: number;
}
