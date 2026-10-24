/**
 * WhatsAppImportModal Component
 * Parses daily WhatsApp group messages where members post study hours and job progress.
 */

import React, { useState } from 'react';
import { X, MessageSquare, CheckCircle, AlertCircle, Sparkles, Send } from 'lucide-react';
import { parseWhatsAppChat, ParsedWhatsAppEntry } from '../utils/storage';
import { SquadMemberId, SquadMember } from '../types/progress';
import { soundManager } from '../audio/soundEngine';

interface WhatsAppImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Record<SquadMemberId, SquadMember>;
  onApplyLogs: (logs: Record<SquadMemberId, { hours: number; topic: string }>) => void;
}

const SAMPLE_WHATSAPP_TEXT = `[10:15 PM] Pedro: Finished Pure Maths 3 - 2023 Paper 32 integration & vectors, 6.5 hours!
[10:48 PM] Dr. Novice: Mechanics M1 momentum & impulse + pure complex numbers (7 hrs)
[11:05 PM] Schrödinger's Cat: Bio Unit 4 cellular respiration & gene technology (5.5 hrs), chugged another Monster
[11:22 PM] NotYourFriend: Full-stack sprint at job + reviewed Pedro's vector proofs (8 hrs)`;

export const WhatsAppImportModal: React.FC<WhatsAppImportModalProps> = ({
  isOpen,
  onClose,
  members,
  onApplyLogs,
}) => {
  const [chatText, setChatText] = useState(SAMPLE_WHATSAPP_TEXT);
  const [parsedEntries, setParsedEntries] = useState<ParsedWhatsAppEntry[]>(() =>
    parseWhatsAppChat(SAMPLE_WHATSAPP_TEXT)
  );

  if (!isOpen) return null;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setChatText(text);
    setParsedEntries(parseWhatsAppChat(text));
  };

  const handleLoadSample = () => {
    setChatText(SAMPLE_WHATSAPP_TEXT);
    setParsedEntries(parseWhatsAppChat(SAMPLE_WHATSAPP_TEXT));
    soundManager.playClick();
  };

  const handleApply = () => {
    const logs: Record<SquadMemberId, { hours: number; topic: string }> = {
      dr_novice: { hours: 6, topic: 'Pure Maths 3 & Mechanics' },
      schrodinger: { hours: 5, topic: 'Cellular Biology' },
      pedro: { hours: 6, topic: 'Pure Maths 3 Past Papers' },
      notyourfriend: { hours: 8, topic: 'Software Job & Mentorship' },
    };

    parsedEntries.forEach((entry) => {
      if (entry.memberId && entry.hours > 0) {
        logs[entry.memberId] = {
          hours: entry.hours,
          topic: entry.topic,
        };
      }
    });

    soundManager.playSwordSlash();
    onApplyLogs(logs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                WhatsApp Group Progress Importer
              </h2>
              <p className="text-xs text-slate-400">
                Paste your daily study & job progress from WhatsApp. Closes at 11:59 PM.
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
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-sm">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Paste WhatsApp Messages</label>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Reset Sample WhatsApp Log
              </button>
            </div>
            <textarea
              value={chatText}
              onChange={handleTextChange}
              rows={5}
              placeholder="Paste lines like: [10:45 PM] Pedro: Pure maths 3 past papers done, 6 hours..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500/80 transition-all resize-none"
            />
          </div>

          {/* Parsed summary cards */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Recognized Hero Entries ({parsedEntries.filter((p) => p.matched).length} / 4)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(['pedro', 'schrodinger', 'dr_novice', 'notyourfriend'] as SquadMemberId[]).map((id) => {
                const member = members[id];
                const matched = parsedEntries.find((p) => p.memberId === id);

                return (
                  <div
                    key={id}
                    className={`p-3 rounded-xl border transition-all ${
                      matched
                        ? 'bg-slate-800/80 border-emerald-500/50 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: member.color }} />
                        <span className="font-semibold text-xs text-white">{member.name}</span>
                      </div>
                      {matched ? (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          <CheckCircle className="w-3 h-3" />
                          {matched.hours}h logged
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                          <AlertCircle className="w-3 h-3" />
                          No entry yet
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 truncate">
                      {matched ? matched.topic : member.specialty}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Total Combined:{' '}
            <span className="font-mono font-bold text-amber-400">
              {parsedEntries.reduce((sum, e) => sum + (e.hours || 0), 0).toFixed(1)} hrs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Update Today's Episode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
