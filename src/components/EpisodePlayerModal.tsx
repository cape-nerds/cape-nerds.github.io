/**
 * EpisodePlayerModal Component
 * Shows episode battle chronicle, dialogue, rank badge, and triggers 3D cutscene replay.
 */

import React from 'react';
import { X, Play, Award, Zap, Flame, UserCheck } from 'lucide-react';
import { DayEpisode, SquadMember } from '../types/progress';
import { soundManager } from '../audio/soundEngine';

interface EpisodePlayerModalProps {
  isOpen: boolean;
  episode: DayEpisode | null;
  onClose: () => void;
  onReplayBattle3D: (episode: DayEpisode) => void;
  members: Record<string, SquadMember>;
}

export const EpisodePlayerModal: React.FC<EpisodePlayerModalProps> = ({
  isOpen,
  episode,
  onClose,
  onReplayBattle3D,
  members,
}) => {
  if (!isOpen || !episode) return null;

  const { outcome } = episode;

  const getRankBadge = (rank: string) => {
    switch (rank) {
      case 'S':
        return {
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/20',
          label: 'S-Rank Strike',
          sub: 'Dragon Staggered!',
        };
      case 'A':
        return {
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20',
          label: 'A-Rank Victory',
          sub: 'Tactical Advance',
        };
      case 'B':
        return {
          bg: 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-blue-500/20',
          label: 'B-Rank Stalemate',
          sub: 'Fierce Skirmish',
        };
      default:
        return {
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-500/20',
          label: 'C-Rank Defense',
          sub: 'Desperate Siege',
        };
    }
  };

  const badge = getRankBadge(outcome.rank);

  const handlePlayCutscene = () => {
    soundManager.playSwordSlash();
    setTimeout(() => soundManager.playDragonRoar(), 200);
    onReplayBattle3D(episode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header / Title Card */}
        <div className="relative p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border shadow-lg ${badge.bg}`}>
              RANK {outcome.rank} • {badge.label}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Season {episode.seasonNumber} • Episode {episode.episodeNumber} ({episode.dateStr})
            </span>
          </div>

          <h2 className="mt-2 font-fantasy text-xl md:text-2xl font-black text-amber-300 drop-shadow">
            {outcome.title}
          </h2>

          <p className="mt-1 text-xs md:text-sm text-slate-300 leading-relaxed font-sans">
            {outcome.synopsis}
          </p>

          {/* Quick battle outcome metrics */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Dragon Damage: -{outcome.dragonHpLost} HP</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Squad EXP: +{outcome.squadExpGained} EXP</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/30">
              <Award className="w-3.5 h-3.5 text-sky-400" />
              <span>MVP: {members[outcome.heroHighlight]?.name || 'Squad'}</span>
            </div>
          </div>
        </div>

        {/* Content: Hours Breakdown & Cutscene Dialogue */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-sm">
          {/* Member Hours Breakdown */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-400" />
              Daily Study & Job Hours Logged ({episode.totalHours.toFixed(1)} hrs total)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(episode.logs).map(([id, log]) => {
                const member = members[id];
                if (!member) return null;
                return (
                  <div key={id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold truncate">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: member.color }} />
                      {member.name}
                    </div>
                    <div className="mt-1 font-mono text-base font-bold text-amber-400">
                      {log.hours} <span className="text-xs text-slate-400 font-normal">hrs</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{log.topic}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Dialogue Transcript */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              Episode Dialogue Transcript
            </h3>
            <div className="space-y-2.5">
              {outcome.dialogue.map((item, idx) => {
                const member = members[item.speaker];
                const speakerName = member ? member.name : item.speaker.toUpperCase();
                const speakerColor = member ? member.color : '#f59e0b';

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-white shadow"
                      style={{ backgroundColor: speakerColor }}
                    >
                      {speakerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-xs space-y-0.5">
                      <div className="font-semibold text-slate-200">{speakerName}</div>
                      <p className="text-slate-300 italic font-sans leading-relaxed">
                        "{item.text}"
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            Status: {episode.isClosed ? 'Locked at 11:59 PM' : 'Ongoing today'}
          </div>
          <button
            onClick={handlePlayCutscene}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Watch 3D Battle Reenactment
          </button>
        </div>
      </div>
    </div>
  );
};
