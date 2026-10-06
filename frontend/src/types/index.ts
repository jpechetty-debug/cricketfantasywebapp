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

export interface MatchWinners {
  match_id: number;
  match_name: string;
  team_a: string;
  team_b: string;
  match_date: string;
  squads: number;
  // Top 3 places; tied squads share a place, so there can be more than three.
  winners: { rank: number; user_id: number; name: string; mobile: string | null; points: number }[];
}

export interface AuthState {
  token: string;
  role: Role;
  name: string;
  userId: number;
}

export interface CricHeroesTeam {
  cricheroes_team_id: number;
  name: string;
  app_team_name: string;
}

export interface CricHeroesPlayer {
  cricheroes_player_id: number;
  name: string;
  side: 'a' | 'b';
  suggested_role: string;
  points: number | null;
  breakdown: { label: string; points: number }[];
  player_id: number | null;
  match_reason: 'linked' | 'name' | 'none';
}

export interface CricHeroesPreview {
  cricheroes_match_id: number;
  tournament_name: string | null;
  start_time: string | null;
  status: 'upcoming' | 'live' | 'past' | string;
  result: string | null;
  has_scorecard: boolean;
  match_id: number | null;
  team_a: CricHeroesTeam;
  team_b: CricHeroesTeam;
  players: CricHeroesPlayer[];
  warnings: string[];
}

export interface CricHeroesImportPlayer {
  cricheroes_player_id: number;
  player_id: number | null;
  role: string;
  skip: boolean;
}

export interface CricHeroesPdfUpload {
  pdf_base64: string;
  filename: string;
  // Only needed when the file name is not CricHeroes' Scorecard_<match id>.pdf.
  url: string | null;
}

export interface CricHeroesImportResult {
  match_id: number;
  created_match: boolean;
  players_created: number;
  players_linked: number;
  points_saved: number;
  warnings: string[];
}
