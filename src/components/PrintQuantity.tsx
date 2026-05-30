import React, { useState } from 'react';
import { FrameType } from '../types';
import { FRAMES } from '../lib/FrameSelection';
import { Printer, Minus, Plus, CreditCard, Sparkles, Check } from 'lucide-react';

interface PrintQuantityProps {
  selectedFrameId: string;
  compiledPhotoUrl: string;
  basePrice: number;
  extraPrice: number;
  onQuantitySelected: (quantity: number, totalCost: number) => void;
  onBack: () => void;
}

export default function PrintQuantity({
  selectedFrameId,
  compiledPhotoUrl,
  basePrice,
  extraPrice,
  onQuantitySelected,
  onBack
}: PrintQuantityProps) {
  const currentFrame = FRAMES.find(f => f.id === selectedFrameId) || FRAMES[0];
  const [quantity, setQuantity] = useState<number>(1);

  // Calculate dynamic pricing
  const calculateTotal = (qty: number): number => {
    return basePrice + Math.max(0, qty - 1) * extraPrice;
  };

  const totalCost = calculateTotal(quantity);

  const incrementQty = () => {
    setQuantity(prev => Math.min(20, prev + 1));
  };

  const decrementQty = () => {
    setQuantity(prev => Math.max(1, prev - 1));
  };

  const selectQtyPreset = (val: number) => {
    setQuantity(val);
  };

  const handleConfirm = () => {
    onQuantitySelected(quantity, totalCost);
  };

  return (
    <div id="print-quantity-view" className="space-y-8 animate-fade-in">
      <div className="text-center">
        <button id="btn-back-to-capture" onClick={onBack} className="text-xs font-black text-orange-500 hover:text-orange-400 transition-colors font-mono uppercase tracking-wider">
          ← EDIT / REMODEL CONTOH FOTO
        </button>
        <h2 className="text-3xl font-black text-white tracking-tight mt-2 uppercase font-mono">JUMLAH CETAK</h2>
        <p className="text-zinc-400 mt-1.5 text-xs font-mono uppercase tracking-wide">Pilih berapa banyak copy strip kertas kustom yang ingin dicetak ke printer bluetooth.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: LIVE PRINT STRIP PREVIEW */}
        <div className="md:col-span-5 bg-zinc-900 p-6 rounded-3xl border border-zinc-800 flex flex-col items-center">
          <p className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest mb-4 font-mono">Hasil Foto Gabungan (Strip)</p>
          <div className="w-56 overflow-hidden rounded-xl shadow-2xl relative border border-zinc-950 transition-transform duration-300 hover:scale-105">
            {compiledPhotoUrl ? (
              <img src={compiledPhotoUrl} alt="Compiled photobox" className="w-full h-auto" />
            ) : (
              <div className="bg-zinc-950 aspect-[1/3] flex items-center justify-center p-4">
                <Spinner />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PRICE CALCULATOR & CONTROLS */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Quick Preset Selector Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-widest">Pilih Paket Cetak</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Single Strip', qty: 1, desc: '1 Lembar Cetak' },
                { label: 'Triple Pack', qty: 3, desc: '3 Lembar Cetak' },
                { label: 'Group Party', qty: 5, desc: '5 Lembar Cetak' }
              ].map((preset) => {
                const isActive = quantity === preset.qty;
                const price = calculateTotal(preset.qty);
                return (
                  <button
                    key={preset.qty}
                    id={`preset-${preset.qty}`}
                    onClick={() => selectQtyPreset(preset.qty)}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between h-28 font-mono transition-all ${
                      isActive
                        ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/20 shadow-sm'
                        : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900 shadow-sm text-zinc-300'
                    }`}
                  >
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-orange-400' : 'text-zinc-500'}`}>
                        {preset.label}
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-1">{preset.desc}</p>
                    </div>
                    <span className="text-sm font-black text-white">
                      Rp {price.toLocaleString('id-ID')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* QUANTITY COUNTER PANEL */}
          <div className="bg-zinc-900 border border-zinc-805 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs font-black text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-orange-500" /> Jumlah Lembar Cetak
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 font-mono uppercase">Gunakan tombol (+) atau (-) untuk menambah jumlah Lembar kustom.</p>
            </div>

            <div className="flex items-center gap-4 bg-zinc-955 border border-zinc-800 rounded-full p-1 shadow-inner">
              <button
                id="btn-qty-minus"
                onClick={decrementQty}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition active:scale-90 border border-zinc-805"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <span className="w-12 text-center text-xl font-black text-white font-mono">
                {quantity}
              </span>

              <button
                id="btn-qty-plus"
                onClick={incrementQty}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-black transition active:scale-90 shadow-md shadow-orange-500/15"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TOTAL COST COMPONENT */}
          <div className="bg-zinc-900 text-white rounded-3xl p-6 border border-zinc-800 space-y-4 relative overflow-hidden">
            <h3 className="text-[10px] font-black tracking-widest text-orange-400 uppercase font-mono">Rincian Pembayaran Kiosk</h3>
            
            <div className="space-y-2 border-b border-zinc-800 pb-4 font-mono text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Paket Dasar (1 Lembar)</span>
                <span>Rp {basePrice.toLocaleString('id-ID')}</span>
              </div>
              
              {quantity > 1 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Ekstra Copy ({quantity - 1} Lembar @ Rp {extraPrice.toLocaleString('id-ID')})</span>
                  <span>+Rp {((quantity - 1) * extraPrice).toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <div>
                <p className="text-[10px] text-zinc-500 font-mono uppercase">Total Harga Akhir</p>
                <p className="text-[10px] text-orange-400 font-bold font-mono uppercase">Metode Sesi: QRIS / E-Wallet</p>
              </div>
              <p className="text-3xl font-black text-white font-mono">
                Rp {totalCost.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* PROCEED ACTION */}
          <button
            id="btn-confirm-quantity"
            onClick={handleConfirm}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black py-4 rounded-2xl shadow-lg shadow-orange-500/25 transition active:scale-[0.98] text-xs uppercase tracking-widest flex items-center justify-center gap-2 font-mono"
          >
            <CreditCard className="w-4 h-4" />
            <span>Lanjut Pembayaran Digital QRIS 💳</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center space-y-2 text-zinc-500 font-mono">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-[10px] font-black uppercase tracking-wider">Memproses Strip...</span>
    </div>
  );
}
