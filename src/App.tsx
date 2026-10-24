/**
 * THE ROAD TO ALEVEL — 3D Animated Series & Daily Study Progression Engine
 * Featuring the EXACT Character Design, Dragon Rig, and Cinematic Sequence from reference.
 */

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { SceneManager, CameraPreset, DURATION } from './three/SceneManager';
import { HeaderNav } from './components/HeaderNav';
import { ControlDock } from './components/ControlDock';
import { EpisodePlayerModal } from './components/EpisodePlayerModal';
import { WhatsAppImportModal } from './components/WhatsAppImportModal';
import { GitHubExportModal } from './components/GitHubExportModal';
import {
  DayEpisode,
  SquadMember,
  DragonState,
  SquadMemberId,
} from './types/progress';
import {
  loadEpisodes,
  saveEpisodes,
  loadSquadMembers,
  loadDragonState,
  saveDragonState,
  computeEpisodeOutcome,
} from './utils/storage';
import { soundManager } from './audio/soundEngine';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  // App state
  const [episodes, setEpisodes] = useState<DayEpisode[]>(() => loadEpisodes());
  const [members] = useState<Record<SquadMemberId, SquadMember>>(() => loadSquadMembers());
  const [dragon, setDragon] = useState<DragonState>(() => loadDragonState());
  const [selectedEpisode, setSelectedEpisode] = useState<DayEpisode | null>(null);
  const [activeCamera, setActiveCamera] = useState<CameraPreset>('cinematic_run');

  // Cinematic timeline & Card Overlays
  const [currentTime, setCurrentTime] = useState(0);
  const [activeCard, setActiveCard] = useState<string | null>(null);

  // Modals
  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  // Cutscene banner notification
  const [cutsceneSubtitle, setCutsceneSubtitle] = useState<string | null>(null);

  // Initialize Three.js WebGL Scene with exact designs
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const manager = new SceneManager({
      container: canvasMountRef.current,
      onCameraChange: (preset) => setActiveCamera(preset),
      onTimelineTime: (t) => setCurrentTime(t),
      onCardChange: (cardId) => setActiveCard(cardId),
    });
    sceneManagerRef.current = manager;

    // Start background ambient on first gesture
    const handleFirstGesture = () => {
      soundManager.startAmbient();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  // Update today's hours manually from sliders
  const handleUpdateTodayHours = (memberId: SquadMemberId, hours: number) => {
    setEpisodes((prevEpisodes) => {
      if (prevEpisodes.length === 0) return prevEpisodes;
      const updated = [...prevEpisodes];
      const today = { ...updated[updated.length - 1] };
      const currentLogs = { ...today.logs };

      currentLogs[memberId] = {
        ...currentLogs[memberId],
        hours,
      };

      const pedroH = currentLogs.pedro?.hours || 0;
      const schrodH = currentLogs.schrodinger?.hours || 0;
      const noviceH = currentLogs.dr_novice?.hours || 0;
      const mentorH = currentLogs.notyourfriend?.hours || 0;

      const outcome = computeEpisodeOutcome(pedroH, schrodH, noviceH, mentorH, today.episodeNumber);

      today.logs = currentLogs;
      today.totalHours = pedroH + schrodH + noviceH + mentorH;
      today.outcome = outcome;

      updated[updated.length - 1] = today;
      saveEpisodes(updated);

      // Update dragon HP damage
      setDragon((prevDragon) => {
        const nextHp = Math.max(0, 10000 - updated.reduce((s, ep) => s + ep.outcome.dragonHpLost, 0));
        const next = { ...prevDragon, currentHp: nextHp };
        saveDragonState(next);
        return next;
      });

      return updated;
    });
  };

  // Apply logs from WhatsApp group parser
  const handleApplyWhatsAppLogs = (newLogs: Record<SquadMemberId, { hours: number; topic: string }>) => {
    setEpisodes((prevEpisodes) => {
      if (prevEpisodes.length === 0) return prevEpisodes;
      const updated = [...prevEpisodes];
      const today = { ...updated[updated.length - 1] };
      const currentLogs = { ...today.logs };

      (['pedro', 'schrodinger', 'dr_novice', 'notyourfriend'] as SquadMemberId[]).forEach((id) => {
        if (newLogs[id]) {
          currentLogs[id] = {
            memberId: id,
            hours: newLogs[id].hours,
            topic: newLogs[id].topic,
          };
        }
      });

      const pedroH = currentLogs.pedro?.hours || 0;
      const schrodH = currentLogs.schrodinger?.hours || 0;
      const noviceH = currentLogs.dr_novice?.hours || 0;
      const mentorH = currentLogs.notyourfriend?.hours || 0;

      const outcome = computeEpisodeOutcome(pedroH, schrodH, noviceH, mentorH, today.episodeNumber);

      today.logs = currentLogs;
      today.totalHours = pedroH + schrodH + noviceH + mentorH;
      today.outcome = outcome;

      updated[updated.length - 1] = today;
      saveEpisodes(updated);

      handlePlayBattle(today);
      return updated;
    });
  };

  // Play battle cutscene in 3D
  const handlePlayBattle = (episode: DayEpisode) => {
    sceneManagerRef.current?.playEpisodeBattle(episode.outcome);
    setActiveCamera('battle_clash');

    // Trigger audio
    soundManager.playSwordSlash();
    setTimeout(() => soundManager.playDragonRoar(), 250);

    // If S-Rank, fire confetti!
    if (episode.outcome.rank === 'S') {
      setTimeout(() => {
        soundManager.playVictoryFanfare();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#38bdf8', '#22c55e', '#a855f7'],
        });
      }, 500);
    }

    const firstLine = episode.outcome.dialogue[0];
    if (firstLine) {
      const speakerName =
        (firstLine.speaker in members
          ? members[firstLine.speaker as SquadMemberId]?.name
          : undefined) || firstLine.speaker.toUpperCase();
      setCutsceneSubtitle(`${speakerName}: "${firstLine.text}"`);
      setTimeout(() => setCutsceneSubtitle(null), 6000);
    }
  };

  const handleSelectEpisode = (ep: DayEpisode) => {
    setSelectedEpisode(ep);
    setIsEpisodeModalOpen(true);
    soundManager.playClick();
  };

  const handleChangeCamera = (preset: CameraPreset) => {
    setActiveCamera(preset);
    sceneManagerRef.current?.setCameraPreset(preset);
  };

  const handleReplayIntro = () => {
    sceneManagerRef.current?.playCinematic();
    setActiveCamera('cinematic_run');
    soundManager.playClick();
  };

  const progressPercent = Math.min(100, (currentTime / DURATION) * 100);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07060d] select-none">
      {/* 1. Isolated 3D WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 z-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* 2. Cinematic Vignette & Letterbox */}
      <div className="absolute inset-0 pointer-events-none z-10 cinematic-vignette opacity-70" />

      {/* 3. Top Header Navigation (Fixed & Unobtrusive) */}
      <HeaderNav
        currentSeason="Season 1: Valley of Past Papers"
        dragonState={dragon}
        onOpenWhatsApp={() => {
          setIsWhatsAppModalOpen(true);
          soundManager.playClick();
        }}
        onOpenGitHubSync={() => {
          setIsGitHubModalOpen(true);
          soundManager.playClick();
        }}
      />

      {/* 4. EXACT CINEMATIC TITLE CARDS (Synchronized with camera track) */}
      <div className={`card-overlay hero-card ${activeCard === 'novice' ? 'on' : ''}`}>
        <span className="by">Pradushan</span>
        <span className="as">as</span>
        <span className="role">Dr. Novice</span>
      </div>

      <div className={`card-overlay hero-card ${activeCard === 'pedro' ? 'on' : ''}`}>
        <span className="role">Pedro</span>
      </div>

      <div className={`card-overlay hero-card ${activeCard === 'nyf' ? 'on' : ''}`}>
        <span className="by">Tharuka</span>
        <span className="as">as</span>
        <span className="role">Not Your Friend</span>
      </div>

      <div className={`card-overlay hero-card ${activeCard === 'cat' ? 'on' : ''}`}>
        <span className="by">Sasen</span>
        <span className="as">as</span>
        <span className="role">Schrödinger’s Cat</span>
      </div>

      <div className={`card-overlay boss-card ${activeCard === 'dragon' ? 'on' : ''}`}>
        <span className="role">ALevel</span>
        <span className="sub">The Dragon</span>
      </div>

      {/* 5. Cinematic Intro Timeline Bar */}
      {activeCamera === 'cinematic_run' && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-900/60 z-30">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-[#d9694a] transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* 6. Cinematic Cutscene Subtitle Banner */}
      {cutsceneSubtitle && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-w-xl w-[90vw] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-950/85 border border-[#d9694a]/50 rounded-xl px-4 py-2.5 shadow-2xl text-center">
            <p className="text-xs md:text-sm font-medium text-amber-200 tracking-wide font-sans">
              {cutsceneSubtitle}
            </p>
          </div>
        </div>
      )}

      {/* 7. Replay Intro Quick Button (Top-Right under Nav) */}
      <div className="fixed top-20 right-4 z-30">
        <button
          onClick={handleReplayIntro}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-amber-300 border border-slate-700/80 text-xs font-semibold shadow-xl cursor-pointer transition-all hover:scale-105 backdrop-blur-md"
        >
          <span>🎬</span>
          <span>Replay 60s Intro</span>
        </button>
      </div>

      {/* 8. Ergonomic Unified Bottom Control Dock */}
      <ControlDock
        episodes={episodes}
        selectedEpisode={selectedEpisode}
        onSelectEpisode={handleSelectEpisode}
        onPlayBattle={handlePlayBattle}
        members={members}
        dragon={dragon}
        activeCamera={activeCamera}
        onChangeCamera={handleChangeCamera}
        onOpenWhatsApp={() => {
          setIsWhatsAppModalOpen(true);
          soundManager.playClick();
        }}
        onUpdateTodayHours={handleUpdateTodayHours}
      />

      {/* 9. Modals */}
      <EpisodePlayerModal
        episode={selectedEpisode}
        isOpen={isEpisodeModalOpen}
        onClose={() => setIsEpisodeModalOpen(false)}
        onReplayBattle3D={handlePlayBattle}
        members={members}
      />

      <WhatsAppImportModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        members={members}
        onApplyLogs={handleApplyWhatsAppLogs}
      />

      <GitHubExportModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        episodes={episodes}
        members={members}
        dragon={dragon}
      />
    </div>
  );
}
