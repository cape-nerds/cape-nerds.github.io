/**
 * ControlDock Component
 * Consolidated, collapsible bottom-center dock following Three.js ergonomic guidelines.
 * Keeps central 3D viewport 100% unobstructed.
 */

import React, { useState } from 'react';
import {
  Film,
  Sword,
  Users,
  Camera,
  ChevronDown,
  ChevronUp,
  Play,
  Plus,
  MessageSquare,
  Award,
  Sparkles,
} from 'lucide-react';
import { DayEpisode, SquadMemberId, SquadMember, DragonState } from '../types/progress';
import { CameraPreset } from '../three/SceneManager';
import { soundManager } from '../audio/soundEngine';

type TabType = 'episodes' | 'log' | 'squad' | 'camera';

interface ControlDockProps {
  episodes: DayEpisode[];
  selectedEpisode: DayEpisode | null;
  onSelectEpisode: (ep: DayEpisode) => void;
  onPlayBattle: (ep: DayEpisode) => void;
  members: Record<SquadMemberId, SquadMember>;
  dragon: DragonState;
  activeCamera: CameraPreset;
  onChangeCamera: (preset: CameraPreset) => void;
  onOpenWhatsApp: () => void;
  onUpdateTodayHours: (memberId: SquadMemberId, hours: number) => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  episodes,
  selectedEpisode,
  onSelectEpisode,
  onPlayBattle,
  members,
  dragon,
  activeCamera,
  onChangeCamera,
  onOpenWhatsApp,
  onUpdateTodayHours,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('episodes');

  const todayEpisode = episodes[episodes.length - 1];

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    soundManager.playClick();
  };

  const handleCameraChange = (preset: CameraPreset) => {
    onChangeCamera(preset);
    soundManager.playClick();
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'S':
        return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      case 'A':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      case 'B':
        return 'text-sky-400 border-sky-500/40 bg-sky-500/10';
      default:
        return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
    }
  };

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[96vw] max-w-[940px] transition-transform duration-300 ease-out ${
        isCollapsed ? 'translate-y-[calc(100%-38px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Top Toggle Pill */}
      <div className="flex justify-center mb-1">
        <button
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            soundManager.playClick();
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] font-mono tracking-wide shadow-xl cursor-pointer transition-all"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Show Series Control Dock [H]</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Cinema Mode / Hide Dock [H]</span>
            </>
          )}
        </button>
      </div>

      {/* Main Glassmorphic Dock Container */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
        {/* Navigation Tabs Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => handleTabChange('episodes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'episodes'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Episodes & Timeline</span>
            </button>

            <button
              onClick={() => handleTabChange('log')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'log'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sword className="w-3.5 h-3.5" />
              <span>Today's Study Log</span>
            </button>

            <button
              onClick={() => handleTabChange('squad')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'squad'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Squad & Dragon</span>
            </button>

            <button
              onClick={() => handleTabChange('camera')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cinematic Shots</span>
            </button>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={() => {
              if (todayEpisode) onPlayBattle(todayEpisode);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Play Today's Battle</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-3 text-xs max-h-56 overflow-y-auto">
          {/* TAB 1: EPISODES & TIMELINE */}
          {activeTab === 'episodes' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono">
                  SEASON 1 (OCTOBER) • {episodes.length} EPISODES GENERATED
                </span>
                <span className="text-amber-400/90 font-medium">Click any episode card to inspect or replay</span>
              </div>

              {/* Horizontal Episode Strip */}
              <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5">
                {episodes.map((ep) => {
                  const isSelected = selectedEpisode?.id === ep.id;
                  const isLatest = ep.id === todayEpisode?.id;

                  return (
                    <div
                      key={ep.id}
                      onClick={() => onSelectEpisode(ep)}
                      className={`min-w-[138px] p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400/70 shadow-lg'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-200 text-xs">
                          EP {ep.episodeNumber}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-bold ${getRankColor(
                            ep.outcome.rank
                          )}`}
                        >
                          RANK {ep.outcome.rank}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium truncate mt-1">
                        {ep.outcome.title.split(': ')[1] || ep.outcome.title}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                        <span>{ep.totalHours.toFixed(1)} hrs</span>
                        {isLatest ? (
                          <span className="text-emerald-400 font-bold">TODAY</span>
                        ) : (
                          <span>{ep.dateStr.slice(5)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: LOG STUDY HOURS */}
          {activeTab === 'log' && todayEpisode && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-[11px] text-slate-400">
                  Update today's study & work hours. Outcome updates automatically at 11:59 PM.
                </div>
                <button
                  onClick={onOpenWhatsApp}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 text-xs font-semibold cursor-pointer w-fit"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  Paste from WhatsApp Group
                </button>
              </div>

              {/* 4 hero log sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {(['pedro', 'schrodinger', 'dr_novice', 'notyourfriend'] as SquadMemberId[]).map((id) => {
                  const member = members[id];
                  const currentHours = todayEpisode.logs[id]?.hours || 0;

                  return (
                    <div key={id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: member.color }} />
                          {member.name}
                        </div>
                        <span className="font-mono font-bold text-amber-400">{currentHours}h</span>
                      </div>

                      {/* Slider & Quick +1h button */}
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="14"
                          step="0.5"
                          value={currentHours}
                          onChange={(e) => onUpdateTodayHours(id, parseFloat(e.target.value))}
                          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                        <button
                          onClick={() => onUpdateTodayHours(id, Math.min(14, currentHours + 1))}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] cursor-pointer"
                          title="Add 1 hour"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-1">
                        {member.type === 'mentor' ? 'Job + Mentorship' : member.specialty}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SQUAD & DRAGON STATS */}
          {activeTab === 'squad' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Squad overview */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                  Squad Heroes (All Swords on Back)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(members).map((m) => (
                    <div key={m.id} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                        <span className="truncate">{m.name}</span>
                        <span className="font-mono text-amber-400 text-[11px]">Lv.{m.level}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{m.role}</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        {m.totalHours.toFixed(1)}h total • {m.appearance.item}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dragon overview */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold flex items-center justify-between">
                  <span>Villain: {dragon.name} (3 Heads)</span>
                  <span className="text-rose-400">{dragon.currentHp} HP</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200">Left Head:</span>{' '}
                      <span className="text-slate-400">{dragon.heads.left.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400">{dragon.heads.left.status}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200">Center Maw:</span>{' '}
                      <span className="text-slate-400">{dragon.heads.center.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-rose-400">{dragon.heads.center.status}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200">Right Fang:</span>{' '}
                      <span className="text-slate-400">{dragon.heads.right.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">{dragon.heads.right.status}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CINEMATIC CAMERA SHOTS */}
          {activeTab === 'camera' && (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400">
                Switch cinematic view angles. Zero camera clipping, smooth physics transitions.
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'cinematic_run', label: '🎬 60s Epic Intro', desc: 'Full cinematic camera track & title' },
                  { id: 'hero_novice', label: '💻 Dr. Novice', desc: 'Pradushan - Laptop & glasses' },
                  { id: 'hero_cat', label: '⚡ Schrödinger', desc: 'Sasen - Monster can & uneasy eyes' },
                  { id: 'hero_pedro', label: '👓 Pedro', desc: 'Pedro - Circle glasses & headphones' },
                  { id: 'hero_nyf', label: '🐉 Not Your Friend', desc: 'Tharuka - Dragon-scale cape' },
                  { id: 'dragon_menace', label: '🐲 ALevel Dragon', desc: '3-headed polygonal wyrm' },
                  { id: 'battle_clash', label: '⚔️ Battle Clash', desc: 'Combat staging & flame breath' },
                  { id: 'free_orbit', label: '🔄 Free Orbit', desc: 'Drag mouse or finger freely' },
                ].map((shot) => {
                  const isActive = activeCamera === shot.id;
                  return (
                    <button
                      key={shot.id}
                      onClick={() => handleCameraChange(shot.id as CameraPreset)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-400/80 text-amber-200 shadow-md'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold text-xs">{shot.label}</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{shot.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
