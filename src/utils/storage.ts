/**
 * Storage, Episode Generation, WhatsApp Parsing, and Game Logic
 * for "THE ROAD TO ALEVEL"
 */

import { SquadMember, DayEpisode, DragonState, SquadMemberId, EpisodeOutcome, BattleRank } from '../types/progress';

export const INITIAL_MEMBERS: Record<SquadMemberId, SquadMember> = {
  dr_novice: {
    id: 'dr_novice',
    name: 'Dr. Novice',
    role: '2nd Shy Maths',
    badge: 'Tactical Calculator',
    type: 'student',
    specialty: 'Pure Mathematics & Mechanics',
    appearance: {
      description: 'Slightly dark skin, black hair, black rectangular glasses, laptop at side',
      eyes: 'Determined eyes with focused warrior resolve',
      skinTone: '#845738',
      item: 'Open Dev/Maths Laptop',
    },
    totalHours: 142.5,
    streakDays: 19,
    level: 14,
    color: '#38bdf8',
  },
  schrodinger: {
    id: 'schrodinger',
    name: "Schrödinger's Cat",
    role: '2nd Shy Bio',
    badge: 'Monster Alchemist',
    type: 'student',
    specialty: 'Cellular Biology & Genetics',
    appearance: {
      description: 'Slightly lighter dark skin, black hair over forehead, Monster Energy can',
      eyes: 'Uneasy eyes, sleepless caffeine determination',
      skinTone: '#ab7953',
      item: 'Monster Energy Can',
    },
    totalHours: 136.0,
    streakDays: 17,
    level: 13,
    color: '#22c55e',
  },
  pedro: {
    id: 'pedro',
    name: 'Pedro',
    role: '1st Shy Maths',
    badge: 'Integral Prodigy',
    type: 'student',
    specialty: 'Pure Maths 3 & Vectors',
    appearance: {
      description: 'Girl, light brown skin, curly black hair, big transparent circle glasses, headphones',
      eyes: 'Mischievous eyes, calculating counter-spells',
      skinTone: '#a36d47',
      item: 'Chunky Retro Studio Headphones',
    },
    totalHours: 158.0,
    streakDays: 22,
    level: 16,
    color: '#f59e0b',
  },
  notyourfriend: {
    id: 'notyourfriend',
    name: 'NotYourFriend',
    role: 'A-Level Conqueror & Mentor',
    badge: 'Dragon Slayer (Aced ALs)',
    type: 'mentor',
    specialty: 'Software Job + Veteran Strategy',
    appearance: {
      description: 'Light brown skin, black hair, dragon-scale cape from the defeated beast',
      eyes: 'Calm, heavy-lidded eyes with serene veteran confidence',
      skinTone: '#986641',
      item: 'Legendary Dragon-Scale Cape',
    },
    totalHours: 184.0,
    streakDays: 24,
    level: 28,
    color: '#a855f7',
  },
};

export const INITIAL_DRAGON: DragonState = {
  name: 'A-LEVEL',
  title: 'The Three-Headed Polypetal Wyrm of Cambridge',
  currentHp: 6420,
  maxHp: 10000,
  heads: {
    left: { name: 'Calculus & Pure Vectors Head', status: 'Wounded (-32% armor)' },
    center: { name: 'Grade Boundaries & Mark Scheme Maw', status: 'Enraged' },
    right: { name: 'Genetics & Molecular Bio Fang', status: 'Staggered' },
  },
  rageLevel: 68,
};

// Generates dynamic outcome, ranks, and squad banter dialogue based on hours worked
export function computeEpisodeOutcome(
  pedroH: number,
  schrodH: number,
  noviceH: number,
  mentorH: number,
  epNumber: number
): EpisodeOutcome {
  const total = pedroH + schrodH + noviceH + mentorH;
  const studyTotal = pedroH + schrodH + noviceH;

  let rank: BattleRank = 'B';
  let clashOutcome: EpisodeOutcome['clashOutcome'] = 'fierce_skirmish';
  let title = '';
  let synopsis = '';
  let heroHighlight: SquadMemberId = 'notyourfriend';

  // Determine top student
  const maxStudy = Math.max(pedroH, schrodH, noviceH);
  if (maxStudy === pedroH) heroHighlight = 'pedro';
  else if (maxStudy === schrodH) heroHighlight = 'schrodinger';
  else heroHighlight = 'dr_novice';

  if (total >= 22 || studyTotal >= 17) {
    rank = 'S';
    clashOutcome = 'dragon_staggered';
    title = `Ep ${epNumber}: Symphony of Pure Reason`;
    synopsis = `The squad synchronized their study assault! With ${total.toFixed(1)} combined hours, Pedro's integration barrier and Dr. Novice's kinematic vectors severed the dragon's fiery breath while Schrödinger's Cat exploited a cellular weakness!`;
  } else if (total >= 15 || studyTotal >= 11) {
    rank = 'A';
    clashOutcome = 'tactical_advance';
    title = `Ep ${epNumber}: The Mark Scheme Breach`;
    synopsis = `A solid ${total.toFixed(1)} hours logged across the party. NotYourFriend's dragon-scale cape absorbed the ambient heat while the trio methodically dismantled 3 past paper units.`;
  } else if (total >= 9) {
    rank = 'B';
    clashOutcome = 'fierce_skirmish';
    title = `Ep ${epNumber}: The Midnight Stalemate`;
    synopsis = `With ${total.toFixed(1)} hours logged, fatigue tested the heroes. Schrödinger's Cat cracked open an emergency Monster Energy while Dr. Novice held the line on differential equations.`;
  } else {
    rank = 'C';
    clashOutcome = 'desperate_siege';
    title = `Ep ${epNumber}: The Siege of Burnout`;
    synopsis = `Only ${total.toFixed(1)} hours managed today. The Dragon's pressure was intense, but NotYourFriend shielded the exhausted squad with his dragon cape, granting strategic rest for tomorrow's counter-attack.`;
  }

  const dragonHpLost = Math.round(studyTotal * 18 + mentorH * 8);
  const squadExpGained = Math.round(total * 45);

  // Dynamic party banter dialogue for the cutscene
  const dialogue: EpisodeOutcome['dialogue'] = [];

  if (rank === 'S') {
    dialogue.push({
      speaker: 'dr_novice',
      text: `Calculations checked out! My laptop ran the mechanics simulation—its armor value just plummeted!`,
    });
    dialogue.push({
      speaker: 'schrodinger',
      text: `I... I didn't even need my third Monster can today. We actually hit every single chapter on genetics!`,
    });
    dialogue.push({
      speaker: 'pedro',
      text: `Told you! Vectors are just geometry wearing fancy hats! Watch this slash!`,
    });
    dialogue.push({
      speaker: 'notyourfriend',
      text: `Clean execution, you three. Keep this tempo up until 2027 and that dragon won't even see the exam hall coming.`,
    });
  } else if (rank === 'A') {
    dialogue.push({
      speaker: 'pedro',
      text: `Got through 4 past paper sections today. The dragon tried to blow fire, but my circle glasses deflected the glare!`,
    });
    dialogue.push({
      speaker: 'schrodinger',
      text: `My eyelids are twitching, but biology flashcards are 100% memorized.`,
    });
    dialogue.push({
      speaker: 'dr_novice',
      text: `Steadily grinding. Tomorrow we target Pure Maths 3 chapter 9.`,
    });
    dialogue.push({
      speaker: 'notyourfriend',
      text: `Pacing is everything in ALs. You're building ironclad endurance.`,
    });
  } else {
    dialogue.push({
      speaker: 'schrodinger',
      text: `That was a rough one... my brain feels like Schrödinger's box—both alive and dead at the same time.`,
    });
    dialogue.push({
      speaker: 'dr_novice',
      text: `We held our ground at least. No zero-hour days.`,
    });
    dialogue.push({
      speaker: 'pedro',
      text: `Tomorrow at 8 AM, we counter-strike with fresh coffee!`,
    });
    dialogue.push({
      speaker: 'notyourfriend',
      text: `Rest up under the dragon cape tonight. A single bad day never lost an A-Level war.`,
    });
  }

  return {
    rank,
    title,
    synopsis,
    dragonHpLost,
    squadExpGained,
    heroHighlight,
    clashOutcome,
    dialogue,
  };
}

// Seed historical episodes for the current month so the timeline is alive
export function generateSeedEpisodes(): DayEpisode[] {
  const episodes: DayEpisode[] = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = Math.min(today.getDate(), 24);

  const sampleTopics: Record<SquadMemberId, string[]> = {
    dr_novice: [
      'Mechanics Kinematics & P3 Differential Equations',
      'Complex Numbers Argand Diagrams',
      'Integration by Substitution & Parts',
      'Newton-Raphson & Numerical Solutions',
      'Vectors in 3D Space & Line Intersections',
    ],
    schrodinger: [
      'Molecular Genetics & DNA Transcription',
      'Cellular Respiration & Krebs Cycle',
      'Photosynthesis Light Dependent Reactions',
      'Homeostasis & Nephron Function',
      'Evolutionary Genetics & Hardy-Weinberg',
    ],
    pedro: [
      'Pure Maths 3 Past Papers 2023 Series',
      'Binomial Expansions & Series Convergence',
      'Logarithms, Exponentials & Trigonometry Identities',
      'Coordinate Geometry & Parabola Focus',
      'Differential Equations Past Paper Speedrun',
    ],
    notyourfriend: [
      'Full-stack Cloud Architecture Job Sprint + Mentored Pedro on Proofs',
      'Production API Deployment + Reviewed Squad Weekly Targets',
      'Code Review & Refactoring + Shared 2024 AL Past Paper Strategy',
      'High-throughput Database Optimization + Mentored Novice on Mechanics',
      'Engineering Standup + Squad Motivation Prep for 2027 Road',
    ],
  };

  for (let day = 1; day <= currentDay; day++) {
    const isToday = day === currentDay;
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const epNum = day;
    const epId = `s01e${String(epNum).padStart(2, '0')}`;

    // Deterministic realistic variance
    const pSeed = (day * 3 + 2) % 5;
    const sSeed = (day * 2 + 1) % 5;
    const nSeed = (day * 4 + 3) % 5;
    const mSeed = (day * 7) % 5;

    const pedroH = isToday ? 5.5 : 4.0 + (pSeed * 0.8);
    const schrodH = isToday ? 4.5 : 3.5 + (sSeed * 0.7);
    const noviceH = isToday ? 6.0 : 4.0 + (nSeed * 0.9);
    const mentorH = isToday ? 7.5 : 7.0 + (mSeed * 0.5);

    const outcome = computeEpisodeOutcome(pedroH, schrodH, noviceH, mentorH, epNum);

    episodes.push({
      id: epId,
      seasonNumber: 1,
      seasonName: 'Valley of Past Papers',
      episodeNumber: epNum,
      dateStr,
      isClosed: !isToday, // Closed if before today, today closes at 11:59 PM
      logs: {
        pedro: { memberId: 'pedro', hours: pedroH, topic: sampleTopics.pedro[pSeed] },
        schrodinger: { memberId: 'schrodinger', hours: schrodH, topic: sampleTopics.schrodinger[sSeed] },
        dr_novice: { memberId: 'dr_novice', hours: noviceH, topic: sampleTopics.dr_novice[nSeed] },
        notyourfriend: { memberId: 'notyourfriend', hours: mentorH, topic: sampleTopics.notyourfriend[mSeed] },
      },
      totalHours: pedroH + schrodH + noviceH + mentorH,
      outcome,
    });
  }

  return episodes;
}

const STORAGE_KEYS = {
  MEMBERS: 'road_to_alevel_members_v1',
  DRAGON: 'road_to_alevel_dragon_v1',
  EPISODES: 'road_to_alevel_episodes_v1',
  SOUND_ENABLED: 'road_to_alevel_sound_v1',
};

export function loadSquadMembers(): Record<SquadMemberId, SquadMember> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (raw) return JSON.parse(raw);
  } catch {
    // Fallback
  }
  return INITIAL_MEMBERS;
}

export function saveSquadMembers(members: Record<SquadMemberId, SquadMember>) {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  } catch {
    // Ignored
  }
}

export function loadDragonState(): DragonState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRAGON);
    if (raw) return JSON.parse(raw);
  } catch {
    // Fallback
  }
  return INITIAL_DRAGON;
}

export function saveDragonState(dragon: DragonState) {
  try {
    localStorage.setItem(STORAGE_KEYS.DRAGON, JSON.stringify(dragon));
  } catch {
    // Ignored
  }
}

export function loadEpisodes(): DayEpisode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EPISODES);
    if (raw) return JSON.parse(raw);
  } catch {
    // Fallback
  }
  const seeded = generateSeedEpisodes();
  saveEpisodes(seeded);
  return seeded;
}

export function saveEpisodes(episodes: DayEpisode[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.EPISODES, JSON.stringify(episodes));
  } catch {
    // Ignored
  }
}

// WhatsApp Group Chat Message Parser
export interface ParsedWhatsAppEntry {
  rawLine: string;
  memberId: SquadMemberId | null;
  memberName: string;
  hours: number;
  topic: string;
  matched: boolean;
}

export function parseWhatsAppChat(text: string): ParsedWhatsAppEntry[] {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const results: ParsedWhatsAppEntry[] = [];

  for (const line of lines) {
    const clean = line.trim();

    // Find member
    let memberId: SquadMemberId | null = null;
    let memberName = '';

    if (/pedro/i.test(clean)) {
      memberId = 'pedro';
      memberName = 'Pedro';
    } else if (/schrodinger|schrödinger|cat/i.test(clean)) {
      memberId = 'schrodinger';
      memberName = "Schrödinger's Cat";
    } else if (/novice|dr\.?\s*novice/i.test(clean)) {
      memberId = 'dr_novice';
      memberName = 'Dr. Novice';
    } else if (/notyourfriend|not\s*your\s*friend|friend/i.test(clean)) {
      memberId = 'notyourfriend';
      memberName = 'NotYourFriend';
    }

    // Extract hours (e.g., "5h", "5.5 hrs", "6 hours", "studied 4 hours")
    let hours = 0;
    const hourMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours)/i) || clean.match(/(?:for|studied|worked)\s*(\d+(?:\.\d+)?)/i);
    if (hourMatch) {
      hours = parseFloat(hourMatch[1]);
    }

    // Extract topic: everything after colon or dash, excluding hour string
    let topic = clean;
    const colonIdx = clean.lastIndexOf(':');
    if (colonIdx !== -1 && colonIdx < clean.length - 1) {
      topic = clean.slice(colonIdx + 1).trim();
    }

    results.push({
      rawLine: clean,
      memberId,
      memberName: memberName || 'Unknown Hero',
      hours,
      topic: topic || 'Study/Work session',
      matched: !!memberId && hours > 0,
    });
  }

  return results;
}
