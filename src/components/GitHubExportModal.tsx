/**
 * GitHubExportModal Component
 * Provides GitHub Pages hosting instructions, JSON squad data export, and README Markdown generator.
 */

import React, { useState } from 'react';
import { X, Github, Download, Copy, Check, FileCode, ExternalLink } from 'lucide-react';
import { DayEpisode, SquadMember, DragonState } from '../types/progress';
import { soundManager } from '../audio/soundEngine';

interface GitHubExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  episodes: DayEpisode[];
  members: Record<string, SquadMember>;
  dragon: DragonState;
}

export const GitHubExportModal: React.FC<GitHubExportModalProps> = ({
  isOpen,
  onClose,
  episodes,
  members,
  dragon,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentEp = episodes[episodes.length - 1];

  // Markdown for GitHub repository README
  const readmeMarkdown = `# 🐉 THE ROAD TO ALEVEL (2027)

> An interactive 3D paper-craft animated series & daily study progression engine built in Three.js.
> 1 Season = 1 Month | 1 Episode = 1 Day | Closed every day at 11:59 PM.

### ⚔️ The Squad vs A-Level Dragon

| Hero | Role | Level | Total Hours | Weapon / Relic |
| :--- | :--- | :---: | :---: | :--- |
| **Pedro** | 1st Shy Maths | Lv.${members.pedro?.level || 16} | ${members.pedro?.totalHours.toFixed(1)}h | Retro Studio Headphones + Integral Blade |
| **Dr. Novice** | 2nd Shy Maths | Lv.${members.dr_novice?.level || 14} | ${members.dr_novice?.totalHours.toFixed(1)}h | Mechanics Laptop + Kinematic Saber |
| **Schrödinger's Cat** | 2nd Shy Bio | Lv.${members.schrodinger?.level || 13} | ${members.schrodinger?.totalHours.toFixed(1)}h | Monster Energy Can + Double-Helix Katana |
| **NotYourFriend** | ALs Conqueror (Mentor) | Lv.${members.notyourfriend?.level || 28} | ${members.notyourfriend?.totalHours.toFixed(1)}h | Legendary Dragon-Scale Cape + Greatsword |

### 🐲 Villain Status: A-LEVEL Dragon
- **HP Remaining**: ${dragon.currentHp} / ${dragon.maxHp} (${Math.round((dragon.currentHp / dragon.maxHp) * 100)}%)
- **Current Day Episode**: ${currentEp ? currentEp.outcome.title : 'Active War'}
- **Outcome Rank**: ${currentEp ? currentEp.outcome.rank : 'A'}
- **Target Exam**: Summer 2027 A-Levels

### 🚀 Host on GitHub Pages
This project is 100% client-side (no video files, purely procedural 3D WebGL meshes in Three.js).
\`\`\`bash
# 1. Install & build
npm install
npm run build

# 2. Deploy dist/ to gh-pages branch
npx gh-pages -d dist
\`\`\`
`;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(readmeMarkdown);
    setCopiedType('markdown');
    soundManager.playClick();
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleExportJson = () => {
    const backupData = {
      seriesTitle: 'THE ROAD TO ALEVEL',
      targetYear: 2027,
      exportedAt: new Date().toISOString(),
      dragon,
      members,
      episodes,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `road_to_alevel_progress_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    soundManager.playClick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                GitHub Pages & Series Backup
              </h2>
              <p className="text-xs text-slate-400">
                Deploy to GitHub Pages and sync your squad's animated journey to 2027
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-200 leading-relaxed">
            <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-purple-400" />
              Yes, your plan is 100% possible on GitHub Pages!
            </div>
            Because this series uses procedural Three.js WebGL rendering instead of heavy video files, it is super lightweight, runs smoothly in any browser, and requires zero video hosting costs!
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                GitHub README.md Status Badge & Table
              </h3>
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
              >
                {copiedType === 'markdown' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedType === 'markdown' ? 'Copied to Clipboard!' : 'Copy Markdown'}
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
              {readmeMarkdown}
            </pre>
          </div>

          {/* Quick steps */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
              Deploying on GitHub Pages
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs">
              <li>Initialize git repo: <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300">git init && git add .</code></li>
              <li>Push to your GitHub repository: <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300">git push origin main</code></li>
              <li>In your repo Settings &gt; Pages, select <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300">GitHub Actions</code> or <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300">gh-pages</code> branch.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            Download Squad Progress JSON
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
