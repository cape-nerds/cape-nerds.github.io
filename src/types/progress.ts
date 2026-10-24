/**
 * Data structures for "THE ROAD TO ALEVEL" 3D animated series & progression
 */

export type SquadMemberId = 'pedro' | 'schrodinger' | 'dr_novice' | 'notyourfriend';

export interface SquadMember {
  id: SquadMemberId;
  name: string;
  role: string;
  badge: string;
  type: 'student' | 'mentor';
  specialty: string;
  appearance: {
    description: string;
    eyes: string;
    skinTone: string;
    item: string;
  };
  totalHours: number;
  streakDays: number;
  level: number;
  color: string;
}

export interface DailyMemberLog {
  memberId: SquadMemberId;
  hours: number;
  topic: string;
  notes?: string;
  completedAt?: string;
}

export type BattleRank = 'S' | 'A' | 'B' | 'C';

export interface EpisodeOutcome {
  rank: BattleRank;
  title: string;
  synopsis: string;
  dragonHpLost: number;
  squadExpGained: number;
  heroHighlight: SquadMemberId;
  clashOutcome: 'dragon_staggered' | 'tactical_advance' | 'fierce_skirmish' | 'desperate_siege';
  dialogue: Array<{
    speaker: SquadMemberId | 'dragon' | 'narrator';
    text: string;
  }>;
}

export interface DayEpisode {
  id: string; // e.g. "s01e24"
  seasonNumber: number;
  seasonName: string;
  episodeNumber: number; // 1 - 30/31
  dateStr: string; // YYYY-MM-DD
  isClosed: boolean; // Locked after 11:59 PM
  logs: Record<SquadMemberId, DailyMemberLog>;
  totalHours: number;
  outcome: EpisodeOutcome;
}

export interface SeasonInfo {
  seasonNumber: number;
  title: string;
  monthName: string;
  year: number;
  targetArc: string;
  totalEpisodes: number;
}

export interface DragonState {
  name: string;
  title: string;
  currentHp: number;
  maxHp: number;
  heads: {
    left: { name: string; status: string };
    center: { name: string; status: string };
    right: { name: string; status: string };
  };
  rageLevel: number; // 0 to 100
}
