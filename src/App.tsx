import React, { useState, useEffect } from 'react';
import { FrameType, PhotoSession, Transaction, PaperStock, AppSettings } from './types';
import FrameSelection, { FRAMES } from './components/FrameSelection';
import CameraCapture from './components/CameraCapture';
import PrintQuantity from './components/PrintQuantity';
import PaymentAndQR from './components/PaymentAndQR';
import AdminDashboard from './components/AdminDashboard';
import { Printer, Camera, CreditCard, LayoutTemplate, Database, Sliders, RefreshCw, FileText, Check, Settings, AlertTriangle, Eye, ArrowRight, User } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  countdownSeconds: 5,
  priceBase: 15000,
  priceExtraCopy: 5000,
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1_9v02z_PboxTerminalData2026/edit',
  printerBluetoothName: 'Canon Selphy CP1300 Bluetooth IP',
  isPrinterConnected: true,
  boothName: 'SNAPBOX PRO',
  sessionTimeoutSeconds: 60,
  qrisPayload: '00020101021226300016COM.QRIS.DEPOSIT01189360052000123456785204581253033605405150505802ID5913SNAPBOX_BOOTH6007JAKARTA6304D1B9'
};

const DEFAULT_STOCK: PaperStock = {
  current: 84,
  capacity: 100,
  lowThreshold: 15
};

export default function App() {
  // App General State
  const [currentStep, setCurrentStep] = useState<'frame' | 'camera' | 'quantity' | 'payment' | 'admin'>('frame');
  const [selectedFrameId, setSelectedFrameId] = useState<string>('classic-pink');
  const [allFrames, setAllFrames] = useState<FrameType[]>(FRAMES);
  
  // Admin password states
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>('');
  
  // Photo outputs
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [compiledPhotoUrl, setCompiledPhotoUrl] = useState<string>('');
  const [gifUrl, setGifUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  
  // Quantity and costs
  const [quantity, setQuantity] = useState<number>(1);
  const [totalCost, setTotalCost] = useState<number>(15000);

  // Administrative / Synced state
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [paperStock, setPaperStock] = useState<PaperStock>(DEFAULT_STOCK);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Digital download checking
  const [activeDownloadUrl, setActiveDownloadUrl] = useState<string>('');

  // Standalone Digital View state (Triggers when people click a direct scan simulation)
  const [viewingDigitalDownloadId, setViewingDigitalDownloadId] = useState<string | null>(null);
  const [downloadedPhoto, setDownloadedPhoto] = useState<string>('');

  // Fetch initial setup from server databases
  useEffect(() => {
    async function loadData() {
      try {
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          setSettings(s);
        }

        const stockRes = await fetch('/api/stock');
        if (stockRes.ok) {
          const p = await stockRes.json();
          setPaperStock(p);
        }

        const txRes = await fetch('/api/transactions');
        if (txRes.ok) {
          const t = await txRes.json();
          setTransactions(t);
        }
      } catch (err) {
        console.warn('Backend server endpoints standby. Local mockup storage initialized.');
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Check if URL has standalone photo parameter (Simulated instant QR scan)
    const handleUrlHash = () => {
      const pathSegs = window.location.pathname.split('/');
      const photoIdx = pathSegs.indexOf('photo');
      if (photoIdx !== -1 && pathSegs[photoIdx + 1]) {
        fetchDigitalPhoto(pathSegs[photoIdx + 1]);
      }
    };
    handleUrlHash();
  }, []);

  const fetchDigitalPhoto = async (id: string) => {
    try {
      const res = await fetch(`/api/photo/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDownloadedPhoto(data.photo);
        setViewingDigitalDownloadId(id);
      }
    } catch (err) {
      console.error('Failed to load standalone photo from server', err);
    }
  };

  // Sync state modifications to the backend database
  const saveSettingsToServer = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (e) {
      console.warn('Backup locally due to sandbox constraint');
    }
  };

  const updatePaperStockServer = async (newStock: Partial<PaperStock>) => {
    const updated = { ...paperStock, ...newStock };
    setPaperStock(updated);
    try {
      await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.warn('No active backend communication');
    }
  };

  const recordTransactionAndDecreasePaper = async (tx: Partial<Transaction>) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      });
      if (res.ok) {
        const data = await res.json();
        // Update local list
        setTransactions(prev => [data.transaction, ...prev]);
        setPaperStock(data.stock);
      } else {
        throw new Error('Fallback to local');
      }
    } catch (e) {
      // Local Failover
      const mockTx: Transaction = {
        id: 'TX-' + Math.floor(1000 + Math.random() * 9000),
        date: new Date().toISOString(),
        frameName: tx.frameName || 'Custom Frame',
        quantity: tx.quantity || 1,
        amount: tx.amount || 15005,
        paymentMethod: tx.paymentMethod || 'QRIS',
        status: 'SUCCESS',
        printStatus: 'PRINTED'
      };
      setTransactions(prev => [mockTx, ...prev]);
      setPaperStock(prev => ({
        ...prev,
        current: Math.max(0, prev.current - (tx.quantity || 1))
      }));
    }
  };

  const clearTransactionLogs = () => {
    setTransactions([]);
  };

  // Flow Navigation logic
  const handleNextFromFrame = () => {
    setCurrentStep('camera');
  };

  const handlePhotosCaptured = (photos: string[], compiledUrl: string, generatedGif?: string, generatedVideo?: string) => {
    setCapturedPhotos(photos);
    setCompiledPhotoUrl(compiledUrl);
    setGifUrl(generatedGif || '');
    setVideoUrl(generatedVideo || '');
    // Initialize default cost based on base print (1 sheet base)
    const cost = settings.priceBase + Math.max(0, quantity - 1) * settings.priceExtraCopy;
    setTotalCost(cost);
    setCurrentStep('quantity');
  };

  const handleQuantitySelected = (selectedQty: number, costValue: number) => {
    setQuantity(selectedQty);
    setTotalCost(costValue);
    setCurrentStep('payment');
  };

  const handleSessionComplete = (session: PhotoSession) => {
    // Record final succesful transaction
    const activeFrame = FRAMES.find(f => f.id === selectedFrameId) || FRAMES[0];
    recordTransactionAndDecreasePaper({
      frameName: activeFrame.name,
      quantity: session.quantity,
      amount: session.totalCost,
      paymentMethod: session.paymentMethod,
      status: 'SUCCESS',
      printStatus: 'PRINTED'
    });
  };

  const resetBoothSession = () => {
    setCapturedPhotos([]);
    setCompiledPhotoUrl('');
    setGifUrl('');
    setVideoUrl('');
    setQuantity(1);
    setTotalCost(settings.priceBase);
    setCurrentStep('frame');
  };

  // Helper toggle printer state
  const handleTogglePrinter = (isConnected: boolean) => {
    setSettings(prev => ({ ...prev, isPrinterConnected: isConnected }));
  };

  // Dynamic state banners
  const isPaperLow = paperStock.current <= paperStock.lowThreshold;

  // Render standalone instant download template overlay if scanned
  if (viewingDigitalDownloadId) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-2xl relative">
          <div className="absolute right-4 top-4 bg-orange-500 text-black px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono">
            Digital Save
          </div>
          
          <div className="space-y-1">
            <h1 className="text-2xl font-black italic text-orange-500 uppercase tracking-tighter">SNAPBOX DOWNLOADER</h1>
            <p className="text-xs text-zinc-400 font-mono">SINKRONISASI FILE DIGITAL PHOTOBOX INSTAN</p>
          </div>

          <p className="text-xs text-zinc-400">Scan QR Code terdeteksi! Di bawah ini adalah strip pose cetak resolusi tinggi hasil karyamu hari ini.</p>

          <div className="border border-zinc-800 rounded-2xl bg-black p-4 inline-block shadow-inner mx-auto">
            {downloadedPhoto ? (
              <img src={downloadedPhoto} alt="Digital photostrip code tool" className="max-h-[380px] w-auto rounded shadow-lg" />
            ) : (
              <div className="p-8 text-zinc-500 font-mono text-xs">Memulihkan foto digital dari database...</div>
            )}
          </div>

          {downloadedPhoto && (
            <div className="space-y-3">
              <a
                href={downloadedPhoto}
                download={`Snapbox_${viewingDigitalDownloadId}.jpg`}
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black py-3.5 rounded-xl block text-xs uppercase tracking-widest shadow-lg shadow-orange-500/10 active:scale-95 transition"
              >
                Unduh Digital (JPG) 💾
              </a>
              <button
                onClick={() => setViewingDigitalDownloadId(null)}
                className="text-xs text-zinc-500 hover:text-white transition font-mono uppercase"
              >
                ← Kembali ke Mesin Kiosk
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col justify-between overflow-x-hidden select-none">
      
      {/* 1. APP TERMINAL HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 py-5 border-b border-zinc-800 bg-zinc-950 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white">
              {settings.boothName || 'SNAPBOX PRO'}
            </h1>
            <span className="bg-orange-500/10 border border-orange-500/30 text-orange-500 text-[10px] font-black px-2 py-0.5 rounded font-mono">
              KIOSK SELF-SERVICE
            </span>
          </div>
        </div>

        {/* ACTIVE TELEMETRY STATS */}
        <div className="flex flex-wrap gap-4 items-center">
          
          {/* Printer Connection Telemetry */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-850 px-3.5 py-1.5 rounded-lg">
            <div className={`w-2.5 h-2.5 rounded-full ${settings.isPrinterConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-mono uppercase text-zinc-300 font-bold">
              {settings.isPrinterConnected ? `PRINTER CONNECTED` : 'PRINTER DISCONNECTED'}
            </span>
          </div>

          {/* Paper Stock Box telemetry */}
          <div className="bg-zinc-900 px-3.5 py-1.5 rounded-lg border border-zinc-850 flex items-center gap-3">
            <div>
              <span className="text-[8px] font-black block text-zinc-500 uppercase font-mono">SISA KERTAS</span>
              <span className={`text-[11px] font-mono font-bold ${isPaperLow ? 'text-red-500 animate-pulse' : 'text-zinc-200'}`}>
                {paperStock.current} / {paperStock.capacity} Lembar
              </span>
            </div>
            <div className="w-12 h-1.5 bg-zinc-850 rounded-full overflow-hidden">
              <div
                className={`h-full ${isPaperLow ? 'bg-red-500' : 'bg-orange-500'}`}
                style={{ width: `${Math.round((paperStock.current / paperStock.capacity) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* 3. MAIN INTERACTION ROW */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* NAVIGATION COLUMN STAGE MARKS */}
        <nav className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-800 flex md:flex-col p-6 gap-6 justify-between md:justify-start bg-zinc-950/40">
          <div className="flex md:flex-col gap-4 w-full justify-between md:justify-start">
            
            {/* Step 1 Mark */}
            <button
              onClick={() => setCurrentStep('frame')}
              className={`flex items-center gap-3 text-left w-full transition ${currentStep === 'frame' ? 'text-orange-500' : 'text-zinc-650 hover:text-zinc-420'}`}
            >
              <span className="text-2xl font-black font-mono">01</span>
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-500 leading-none block font-mono">LANGKAH 01</span>
                <span className="text-xs font-bold uppercase tracking-tight block">TEMA FRAME</span>
              </div>
            </button>

            {/* Step 2 Mark */}
            <button
              onClick={() => {
                if (selectedFrameId) setCurrentStep('camera');
              }}
              disabled={!selectedFrameId}
              className={`flex items-center gap-3 text-left w-full transition ${currentStep === 'camera' ? 'text-orange-500' : 'text-zinc-650 hover:text-zinc-420'} ${!selectedFrameId && 'opacity-40 cursor-not-allowed'}`}
            >
              <span className="text-2xl font-black font-mono">02</span>
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-500 leading-none block font-mono">LANGKAH 02</span>
                <span className="text-xs font-bold uppercase tracking-tight block">SESI FOTO ({settings.countdownSeconds}s)</span>
              </div>
            </button>

            {/* Step 3 Mark */}
            <button
              disabled={capturedPhotos.length === 0}
              onClick={() => setCurrentStep('quantity')}
              className={`flex items-center gap-3 text-left w-full transition ${currentStep === 'quantity' ? 'text-orange-500' : 'text-zinc-650 hover:text-zinc-420'} ${capturedPhotos.length === 0 && 'opacity-40 cursor-not-allowed'}`}
            >
              <span className="text-2xl font-black font-mono">03</span>
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-500 leading-none block font-mono">LANGKAH 03</span>
                <span className="text-xs font-bold uppercase tracking-tight block text-zinc-300">JUMLAH CETAK</span>
              </div>
            </button>

            {/* Step 4 Mark */}
            <button
              disabled={!compiledPhotoUrl}
              onClick={() => setCurrentStep('payment')}
              className={`flex items-center gap-3 text-left w-full transition ${currentStep === 'payment' ? 'text-orange-500' : 'text-zinc-650 hover:text-zinc-420'} ${!compiledPhotoUrl && 'opacity-40 cursor-not-allowed'}`}
            >
              <span className="text-2xl font-black font-mono">04</span>
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-500 leading-none block font-mono">LANGKAH 04</span>
                <span className="text-xs font-bold uppercase tracking-tight block text-zinc-300">PEMBAYARAN</span>
              </div>
            </button>

          </div>

          <div className="hidden md:block mt-auto bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl text-zinc-400">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block font-mono">STATUS TERMINAL</span>
            <span className="text-xs font-bold text-zinc-200 mt-1 block">READY TO PHOTO</span>
            <p className="text-[10px] text-zinc-450 leading-relaxed mt-2">Pilih frame kertas untuk memulai petualangan foto kesayanganmu!</p>
          </div>
        </nav>

        {/* CONTAINER CONTENT SECTION */}
        <section className="flex-1 p-6 md:p-8 bg-zinc-950 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
              <p className="text-xs font-mono text-zinc-500">BOOTH INITIAL INTEGRATION IN PROGRESS...</p>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
                        {/* STAGE A: FRAME SELECTION */}
              {currentStep === 'frame' && (
                <FrameSelection
                  selectedFrameId={selectedFrameId}
                  onSelectFrame={setSelectedFrameId}
                  onNext={handleNextFromFrame}
                  framesList={allFrames}
                />
              )}

              {/* STAGE B: CAMERA CAPTURES */}
              {currentStep === 'camera' && (
                <CameraCapture
                  selectedFrameId={selectedFrameId}
                  defaultCountdown={settings.countdownSeconds}
                  sessionTimeoutSeconds={settings.sessionTimeoutSeconds}
                  onPhotosCaptured={handlePhotosCaptured}
                  onBack={() => setCurrentStep('frame')}
                />
              )}

              {/* STAGE C: CHOOSE QUANTITY AND CALCULATOR */}
              {currentStep === 'quantity' && (
                <PrintQuantity
                  selectedFrameId={selectedFrameId}
                  compiledPhotoUrl={compiledPhotoUrl}
                  basePrice={settings.priceBase}
                  extraPrice={settings.priceExtraCopy}
                  onQuantitySelected={handleQuantitySelected}
                  onBack={() => setCurrentStep('camera')}
                />
              )}

              {/* STAGE D: QRIS CHECKOUT & PRINTER EMULATOR */}
              {currentStep === 'payment' && (
                <PaymentAndQR
                  selectedFrameId={selectedFrameId}
                  compiledPhotoUrl={compiledPhotoUrl}
                  gifPhotoUrl={gifUrl}
                  shortVideoUrl={videoUrl}
                  spreadsheetUrl={settings.spreadsheetUrl}
                  quantity={quantity}
                  totalCost={totalCost}
                  onSessionComplete={handleSessionComplete}
                  onReset={resetBoothSession}
                  printerConnected={settings.isPrinterConnected}
                  onTogglePrinter={handleTogglePrinter}
                  printerName={settings.printerBluetoothName}
                  qrisPayload={settings.qrisPayload}
                />
              )}

              {/* STAGE E: ADMIN DASHBOARD */}
              {currentStep === 'admin' && (
                !isAdminAuthenticated ? (
                  <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-805 rounded-3xl p-8 space-y-6 text-center animate-fade-in my-12 shadow-2xl">
                     <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/30 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Settings className="w-8 h-8 animate-spin-slow" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black uppercase tracking-tight text-white font-mono">DASHBOARD PERMISSION</h3>
                      <p className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Silakan masukkan password admin untuk otentikasi</p>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (adminPasswordInput === 'admin123') {
                        setIsAdminAuthenticated(true);
                        setPasswordError('');
                      } else {
                        setPasswordError('Password salah! Silakan coba lagi.');
                      }
                    }} className="space-y-4">
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest block font-mono">Password Admin</label>
                        <input
                          type="password"
                          value={adminPasswordInput}
                          onChange={(e) => setAdminPasswordInput(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-center font-mono focus:outline-none focus:border-orange-500 text-zinc-100 placeholder-zinc-700 tracking-widest"
                          required
                          autoFocus
                        />
                      </div>

                      {passwordError && (
                        <p className="text-xs text-red-500 font-mono">{passwordError}</p>
                      )}

                      <button
                        type="submit"
                        className="w-full bg-orange-500 hover:bg-orange-600 text-black py-3 rounded-xl font-black uppercase text-xs tracking-wider transition-all"
                      >
                        Masuk Dashboard 🔑
                      </button>
                    </form>
                  </div>
                ) : (
                  <AdminDashboard
                    settings={settings}
                    onSaveSettings={saveSettingsToServer}
                    transactions={transactions}
                    onAddTransaction={recordTransactionAndDecreasePaper}
                    onClearTransactions={clearTransactionLogs}
                    paperStock={paperStock}
                    onUpdateStock={updatePaperStockServer}
                    onImportCustomFrame={(newFrame) => {
                      setAllFrames((prev) => [newFrame, ...prev]);
                    }}
                  />
                )
              )}

              {/* Dynamic Forward / Backward Navigation Buttons Removed to simplify flow */}

            </div>
          )}
        </section>

      </main>

      {/* 4. FOOTER CONTROLLER: ADMIN GATEWAYS AND HARDWARE LOGISTICS */}
      <footer className="bg-zinc-900 border-t border-zinc-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        {currentStep === 'admin' && isAdminAuthenticated ? (
          <div className="flex gap-6 text-zinc-400 font-mono text-xs">
            <div>
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Total Omset</span>
              <span className="text-zinc-100 font-bold block">
                Rp {transactions.reduce((sum, tx) => tx.status === 'SUCCESS' ? sum + tx.amount : sum, 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="border-l border-zinc-850 pl-6">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Sinkron Spreadsheet</span>
              <span className="text-green-400 font-bold block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                STANDBY
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-zinc-500 font-mono text-xs uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span>© {settings.boothName || 'SNAPBOX PRO'} • KIOSK SELF-SERVICE BOOTH</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            id="toggle-admin-panel"
            onClick={() => {
              if (currentStep === 'admin') {
                setIsAdminAuthenticated(false);
                setAdminPasswordInput('');
                setPasswordError('');
                setCurrentStep('frame');
              } else {
                setCurrentStep('admin');
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 tracking-wider border transition-all ${
              currentStep === 'admin'
                ? 'bg-orange-500 border-orange-600 text-black shadow-lg shadow-orange-500/20'
                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{currentStep === 'admin' ? 'Keluar Dashboard' : 'Dashboard Admin ⚙️'}</span>
          </button>
        </div>
      </footer>

    </div>
  );
}
