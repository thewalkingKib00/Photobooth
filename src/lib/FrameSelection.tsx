import React from 'react';
import { FrameType } from '../types';
import { Calendar, Heart, MessageSquare, Flame, Sparkles, Smile } from 'lucide-react';

interface FrameSelectionProps {
  selectedFrameId: string;
  onSelectFrame: (id: string) => void;
  onNext: () => void;
  framesList?: FrameType[];
}

export const FRAMES: FrameType[] = [
  {
    id: 'classic-pink',
    name: 'Classic Pink Valentine',
    label: 'Soft Pastel Pink with cute love vibes',
    theme: 'bg-rose-100',
    borderStyle: 'border-rose-400 border-8 shadow-rose-200/50',
    textColor: 'text-rose-700',
    accentColor: 'bg-rose-500',
    patterns: 'love'
  },
  {
    id: 'retro-dark',
    name: 'Retro Monokrom',
    label: 'Elegant vintage cinema aesthetic',
    theme: 'bg-neutral-900',
    borderStyle: 'border-neutral-800 border-8 shadow-neutral-950/40',
    textColor: 'text-neutral-300',
    accentColor: 'bg-yellow-600',
    patterns: 'vintage'
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon Grid',
    label: 'Synthwave neon purple & cyan grid',
    theme: 'bg-violet-950',
    borderStyle: 'border-fuchsia-600 border-8 shadow-fuchsia-500/30',
    textColor: 'text-cyan-300',
    accentColor: 'bg-cyan-500',
    patterns: 'cyber'
  },
  {
    id: 'minimal-white',
    name: 'Minimalist Clean White',
    label: 'Pure clean modern photo gallery look',
    theme: 'bg-white',
    borderStyle: 'border-slate-100 border-8 shadow-slate-200/60',
    textColor: 'text-slate-800',
    accentColor: 'bg-slate-900',
    patterns: 'clean'
  },
  {
    id: 'summer-sun',
    name: 'Summer Breeze',
    label: 'Teal sky and sunny warm gradients',
    theme: 'bg-amber-50',
    borderStyle: 'border-sky-400 border-8 shadow-sky-200/50',
    textColor: 'text-sky-700',
    accentColor: 'bg-amber-500',
    patterns: 'summer'
  },
  {
    id: 'forest-sage',
    name: 'Sage Meadow',
    label: 'Earthy calm natural sage green',
    theme: 'bg-emerald-950',
    borderStyle: 'border-emerald-800 border-8 shadow-emerald-900/30',
    textColor: 'text-emerald-300',
    accentColor: 'bg-emerald-600',
    patterns: 'forest'
  }
];

export default function FrameSelection({ selectedFrameId, onSelectFrame, onNext, framesList }: FrameSelectionProps) {
  const activeFrames = framesList || FRAMES;
  const currentFrame = activeFrames.find(f => f.id === selectedFrameId) || activeFrames[0];

  return (
    <div id="frame-selector-view" className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">PILIH FRAME KERTAS</h2>
        <p className="text-zinc-400 mt-2 text-sm">Pilih tema dan bingkai printer untuk mempercantik hasil cetakanmu.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Frame Cards List */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-2">
          {activeFrames.map((frame) => {
            const isSelected = frame.id === selectedFrameId;
            return (
              <button
                key={frame.id}
                id={`frame-btn-${frame.id}`}
                onClick={() => onSelectFrame(frame.id)}
                className={`p-2.5 rounded-lg border text-left transition-all duration-300 flex flex-col justify-between h-24 relative overflow-hidden ${
                  isSelected
                    ? 'border-orange-500 ring-1.5 ring-orange-500/20 bg-orange-950/20 shadow-sm'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-850'
                }`}
              >
                {/* Optional Custom Background Rendering inside select card */}
                {frame.customBg && (
                  <div className="absolute inset-0 opacity-15 pointer-events-none">
                    <img src={frame.customBg} alt="frame pattern overlay" className="w-full h-full object-cover" />
                  </div>
                )}
                
                <div className="w-full relative z-10">
                  <div className="flex justify-between items-start gap-1">
                    <span className={`font-bold text-xs truncate ${isSelected ? 'text-orange-500' : 'text-zinc-200'}`}>
                      {frame.name}
                    </span>
                    {isSelected && (
                      <span className="bg-orange-500 text-black text-[8px] px-1 py-0.5 rounded font-black flex-shrink-0">
                        OK
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{frame.label}</p>
                </div>

                <div className="flex items-center gap-1.5 mt-auto relative z-10 font-mono">
                  <div 
                    className={`w-4.5 h-4.5 rounded-full border border-zinc-750 shadow-inner flex items-center justify-center`}
                    style={{ backgroundColor: frame.theme.includes('[') ? frame.theme.slice(4, -1) : undefined }}
                  >
                    <span className="text-[7px] font-bold text-gray-400">#</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 italic">Style: {frame.patterns || 'basic'}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Preview Column */}
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center">
          <p className="text-xs text-zinc-400 font-semibold mb-4 uppercase tracking-widest">Preview Frame Kertas</p>
          
          {/* Mockup Frame Strips */}
          <div 
            className={`w-40 p-3 rounded-md shadow-2xl transition-all duration-500 ${currentFrame.theme} ${currentFrame.borderStyle} relative overflow-hidden`}
            style={{ 
              backgroundColor: currentFrame.theme.includes('[') ? currentFrame.theme.slice(4, -1) : undefined,
              borderColor: currentFrame.borderStyle.includes('[') ? currentFrame.borderStyle.match(/border-\[([^\]]+)\]/)?.[1] : undefined
            }}
          >
            {/* Real-time custom background design overlay inside preview strip */}
            {currentFrame.customBg && (
              <img src={currentFrame.customBg} alt="custom overlay design" className="absolute inset-x-0 bottom-0 top-0 opacity-40 pointer-events-none w-full h-full object-cover" />
            )}

            <div className="space-y-2 relative z-10">
              {/* Photo Places */}
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-zinc-800/80 aspect-[4/3] rounded flex items-center justify-center text-center p-1 border border-zinc-700/80 border-dashed"
                >
                  <Smile className={`w-4 h-4 opacity-50 ${currentFrame.textColor}`} />
                </div>
              ))}
            </div>

            {/* Bottom Brand Frame Section */}
            <div className="mt-3 text-center relative z-10">
              <p className={`text-[10px] font-bold tracking-wider uppercase font-mono ${currentFrame.textColor}`}>
                ♥ PHOTOBOOT ♥
              </p>
              <p className={`text-[6px] opacity-75 font-mono ${currentFrame.textColor} flex items-center justify-center gap-0.5 mt-0.5`}>
                <Calendar className="w-1.5 h-1.5" /> {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>

          <div className="text-center mt-6 w-full">
            <h4 className="text-sm font-semibold text-zinc-250">{currentFrame.name}</h4>
            <p className="text-xs text-zinc-400 mt-1">Strip cetak 4 pose vertikal</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-zinc-800">
        <button
          id="btn-next-to-camera"
          onClick={onNext}
          className="bg-orange-500 hover:bg-orange-600 text-black font-extrabold px-8 py-3 rounded-xl shadow-lg shadow-orange-500/15 active:scale-95 transition-all text-sm flex items-center gap-2 uppercase tracking-wider"
        >
          <span>Lanjut ke Sesi Foto ✨</span>
        </button>
      </div>
    </div>
  );
}
