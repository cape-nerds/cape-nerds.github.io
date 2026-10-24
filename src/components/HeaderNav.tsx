/**
 * HeaderNav Component
 * Shows Series Title, 2027 A-Levels Countdown, 11:59 PM Daily Lock Timer, and Sound Toggle.
 */

import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Shield, Clock, Flame, Calendar, Share2, MessageSquare } from 'lucide-react';
import { soundManager } from '../audio/soundEngine';
import { DragonState } from '../types/progress';

interface HeaderNavProps {
  currentSeason: string;
  dragonState: DragonState;
  onOpenWhatsApp: () => void;
  onOpenGitHubSync: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentSeason,
  dragonState,
  onOpenWhatsApp,
  onOpenGitHubSync,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [timeUntilLock, setTimeUntilLock] = useState('');
  const [daysUntil2027, setDaysUntil2027] = useState(0);

  // Calculate 11:59 PM lock countdown and 2027 A-Levels countdown
  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date();

      // Today's 11:59 PM
      const lockTime = new Date(now);
      lockTime.setHours(23, 59, 59, 999);
      const diffMs = lockTime.getTime() - now.getTime();

      if (diffMs > 0) {
        const h = Math.floor(diffMs / (1000 * 60 * 60));
        const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diffMs % (1000 * 60)) / 1000);
        setTimeUntilLock(`${h}h ${m}m ${s}s`);
      } else {
        setTimeUntilLock('Locked for today');
      }

      // Target A-Levels 2027 (e.g. May 15, 2027)
      const target2027 = new Date('2027-05-15T09:00:00');
      const diffDays = Math.ceil((target2027.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      setDaysUntil2027(Math.max(0, diffDays));
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
    if (!next) {
      soundManager.startAmbient();
      soundManager.playClick();
    }
  };

  const hpPercent = Math.max(0, Math.min(100, Math.round((dragonState.currentHp / dragonState.maxHp) * 100)));

  return (
    <header className="fixed top-0 left-0 right-0 z-30 pointer-events-none p-3 md:p-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Title & Season Info */}
        <div className="pointer-events-auto bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 backdrop-blur-md shadow-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-600 to-rose-700 flex items-center justify-center shadow-lg border border-amber-400/30">
            <Shield className="w-5 h-5 text-amber-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-fantasy font-black tracking-wider text-base md:text-lg text-amber-400 drop-shadow">
                THE ROAD TO ALEVEL
              </h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                3D Series
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-slate-300 font-medium">{currentSeason}</span>
              <span>•</span>
              <span className="text-amber-400/90 font-mono font-semibold">1 Day = 1 Ep</span>
            </div>
          </div>
        </div>

        {/* Center: Dragon HP & Target 2027 Badge */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 backdrop-blur-md shadow-2xl">
          {/* Dragon HP */}
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
            <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
            <div className="text-left">
              <div className="flex items-center justify-between text-[11px] gap-3">
                <span className="font-mono text-slate-300 font-semibold">ALevel Dragon HP</span>
                <span className="font-mono text-rose-400">{dragonState.currentHp} / {dragonState.maxHp}</span>
              </div>
              <div className="w-32 md:w-40 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-1">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-600 transition-all duration-500 rounded-full"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2027 Target */}
          <div className="flex items-center gap-2 pl-1">
            <Calendar className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <div className="text-[10px] uppercase font-mono text-slate-400">Target 2027 ALs</div>
              <div className="text-xs font-mono font-bold text-amber-300">{daysUntil2027} Days Left</div>
            </div>
          </div>
        </div>

        {/* Right: 11:59 PM Counter & Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 backdrop-blur-md shadow-2xl">
          {/* 11:59 PM Timer */}
          <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
            <Clock className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <div className="text-[10px] font-mono text-slate-400">Daily 11:59 PM Lock</div>
              <div className="text-xs font-mono font-bold text-emerald-400">{timeUntilLock}</div>
            </div>
          </div>

          {/* WhatsApp Import quick button */}
          <button
            onClick={onOpenWhatsApp}
            title="Import WhatsApp Daily Study Progress"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-all text-xs font-medium cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">WhatsApp Log</span>
          </button>

          {/* GitHub Sync */}
          <button
            onClick={onOpenGitHubSync}
            title="GitHub Pages & Backup Guide"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer border border-slate-700"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Audio toggle */}
          <button
            onClick={toggleSound}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer border border-slate-700"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
