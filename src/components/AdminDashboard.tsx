import React, { useState, useEffect } from 'react';
import { Transaction, PaperStock, AppSettings, FrameType } from '../types';
import { Database, FileSpreadsheet, Printer, Sliders, RefreshCw, Plus, CheckCircle, AlertTriangle, CloudRain, Trash2, Upload, Sparkles, Smile, Image as ImageIcon } from 'lucide-react';

interface AdminDashboardProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  transactions: Transaction[];
  onAddTransaction: (tx: Partial<Transaction>) => void;
  onClearTransactions?: () => void;
  paperStock: PaperStock;
  onUpdateStock: (newStock: Partial<PaperStock>) => void;
  onImportCustomFrame?: (newFrame: FrameType) => void;
}

export default function AdminDashboard({
  settings,
  onSaveSettings,
  transactions,
  onAddTransaction,
  onClearTransactions,
  paperStock,
  onUpdateStock,
  onImportCustomFrame
}: AdminDashboardProps) {
  // Local config inputs
  const [countdown, setCountdown] = useState<number>(settings.countdownSeconds);
  const [basePrice, setBasePrice] = useState<number>(settings.priceBase);
  const [extraPrice, setExtraPrice] = useState<number>(settings.priceExtraCopy);
  const [sheetUrl, setSheetUrl] = useState<string>(settings.spreadsheetUrl || 'https://docs.google.com/spreadsheets/d/1_9v02z_PboxTerminalData2026/edit');
  const [bluetoothName, setBluetoothName] = useState<string>(settings.printerBluetoothName);
  const [boothNameInput, setBoothNameInput] = useState<string>(settings.boothName || 'SNAPBOX PRO');
  const [sessionTimeoutInput, setSessionTimeoutInput] = useState<number>(settings.sessionTimeoutSeconds || 60);
  const [qrisPayloadInput, setQrisPayloadInput] = useState<string>(settings.qrisPayload || '');

  // Multi Bluetooth Printer Discovery Flow
  const [isScanningBluetooth, setIsScanningBluetooth] = useState<boolean>(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<{ name: string; mac: string; type: string }[]>([]);
  const [bluetoothStatusMsg, setBluetoothStatusMsg] = useState<string>('');

  // Safeguard settings handlers for zero or empty values
  const sanitizeCountdown = (val: number) => {
    return isNaN(val) || val < 1 ? 5 : val;
  };
  const sanitizeBasePrice = (val: number) => {
    return isNaN(val) || val < 1000 ? 15000 : val;
  };
  const sanitizeExtraPrice = (val: number) => {
    return isNaN(val) || val < 500 ? 5000 : val;
  };
  const sanitizeSessionTimeout = (val: number) => {
    return isNaN(val) || val < 10 ? 60 : val;
  };

  const handleCountdownBlur = () => {
    setCountdown(prev => sanitizeCountdown(prev));
  };

  const handleBasePriceBlur = () => {
    setBasePrice(prev => sanitizeBasePrice(prev));
  };

  const handleExtraPriceBlur = () => {
    setExtraPrice(prev => sanitizeExtraPrice(prev));
  };

  const handleSessionTimeoutBlur = () => {
    setSessionTimeoutInput(prev => sanitizeSessionTimeout(prev));
  };

  // Custom Frame Import state
  const [importFrameName, setImportFrameName] = useState<string>('');
  const [importFrameColor, setImportFrameColor] = useState<string>('#6366f1'); // default indigo
  const [importFramePattern, setImportFramePattern] = useState<string>('custom-disco');
  const [importFrameLabel, setImportFrameLabel] = useState<string>('Pre-loaded designer template package');
  const [importedFileBase64, setImportedFileBase64] = useState<string>('');
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // States
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Baru saja diselaraskan');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync to spreadsheet animation
  const handleSpreadsheetSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      onSaveSettings({
        ...settings,
        spreadsheetUrl: sheetUrl
      });
    }, 1200);
  };

  const handleUpdateStock = (amount: number) => {
    const updatedQty = Math.min(paperStock.capacity, paperStock.current + amount);
    onUpdateStock({ current: updatedQty });
  };

  // Scan Nearby Bluetooth Devices (Printers)
  const handleScanBluetooth = () => {
    setIsScanningBluetooth(true);
    setBluetoothStatusMsg('Mencari pencetak nirkabel bluetooth terdekat...');
    setDiscoveredPrinters([]);
    setTimeout(() => {
      setIsScanningBluetooth(false);
      setDiscoveredPrinters([
        { name: 'Canon SELPHY CP1300 Printer spooler', mac: '00:1E:C2:5B:43:88', type: 'Dye-Sublimation High Quality' },
        { name: 'Paperang F1S Direct Thermal', mac: '84:AF:CA:21:E9:10', type: 'Thermal Receipt 58mm' },
        { name: 'Fujifilm instax Link WIDE 2', mac: 'CC:B4:EF:3A:D8:1A', type: 'Instant Wide Paper Film' },
        { name: 'ZMR Pocket Kiosk Print', mac: 'FE:98:AA:77:B2:DC', type: 'High Density Lab Strip' }
      ]);
      setBluetoothStatusMsg('Selesai memindai. Pilih perangkat di bawah untuk menghubungkan.');
    }, 1500);
  };

  const handleConnectPrinter = (printer: { name: string }) => {
    setBluetoothName(printer.name);
    onSaveSettings({
      ...settings,
      printerBluetoothName: printer.name,
      isPrinterConnected: true
    });
    setBluetoothStatusMsg(`Koneksi Sukses! Terhubung ke bluetooth "${printer.name}" ✔`);
  };

  const saveConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCountdown = sanitizeCountdown(countdown);
    const cleanBasePrice = sanitizeBasePrice(basePrice);
    const cleanExtraPrice = sanitizeExtraPrice(extraPrice);
    const cleanSessionTimeout = sanitizeSessionTimeout(sessionTimeoutInput);

    setCountdown(cleanCountdown);
    setBasePrice(cleanBasePrice);
    setExtraPrice(cleanExtraPrice);
    setSessionTimeoutInput(cleanSessionTimeout);

    onSaveSettings({
      countdownSeconds: cleanCountdown,
      priceBase: cleanBasePrice,
      priceExtraCopy: cleanExtraPrice,
      spreadsheetUrl: sheetUrl,
      printerBluetoothName: bluetoothName,
      isPrinterConnected: settings.isPrinterConnected,
      boothName: boothNameInput,
      sessionTimeoutSeconds: cleanSessionTimeout,
      qrisPayload: qrisPayloadInput
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Simulated drag and drop handle
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImportedFileBase64(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateCustomFrame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFrameName) return;

    const newFrame: FrameType = {
      id: 'custom-' + Date.now(),
      name: importFrameName + ' (Custom)',
      label: importFrameLabel,
      theme: `bg-[${importFrameColor}]`,
      borderStyle: `border-[${importFrameColor}] border-8 shadow-2xl`,
      textColor: 'text-zinc-100',
      accentColor: 'bg-zinc-850',
      patterns: importFramePattern,
      customBg: importedFileBase64 || undefined
    };

    if (onImportCustomFrame) {
      onImportCustomFrame(newFrame);
    }

    setImportSuccess(true);
    setTimeout(() => {
      setImportSuccess(false);
      setImportFrameName('');
      setImportedFileBase64('');
    }, 2800);
  };

  // Status computation
  const isPaperLow = paperStock.current <= paperStock.lowThreshold;
  const paperPercentage = Math.round((paperStock.current / paperStock.capacity) * 100);

  return (
    <div id="admin-dashboard-view" className="space-y-8 animate-fade-in text-zinc-100">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-2">
            <span className="text-orange-500">ADMIN</span> CONTROL COCKPIT
          </h2>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold font-mono">
            PEMANTAUAN TRANSAKSI, STOK KERTAS & SISTEM INTEGRASI SPREADSHEET SECARA REAL-TIME.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Config Saver Button trigger */}
          <button
            type="button"
            onClick={() => saveConfig()}
            className="bg-orange-500 hover:bg-orange-600 text-black text-xs font-black uppercase px-4 py-2.5 rounded-lg active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Simpan Semua Pengaturan 💾</span>
          </button>

          <button
            id="btn-sync-sheet"
            onClick={handleSpreadsheetSync}
            disabled={isSyncing}
            className="bg-green-500 hover:bg-green-600 text-black text-xs font-black uppercase px-4 py-2.5 rounded-lg active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-green-500/20"
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron Google Sheet ↺'}</span>
          </button>
        </div>
      </div>

      {/* THREE BENTO WIDGETS COLUMN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* WIDGET 1: PAPER STOCK */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">REFILL STASIUN</span>
              <h3 className="text-sm font-black uppercase text-zinc-200">STOK KERTAS BOOTH</h3>
            </div>
            <Printer className="w-5 h-5 text-orange-500" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-4xl font-extrabold font-mono text-zinc-100">
                {paperStock.current} <span className="text-sm font-normal text-zinc-400">/ {paperStock.capacity} lembar</span>
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${isPaperLow ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                {isPaperLow ? 'STOK LIMIT!' : 'STOK AMAN'}
              </span>
            </div>

            {/* PROGRESS BAR */}
            <div className="w-full h-2.5 bg-zinc-950 rounded-full border border-zinc-850 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${isPaperLow ? 'bg-red-500' : 'bg-orange-500'}`}
                style={{ width: `${Math.min(100, paperPercentage)}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-400 font-mono italic">Kapasitas Maksimal Paper Box: {paperStock.capacity} Lembar</p>
          </div>

          {/* ADD STOCK ACTION BARS */}
          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-2.5">
            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block font-mono">Restock Paper Rolls</span>
            <div className="flex items-center gap-1">
              <button
                id="btn-stock-add-20"
                onClick={() => handleUpdateStock(20)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold py-1.5 rounded transition text-zinc-250 font-mono"
              >
                +20 Pcs
              </button>
              <button
                id="btn-stock-add-50"
                onClick={() => handleUpdateStock(50)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold py-1.5 rounded transition text-zinc-250 font-mono"
              >
                +50 Pcs
              </button>
              <button
                id="btn-stock-add-max"
                onClick={() => onUpdateStock({ current: paperStock.capacity })}
                className="bg-orange-500 hover:bg-orange-600 text-black text-[10px] font-black py-1.5 px-3 rounded transition"
              >
                Isi Penuh
              </button>
            </div>
          </div>
        </div>

        {/* WIDGET 2: REVENUE/STATISTICS SUMMARY */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">OMSET HARIAN</span>
              <h3 className="text-sm font-black uppercase text-zinc-200">TOTAL REVENUE</h3>
            </div>
            <Database className="w-5 h-5 text-green-500" />
          </div>

          <div className="space-y-1">
            <p className="text-3xl font-extrabold font-mono text-green-400">
              Rp {transactions.reduce((sum, tx) => tx.status === 'SUCCESS' ? sum + tx.amount : sum, 0).toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-zinc-400 font-mono">
              Dari <strong className="text-zinc-200">{transactions.length} Sesi Terdaftar</strong> hari ini
            </p>
          </div>

          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between text-zinc-400">
              <span>Metode QRIS:</span>
              <span className="text-zinc-200 font-bold">
                Rp {transactions.filter(t => t.paymentMethod === 'QRIS' && t.status === 'SUCCESS').reduce((sum, t) => sum + t.amount, 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>E-Wallets (G/O/D):</span>
              <span className="text-zinc-200 font-bold">
                Rp {transactions.filter(t => t.paymentMethod !== 'QRIS' && t.status === 'SUCCESS').reduce((sum, t) => sum + t.amount, 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* WIDGET 3: SPREADSHEET META */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">INTEGRASI CLOUD</span>
                <h3 className="text-sm font-black uppercase text-zinc-200">GOOGLE SPREADSHEETS</h3>
              </div>
              <FileSpreadsheet className="w-5 h-5 text-green-500" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 block font-mono">Sheet API Status:</span>
              <div className="flex items-center gap-1.5 text-xs text-green-400 font-mono font-bold">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>ONLINE SPREADSHEET ACTIVE</span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">Terakhir Sync: {lastSyncTime}</p>
            </div>
          </div>

          <div className="bg-zinc-950 p-2 border border-zinc-850 rounded text-[10px] font-mono text-zinc-400 truncate">
            {sheetUrl}
          </div>
        </div>

      </div>

      {/* CORE CONFIGURATION FORM & REAL-TIME TRANSACTIONS LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFTSIDE COCKPIT CONFIG PARAMS */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={saveConfig} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Sliders className="w-5 h-5 text-orange-500" />
              <h3 className="text-base font-black uppercase text-white font-mono">Pengaturan Kiosk</h3>
            </div>

            {/* EDIT PHOTO BOOTH NAME */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest block font-mono">Nama Photo Booth</label>
              <input
                type="text"
                value={boothNameInput}
                onChange={(e) => setBoothNameInput(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-orange-500 transition"
                placeholder="Contoh: SNAPBOX PRO"
                required
              />
              <p className="text-[10px] text-zinc-500 italic font-mono uppercase">Nama Kiosk yang ditampilkan di bagian header dan sistem.</p>
            </div>

            {/* EDIT TIMER PARAMETER (satisfies "bisa edit timer sesuai yang kita inginkan" config backup) */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-zinc-404 tracking-widest block font-mono">Default Timer Foto per Pose (Detik)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={isNaN(countdown) ? '' : countdown}
                onChange={(e) => setCountdown(parseInt(e.target.value))}
                onBlur={handleCountdownBlur}
                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-orange-500 transition"
                required
              />
              <p className="text-[10px] text-zinc-500 italic">Masa hitung mundur per satu pose. Tidak bisa dikosongkan/dihapus sampai nol.</p>
            </div>

            {/* EDIT TOTAL PHOTO SESSION TIME RETAKE AND DELETE LIMIT */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-orange-400 tracking-widest block font-mono">Timer Total Sesi Foto - Retake & Hapus (Detik)</label>
              <input
                type="number"
                min="10"
                max="300"
                value={isNaN(sessionTimeoutInput) ? '' : sessionTimeoutInput}
                onChange={(e) => setSessionTimeoutInput(parseInt(e.target.value))}
                onBlur={handleSessionTimeoutBlur}
                className="w-full bg-black border border-orange-500/30 rounded-lg px-3 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-orange-500 transition"
                required
              />
              <p className="text-[10px] text-zinc-550 italic font-mono uppercase">Batas waktu total seluruh sesi berfoto. Setelah habis, sistem otomatis beralih ke kompilasi cetak.</p>
            </div>

            {/* EDIT MERCHANT QRIS PAYLOAD STRING */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-orange-400 tracking-widest block font-mono">Raw QRIS Merchant Payload data</label>
              <textarea
                value={qrisPayloadInput}
                onChange={(e) => setQrisPayloadInput(e.target.value)}
                className="w-full bg-black border border-orange-500/30 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-orange-500 transition h-16 resize-none"
                placeholder="00020101021226300016COM.QRIS..."
                required
              />
              <p className="text-[10px] text-zinc-550 italic font-mono uppercase">Payload string QRIS standar Indonesia untuk scan otomatis di layar kasir.</p>
            </div>

            {/* BASE PRICE INPUT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest block font-mono">Harga Paket Dasar (Rp)</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={isNaN(basePrice) ? '' : basePrice}
                  onChange={(e) => setBasePrice(parseInt(e.target.value))}
                  onBlur={handleBasePriceBlur}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-orange-500 transition"
                  required
                />
                <p className="text-[9px] text-zinc-505 italic">Min Rp 1.000</p>
              </div>

              {/* EXTRA COPY PRICE INPUT */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-zinc-405 tracking-widest block font-mono">Harga Ekstra Copy (Rp)</label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={isNaN(extraPrice) ? '' : extraPrice}
                  onChange={(e) => setExtraPrice(parseInt(e.target.value))}
                  onBlur={handleExtraPriceBlur}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-orange-500 transition"
                  required
                />
                <p className="text-[9px] text-zinc-505 italic">Min Rp 500</p>
              </div>
            </div>

            {/* BLUETOOTH PRINTER PARAMETER & SCAN QUICK MENU */}
            <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-zinc-404 tracking-widest block font-mono">Sambungan Bluetooth Printer (Aktif)</label>
                <input
                  type="text"
                  value={bluetoothName}
                  onChange={(e) => setBluetoothName(e.target.value)}
                  className="w-full bg-black border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-orange-500 transition"
                  placeholder="Ketik nama printer manual atau pindai di bawah"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold">Koneksi Bluetooth Kiosk</span>
                  <button
                    type="button"
                    onClick={handleScanBluetooth}
                    disabled={isScanningBluetooth}
                    className="bg-indigo-650 hover:bg-indigo-600 text-[10px] text-white px-2.5 py-1 rounded-md font-mono flex items-center gap-1 active:scale-95 transition"
                  >
                    {isScanningBluetooth ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Printer className="w-3 h-3" />
                    )}
                    <span>{isScanningBluetooth ? 'Memindai...' : 'Pindai Device Bluetooth'}</span>
                  </button>
                </div>

                {/* Scan Status Log Messages */}
                {bluetoothStatusMsg && (
                  <p className="text-[10px] text-orange-400 font-mono bg-black/40 p-1.5 rounded border border-zinc-850">{bluetoothStatusMsg}</p>
                )}

                {/* Discovered Printers list */}
                {discoveredPrinters.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto mt-1 border border-zinc-900 rounded bg-black/65 p-2">
                    {discoveredPrinters.map((pr, idx) => {
                      const idMatched = bluetoothName === pr.name;
                      return (
                        <div key={idx} className="flex justify-between items-center text-[11px] p-1.5 hover:bg-zinc-900 rounded">
                          <div>
                            <span className="font-bold text-zinc-200 font-mono block">{pr.name}</span>
                            <span className="text-[9px] text-zinc-500 font-mono">{pr.type} • {pr.mac}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleConnectPrinter(pr)}
                            className={`text-[9px] font-bold px-2 py-1 rounded transition ${
                              idMatched
                                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                : 'bg-orange-500 hover:bg-orange-600 text-black'
                            }`}
                          >
                            {idMatched ? 'Konek✓' : 'Hubungkan'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* SPREADSHEET PARAMETER */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-zinc-405 tracking-widest block font-mono">Google Spreadsheet Sheet URL</label>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-zinc-105 font-mono focus:outline-none focus:border-orange-500 transition"
                placeholder="Ganti dengan link spreadsheet aslimu"
              />
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              id="btn-save-admin-settings"
              className="w-full bg-orange-500 hover:bg-orange-600 text-black py-3 rounded-xl font-black uppercase text-xs tracking-wider active:scale-95 transition"
            >
              Simpan Pengaturan Booth 📁
            </button>

            {saveSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-lg text-emerald-400 text-xs font-mono text-center">
                ✓ Hub setelan tersimpan di server!
              </div>
            )}
          </form>

          {/* IMPORT CUSTOM DESIGN FRAME PANEL */}
          <form onSubmit={handleCreateCustomFrame} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Upload className="w-5 h-5 text-orange-500" />
              <h3 className="text-base font-black uppercase text-white font-mono">Import Desain Custom Frame</h3>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest block font-mono">Nama Desain Custom Frame</label>
              <input
                type="text"
                value={importFrameName}
                onChange={(e) => setImportFrameName(e.target.value)}
                placeholder="Contoh: Graduation 2026 Edition"
                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest block font-mono">Warna Frame</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={importFrameColor}
                    onChange={(e) => setImportFrameColor(e.target.value)}
                    className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={importFrameColor}
                    onChange={(e) => setImportFrameColor(e.target.value)}
                    className="flex-1 bg-black border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest block font-mono">Vibe Pola Frame</label>
                <select
                  value={importFramePattern}
                  onChange={(e) => setImportFramePattern(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-orange-500 h-8"
                >
                  <option value="love">Theme: Valentine & Hearts</option>
                  <option value="vintage">Theme: Monochrome Retro</option>
                  <option value="cyber">Theme: Neon Techno</option>
                  <option value="summer">Theme: Tropical Breeze</option>
                  <option value="disco">Theme: Custom Disco Neon</option>
                </select>
              </div>
            </div>

            {/* DRAG AND DROP FILE UPLOADER */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest block font-mono">Desain Overlay/Latar (PNG/JPG)</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  isDragOver
                    ? 'border-orange-500 bg-orange-950/20'
                    : importedFileBase64
                    ? 'border-green-500 bg-green-950/20'
                    : 'border-zinc-850 hover:border-zinc-700 bg-black'
                }`}
                onClick={() => document.getElementById('custom-frame-file-input')?.click()}
              >
                <input
                  type="file"
                  id="custom-frame-file-input"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
                
                {importedFileBase64 ? (
                  <div className="space-y-2">
                    <img src={importedFileBase64} alt="Pre-loaded layout" className="max-h-20 max-w-full mx-auto rounded border border-zinc-850 shadow" />
                    <p className="text-[10px] text-green-400 font-mono uppercase font-bold">✓ File Desain Dimuat Berhasil</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 py-2">
                    <Upload className="w-6 h-6 mx-auto text-zinc-500 animate-bounce" />
                    <p className="text-[10px] text-zinc-300 font-bold uppercase">Drag & Drop Desain Kertas Di Sini</p>
                    <p className="text-[9px] text-zinc-500 font-mono uppercase">Atau Klik Untuk Memilih File dari Library</p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-zinc-950 hover:bg-black text-orange-500 hover:text-orange-400 border border-zinc-800 hover:border-zinc-750 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition font-mono"
            >
              + Import & Daftarkan Desain
            </button>

            {importSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl text-emerald-400 text-xs font-mono text-center">
                ✓ Desain Frame "{importFrameName}" berhasil dimasukkan dan siap digunakan langsung!
              </div>
            )}
          </form>
        </div>

        {/* RIGHTSIDE TRANSACTIONS HISTORIC STREAM */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-orange-500" />
              <h3 className="text-base font-black uppercase text-white font-mono">Daftar Transaksi</h3>
            </div>
            {onClearTransactions && (
              <button
                id="btn-clear-tx-logs"
                onClick={onClearTransactions}
                className="text-[10px] text-zinc-500 hover:text-red-400 flex items-center gap-1 font-mono uppercase"
              >
                <Trash2 className="w-3 h-3" /> Bersihkan Log
              </button>
            )}
          </div>

          {/* TRANSACTION TABLE STRIP */}
          <div className="overflow-x-auto max-h-[600px] pr-2 scrollbar-thin">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 space-y-2">
                <CloudRain className="w-8 h-8 mx-auto opacity-40 text-orange-500" />
                <p className="text-xs font-mono">Belum ada transaksi terekam pada sesi ini.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-mono text-[9px] uppercase tracking-wider">
                    <th className="pb-2 font-bold">KODE</th>
                    <th className="pb-2 font-bold">WANGI BREADCRUMB</th>
                    <th className="pb-2 font-bold text-center">QTY</th>
                    <th className="pb-2 font-bold text-right">JUMLAH</th>
                    <th className="pb-2 font-bold text-center">PEMBAYARAN</th>
                    <th className="pb-2 font-bold text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 font-mono text-[11px]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-850 transition">
                      <td className="py-2.5 font-bold text-zinc-200">{tx.id}</td>
                      <td className="py-2.5 truncate max-w-[120px] text-zinc-400" title={tx.frameName}>
                        {tx.frameName}
                      </td>
                      <td className="py-2.5 text-center text-zinc-300">{tx.quantity}x</td>
                      <td className="py-2.5 text-right font-bold text-white">Rp {tx.amount.toLocaleString('id-ID')}</td>
                      <td className="py-2.5 text-center text-orange-400 font-extrabold">{tx.paymentMethod}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          tx.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
