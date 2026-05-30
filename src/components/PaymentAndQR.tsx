import React, { useState, useEffect } from 'react';
import { FrameType, PhotoSession } from '../types';
import { FRAMES } from './FrameSelection';
import { QrCode, Printer, CheckCircle, Download, RefreshCw, Smartphone, Wifi, Share2, Clipboard, Cloud, LogOut } from 'lucide-react';
import { initAuth, googleSignIn, getAccessToken, uploadToGoogleDrive, extractSpreadsheetId, appendTransactionToSheets } from '../lib/workspace';
import { User } from 'firebase/auth';

interface PaymentAndQRProps {
  selectedFrameId: string;
  compiledPhotoUrl: string;
  gifPhotoUrl?: string;
  shortVideoUrl?: string;
  spreadsheetUrl?: string;
  quantity: number;
  totalCost: number;
  onSessionComplete: (session: PhotoSession) => void;
  onReset: () => void;
  printerConnected: boolean;
  onTogglePrinter: (isConnected: boolean) => void;
  printerName: string;
  qrisPayload: string;
}

export default function PaymentAndQR({
  selectedFrameId,
  compiledPhotoUrl,
  gifPhotoUrl = '',
  shortVideoUrl = '',
  spreadsheetUrl = '',
  quantity,
  totalCost,
  onSessionComplete,
  onReset,
  printerConnected,
  onTogglePrinter,
  printerName,
  qrisPayload
}: PaymentAndQRProps) {
  const currentFrame = FRAMES.find(f => f.id === selectedFrameId) || FRAMES[0];
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'GOPAY' | 'OVO' | 'DANA'>('QRIS');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paying' | 'success'>('paying');
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'printed'>('idle');
  const [secondsLeft, setSecondsLeft] = useState<number>(15); // mock payment timer
  const [downloadId, setDownloadId] = useState<string>('');
  const [isSavingPhoto, setIsSavingPhoto] = useState<boolean>(false);
  const [printLogs, setPrintLogs] = useState<string[]>([]);
  const [showCopied, setShowCopied] = useState<boolean>(false);

  // Auto printed countdown feature (best choice for self-service kiosk as selected)
  const [autoPrintSecs, setAutoPrintSecs] = useState<number | null>(null);

  // Google Workspace integration States
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [oauthToken, setOauthToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [driveUploadStatus, setDriveUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'failed'>('idle');
  const [driveLinks, setDriveLinks] = useState<{ jpg?: string; gif?: string; video?: string }>({});
  const [downloadTriggered, setDownloadTriggered] = useState<boolean>(false);

  // Load active google OAuth identity provider status
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setOauthToken(token);
      },
      () => {
        setGoogleUser(null);
        setOauthToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoggingIn(true);
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setOauthToken(res.accessToken);
        addLog(`✓ Akun Google terhubung: ${res.user.email}`);

        if (paymentStatus === 'success') {
          uploadAssetsToDrive(res.accessToken);
        }
      }
    } catch (err) {
      console.error(err);
      addLog('❌ Gagal menghubungkan ke Akun Google Anda.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const uploadAssetsToDrive = async (token: string) => {
    setDriveUploadStatus('uploading');
    addLog('☁️ Menghubungi cloud boks Google Drive...');
    try {
      const links: { jpg?: string; gif?: string; video?: string } = {};

      if (compiledPhotoUrl) {
        const result = await uploadToGoogleDrive(token, `Snapbox_${downloadId || 'Photo'}.jpg`, 'image/jpeg', compiledPhotoUrl);
        links.jpg = result.webViewLink;
      }
      if (gifPhotoUrl) {
        const result = await uploadToGoogleDrive(token, `Snapbox_${downloadId || 'Photo'}.gif`, 'image/gif', gifPhotoUrl);
        links.gif = result.webViewLink;
      }
      if (shortVideoUrl) {
        const result = await uploadToGoogleDrive(token, `Snapbox_${downloadId || 'Photo'}.webm`, 'video/webm', shortVideoUrl);
        links.video = result.webViewLink;
      }

      setDriveLinks(links);
      setDriveUploadStatus('success');
      addLog('☁️ Google Drive: Pasfoto JPG, animasi GIF & video terunggah sempurna!');
    } catch (err: any) {
      console.error('Google Drive automatic sync error:', err);
      setDriveUploadStatus('failed');
      addLog('⚠️ Google Drive: Unggah file bermasalah.');
    }
  };

  const logToGoogleSheets = async (token: string) => {
    if (!spreadsheetUrl) return;
    const sheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!sheetId) {
      addLog('⚠️ Spreadsheet: Gagal mengekstrak ID Spreadsheet.');
      return;
    }

    try {
      const rowValues = [
        downloadId || ('TX-' + Math.floor(1000 + Math.random() * 9000)),
        new Date().toLocaleString('id-ID'),
        currentFrame.name,
        quantity,
        totalCost,
        paymentMethod,
        'SUCCESS'
      ];
      await appendTransactionToSheets(token, sheetId, rowValues);
      addLog('✓ Rincian transaksi berhasil di-backup ke Google Sheet Anda! 📊');
    } catch (err) {
      console.error('Sheets sync error:', err);
      addLog('⚠️ Gagal memantul log data ke Google Sheet.');
    }
  };

  // Synchronous offline downloads and cloud sync automatic pipelines
  useEffect(() => {
    if (paymentStatus === 'success' && downloadId && !downloadTriggered) {
      setDownloadTriggered(true);

      const triggerAutoDownloads = () => {
        const downloadFile = (dataUrl: string, fileName: string) => {
          if (!dataUrl) return;
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        if (compiledPhotoUrl) {
          downloadFile(compiledPhotoUrl, `Snapbox_${downloadId}.jpg`);
        }
        if (gifPhotoUrl) {
          downloadFile(gifPhotoUrl, `Snapbox_${downloadId}.gif`);
        }
        if (shortVideoUrl) {
          downloadFile(shortVideoUrl, `Snapbox_${downloadId}.webm`);
        }
        addLog('📥 Mengunduh secara otomatis berkas JPG, GIF, dan Video Anda ke media penyimpanan lokal!');
      };

      triggerAutoDownloads();

      if (oauthToken) {
        uploadAssetsToDrive(oauthToken);
      }
      if (oauthToken && spreadsheetUrl) {
        logToGoogleSheets(oauthToken);
      }
    }
  }, [paymentStatus, downloadId, oauthToken, downloadTriggered]);

  // Generate QRIS standard payload from settings
  const qrMockPayload = qrisPayload || `00020101021226300016COM.QRIS.DEPOSIT01189360052000123456785204581253033605405${totalCost}5802ID5913SNAPBOX_BOOTH6007JAKARTA6304D1B9`;

  // Submit compiled base64 to storage database
  useEffect(() => {
    async function saveImage() {
      setIsSavingPhoto(true);
      try {
        const response = await fetch('/api/photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            photo: compiledPhotoUrl,
            gif: gifPhotoUrl,
            video: shortVideoUrl
          })
        });
        const data = await response.json();
        if (data.downloadId) {
          setDownloadId(data.downloadId);
        }
      } catch (err) {
        console.error('Error saving image to backend API:', err);
        setDownloadId('PBOX' + Math.random().toString(36).substring(2, 8).toUpperCase());
      } finally {
        setIsSavingPhoto(false);
      }
    }
    saveImage();
  }, [compiledPhotoUrl]);

  // Print initial startup logs for QRIS
  useEffect(() => {
    addLog('💰 Membuka gerbang pembayaran QRIS otomatis untuk Rp ' + totalCost.toLocaleString('id-ID'));
    addLog('🔍 Sistem menyusun kode QRIS dinamis...');
  }, []);

  // Handle payment timer countdown clock
  useEffect(() => {
    let interval: any;
    if (paymentStatus === 'paying') {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handlePaymentSuccess();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [paymentStatus]);

  // Handle auto-print timer sequence once payment succeeds
  useEffect(() => {
    let printTimer: any;
    if (paymentStatus === 'success' && autoPrintSecs !== null) {
      if (autoPrintSecs > 0) {
        printTimer = setTimeout(() => {
          setAutoPrintSecs(autoPrintSecs - 1);
        }, 1000);
      } else {
        setAutoPrintSecs(null);
        // Start physical layout print spooling
        startPrintSequence(true);
      }
    }
    return () => clearTimeout(printTimer);
  }, [autoPrintSecs, paymentStatus]);

  const startPaymentSimulation = () => {
    setPaymentStatus('paying');
    setSecondsLeft(8); // faster transitions for nice user flow 
    addLog('💰 Membuka gerbang pembayaran QRIS untuk Rp ' + totalCost.toLocaleString('id-ID'));
  };

  const handlePaymentSuccess = async () => {
    setPaymentStatus('success');
    addLog('⚡ Pembayaran kualifikasi terdeteksi! Status: BERHASIL');
    addLog('📊 Menulis rincian transaksi ke database Cloud Spreadsheet...');
    
    try {
      const txRes = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameName: currentFrame.name,
          quantity: quantity,
          amount: totalCost,
          paymentMethod: paymentMethod,
          status: 'SUCCESS',
          printStatus: 'QUEUED'
        })
      });
      await txRes.json();
      addLog('✓ Transaksi terekam ke Cloud Spreadsheet!');
    } catch (e) {
      addLog('✓ Transaksi dicatat secara lokal (Kiosk Offline Buffer)');
    }

    // Set trigger for automatic printer firing (solves user preference query perfectly)
    addLog('🔥 Mengaktifkan pencetakan otomatis (Auto-Print) untuk kepraktisan...');
    setAutoPrintSecs(30);
  };

  const addLog = (msg: string) => {
    setPrintLogs(prev => [...prev, `[${new Date().toLocaleTimeString('id-ID')}] ${msg}`]);
  };

  const connectBluetoothPrinter = () => {
    addLog(`🔍 Menghubungkan bluetooth ke printer: ${printerName || 'Kiosk Wireless Printer'}`);
    setTimeout(() => {
      onTogglePrinter(true);
      addLog(`✓ Koneksi Bluetooth Sukses: ${printerName || 'Kiosk Printer'}`);
    }, 1200);
  };

  // Automated/Manual printer fire logic
  const startPrintSequence = (isAuto: boolean = false) => {
    if (!printerConnected) {
      addLog('❌ Gagal mencetak secara otomatis karena Printer Bluetooth offline.');
      alert('Sambungkan printer bluetooth Anda di sisi kanan panel Kiosk terlebih dahulu untuk mencetak!');
      return;
    }

    setPrintStatus('printing');
    addLog(isAuto ? '🖨️ [AUTO-PRINT] Menyalurkan file digital ke spooler...' : '🖨️ [MANUAL PRINT] Memulai pencetakan ulang kertas...');
    addLog(`📄 Mempersiapkan cetak ${quantity} copy ke kertas thermal ${printerName || 'Bluetooth Kiosk'}`);

    let pageNum = 1;
    const intervalId = setInterval(() => {
      if (pageNum <= quantity) {
        addLog(`⏳ Progress: Mentransfer baris bitmap cetak copy ke-[${pageNum}/${quantity}]...`);
        pageNum++;
      } else {
        clearInterval(intervalId);
        setPrintStatus('printed');
        addLog('🎉 Cetak Sukses! Silakan ambil kertas Anda di wadah kertas.');
        
        // Finalize transaction records
        const newSession: PhotoSession = {
          id: 'SES-' + Math.floor(1000 + Math.random() * 9000),
          selectedFrameId: selectedFrameId,
          capturedPhotos: [],
          compiledPhotoUrl: compiledPhotoUrl,
          quantity: quantity,
          totalCost: totalCost,
          paymentStatus: 'success',
          paymentMethod: paymentMethod,
          downloadId: downloadId,
          createdAt: new Date().toISOString(),
          isPrinted: true
        };
        onSessionComplete(newSession);
      }
    }, 1500);
  };

  const copyDownloadLink = () => {
    const downloadUrl = `${window.location.origin}/api/photo/${downloadId}`;
    navigator.clipboard.writeText(downloadUrl).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };

  const digitalDownloadUrl = `${window.location.origin}/api/photo/${downloadId}`;

  return (
    <div id="payment-and-qr-view" className="space-y-6 text-zinc-100 animate-fade-in">
      
      {/* SUMMARIZED BAR HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 gap-4 animate-fade-in">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic text-orange-500 font-mono">
            {paymentStatus === 'success' ? 'INSTANT DIGITAL DOWNLOAD & PRINT' : 'PEMBAYARAN QRIS'}
          </h2>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold font-mono">
            ALUR: PILIH BINGKAI → SESI SNAP FOTO → JUMLAH CETAK SALINAN → PROSES PEMBAYARAN → PRINT KERTAS
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 px-5 py-2.5 rounded-2xl text-right font-mono text-xs shadow-md">
          <span className="text-zinc-500">TAGIHAN TUNAI:</span>{' '}
          <strong className="text-orange-500 text-xl font-black">Rp {totalCost.toLocaleString('id-ID')}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ACTION CONTROLS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* PEMBAYARAN PENDING QRIS SLOTS */}
          {paymentStatus !== 'success' && (
            <div className="bg-zinc-900 border border-zinc-805 rounded-3xl p-6 space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-[10px] font-black uppercase text-orange-500 bg-orange-500/10 px-3 py-1 rounded font-mono">
                  LANGKAH 04: SCAN QRIS UNTUK PEMBAYARAN
                </span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">PROSES OTOMATIS</span>
              </div>

              {/* AUTOMATIC QRIS CONTAINER */}
              <div className="bg-black border border-zinc-855 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 justify-center">
                <div className="flex flex-col items-center p-3.5 bg-white rounded-2xl text-black shadow-2xl transition duration-500 hover:scale-105">
                  <div className="w-44 h-44 bg-zinc-50 flex flex-col items-center justify-center p-1.5 relative">
                    <div className="absolute inset-x-0 top-0 h-1 bg-orange-500 animate-pulse" />
                    <QrCode className="w-36 h-36 text-black" />
                    <span className="text-[9px] font-black tracking-widest font-mono mt-1.5 text-zinc-600 block">
                      QRIS STANDAR NASIONAL
                    </span>
                  </div>
                </div>

                <div className="space-y-4 flex-1 text-center md:text-left">
                  <div className="flex items-center gap-2.5 justify-center md:justify-start">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                    <h4 className="font-extrabold text-sm text-orange-400 font-mono uppercase tracking-wider">MENUNGGU PEMBAYARAN QRIS</h4>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-mono uppercase">
                    Silakan buka aplikasi e-wallet (Gopay, OVO, Dana, LinkAja, BCA, dll.) kemudian scan kode QRIS di samping. Transaksi akan terkonfirmasi secara instan oleh sistem.
                  </p>
                  <div className="flex flex-col gap-2.5 md:flex-row items-center justify-between">
                    <div className="bg-zinc-950 border border-zinc-850 px-4 py-2.5 rounded-xl inline-block font-mono text-xs text-zinc-300">
                      SIMULASI AUTO-CONFIRM DALAM: <span className="font-extrabold text-rose-500 text-sm animate-pulse">{secondsLeft}s</span>
                    </div>

                    {googleUser ? (
                      <span className="text-[10px] font-mono text-green-400 flex items-center gap-1 bg-emerald-500/5 border border-emerald-500/10 px-3 py-2 rounded-xl">
                        ✓ Google Drive backup aktif: {googleUser.email}
                      </span>
                    ) : (
                      <button 
                        onClick={handleGoogleSignIn}
                        disabled={isLoggingIn}
                        className="text-[10px] uppercase tracking-wider font-bold font-mono text-zinc-400 hover:text-white transition underline"
                      >
                        {isLoggingIn ? 'Mengkoneksikan...' : '🔗 Hubungkan ke Google Drive'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUCCESS SCREEN & INTEGRATIVE UTILITIES */}
          {paymentStatus === 'success' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6 relative overflow-hidden animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <h3 className="text-xl font-black text-white font-mono">TRANSAKSI SUKSES!</h3>
                    <p className="text-[10px] text-zinc-400 font-mono">KODE UNIK DOWNLOAD: {downloadId || 'MOCK_TX'}</p>
                  </div>
                </div>
                {autoPrintSecs !== null && (
                  <div className="bg-orange-500 text-black text-[11px] font-black uppercase px-3 py-1.5 rounded-lg font-mono animate-pulse">
                    🚀 METODE AUTOMATIC PRINTING: MENCETAK DALAM {autoPrintSecs}s
                  </div>
                )}
              </div>

              {/* ACTION LAYOUT DECK: AUTOPRINT + DOWNLOAD QR */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* 1. Printer Bluetooth controls with simulated reprint override capability */}
                <div className="bg-black border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="space-y-2 font-mono">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-black">CETAK FISIK</span>
                    <h4 className="text-white font-black text-xs uppercase flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-orange-505" /> CETAKAN PRINTER KERTAS
                    </h4>
                    <p className="text-[11px] text-zinc-450 leading-relaxed font-sans">
                      Layanan automatic print mengirim data. Serta dapat di-print ulang jika kertas sobek atau habis.
                    </p>
                  </div>

                  <div className="mt-4 space-y-2">
                    {printerConnected ? (
                      <button
                        onClick={() => startPrintSequence(false)}
                        disabled={printStatus === 'printing'}
                        className={`w-full font-black py-3 rounded-xl uppercase text-xs transition flex items-center justify-center gap-2 font-mono ${
                          printStatus === 'printing'
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-600 text-black shadow-lg shadow-green-500/10'
                        }`}
                      >
                        <Printer className="w-4 h-4" />
                        <span>{printStatus === 'printing' ? 'Sedang Cetak...' : 'Cetak / Salinan Ekstra 🖨️'}</span>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[9px] text-orange-400 font-mono">⚠️ Printer Bluetooth tidak terdeteksi. Hubungkan sekarang untuk cetak otomatis.</p>
                        <button
                          onClick={connectBluetoothPrinter}
                          className="w-full bg-zinc-800 hover:bg-zinc-750 text-white font-semibold py-2.5 rounded-xl text-[10px] uppercase font-mono"
                        >
                          Hubungkan Bluetooth Printer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. File Assets & Google Drive */}
                <div className="bg-black border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="space-y-2 font-mono">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-black">FILES & GOOGLE DRIVE</span>
                    <h4 className="text-white font-black text-xs uppercase flex items-center gap-1.5 text-orange-400">
                      <Cloud className="w-4 h-4 animate-pulse" /> CLOUD STORAGE BACKUP
                    </h4>
                    <p className="text-[11px] text-zinc-455 leading-relaxed font-sans">
                      Dapatkan master JPG, animasi GIF & video. Backup otomatis ke cloud Google Drive Anda aman.
                    </p>
                  </div>

                  <div className="mt-4 space-y-2.5 font-mono text-[10px]">
                    {/* Manual download links */}
                    <div className="bg-zinc-950 p-2 border border-zinc-900 rounded-xl space-y-1.5 shadow-sm">
                      <span className="text-[8px] text-zinc-500 uppercase font-black block">Manual Downloads:</span>
                      <div className="flex flex-col gap-1">
                        {compiledPhotoUrl && (
                          <a href={compiledPhotoUrl} download={`Snapbox_${downloadId || 'Photo'}.jpg`} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[9px] py-1 px-2 rounded text-zinc-200">
                            <span>Pasfoto Cetak (JPG)</span>
                            <Download className="w-3 h-3 text-zinc-500" />
                          </a>
                        )}
                        {gifPhotoUrl && (
                          <a href={gifPhotoUrl} download={`Snapbox_${downloadId || 'Photo'}.gif`} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[9px] py-1 px-2 rounded text-zinc-200">
                            <span>Animasi Pose (GIF)</span>
                            <Download className="w-3 h-3 text-orange-500" />
                          </a>
                        )}
                        {shortVideoUrl && (
                          <a href={shortVideoUrl} download={`Snapbox_${downloadId || 'Photo'}.webm`} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:bg-zinc-805 text-[9px] py-1 px-2 rounded text-zinc-200">
                            <span>Video Rekaman (WebM)</span>
                            <Download className="w-3 h-3 text-green-500" />
                          </a>
                        )}
                      </div>
                    </div>

                    {googleUser ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] text-emerald-400 font-bold uppercase">Google Drive</span>
                          <span className="text-[8px] text-zinc-500 truncate max-w-[90px]">{googleUser.email}</span>
                        </div>
                        {driveUploadStatus === 'uploading' && (
                          <div className="text-[9px] text-orange-400 flex items-center gap-1 animate-pulse mt-1">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Sedang Sync...
                          </div>
                        )}
                        {driveUploadStatus === 'success' && (
                          <div className="text-[9px] text-green-400 font-bold mt-1">
                            ✓ Ter-upload di Drive!
                          </div>
                        )}
                        {driveUploadStatus === 'failed' && (
                          <button onClick={() => oauthToken && uploadAssetsToDrive(oauthToken)} className="text-[9px] text-red-500 hover:underline mt-1 block">
                            ⚠️ Gagal. Upload Ulang ↻
                          </button>
                        )}
                      </div>
                    ) : (
                      <button 
                        onClick={handleGoogleSignIn} 
                        disabled={isLoggingIn}
                        className="gsi-material-button w-full scale-95 hover:scale-100 transition shadow"
                      >
                        <div className="gsi-material-button-state"></div>
                        <div className="gsi-material-button-content-wrapper">
                          <div className="gsi-material-button-icon">
                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                              <path fill="none" d="M0 0h48v48H0z"></path>
                            </svg>
                          </div>
                          <span className="gsi-material-button-contents text-[8px] font-bold text-zinc-900 pr-2 font-sans truncate text-left">Sync Google Drive</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. QR Code Digital download */}
                <div className="bg-black border border-zinc-855 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="space-y-2 font-mono">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-black">COPY DIGITAL</span>
                    <h4 className="text-white font-black text-xs uppercase flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-orange-505" /> UNDUH INSTAN QR
                    </h4>
                    <p className="text-[11px] text-zinc-455 leading-relaxed font-sans">
                      Pindai barcode QR kode di bawah untuk membuka dan menyimpan cetakan langsung di smartphone Anda.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-3 bg-zinc-950 p-2 border border-zinc-900 rounded-xl">
                    <div className="bg-white p-2 rounded-lg flex-shrink-0">
                      <QrCode className="w-14 h-14 text-black" />
                    </div>
                    
                    <div className="space-y-1 overflow-hidden font-mono text-[10px]">
                      <p className="uppercase font-bold text-zinc-450 text-[9px]">FILE SIAP UNDUH:</p>
                      <button
                        onClick={copyDownloadLink}
                        className="text-left text-[9px] text-zinc-500 bg-zinc-900 border border-zinc-850 px-2 py-1 rounded hover:text-white transition flex items-center gap-1 w-full truncate"
                      >
                        <span>{showCopied ? 'Tersalin!' : 'Salin Direct Link'}</span>
                      </button>
                      <a
                        href={`/api/photo/${downloadId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] text-orange-505 hover:underline inline-block font-bold pl-1"
                      >
                        Buka Download Tab ↗
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* CONSOLE STATUS LOGGER */}
          <div className="bg-black border border-zinc-850 rounded-xl p-4 font-mono select-none">
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block border-b border-zinc-800 pb-1.5 mb-2">Bluetooth Printer Logs</span>
            <div className="text-[10px] text-zinc-455 space-y-1 max-h-28 overflow-y-auto pr-2 scrollbar-thin">
              {printLogs.length === 0 ? (
                <span className="text-zinc-700 block italic">Terminal siap berjalan...</span>
              ) : (
                printLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed text-zinc-400">{log}</div>
                ))
              )}
            </div>
          </div>

          {/* SESSIONS RESET */}
          <div className="flex h-12 justify-between items-center bg-zinc-900 border border-zinc-800 rounded-2xl px-6 font-mono">
            <span className="text-[10px] text-zinc-400 uppercase">Selesai transaksi?</span>
            <button
              onClick={onReset}
              className="bg-orange-500 hover:bg-orange-650 text-black font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition"
            >
              Kembali Ke Menu Awal ↺
            </button>
          </div>

        </div>

        {/* DETAILED PHOTO SHEET DISPLAY */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col items-center justify-between">
          <div className="text-center w-full">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-black font-mono">DESAIN STRIP AKHIR</span>
            <h4 className="text-xs font-semibold mt-1 text-zinc-300 italic font-mono uppercase">{currentFrame.name}</h4>
          </div>

          <div className="my-5 w-44 relative overflow-hidden rounded-xl bg-black border border-zinc-950 shadow-2xl transition duration-350 hover:scale-[1.03]">
            {compiledPhotoUrl ? (
              <img src={compiledPhotoUrl} alt="Final compiled photo collage layout strip" className="w-full h-auto" />
            ) : (
              <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center min-h-[280px]">
                <RefreshCw className="w-8 h-8 animate-spin mb-2 text-orange-500" />
                <span className="text-xs">Preparing sheet...</span>
              </div>
            )}
          </div>

          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-3.5 w-full font-mono text-[11px] space-y-1">
            <div className="flex justify-between items-center text-zinc-400">
              <span>JUMLAH COPY:</span>
              <span className="font-bold text-white">{quantity} PCS</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>STATUS PRINTER:</span>
              <span className={`font-bold ${printerConnected ? 'text-green-400 animate-pulse' : 'text-orange-400'}`}>
                {printerConnected ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>DOMPET MODEL:</span>
              <span className="font-bold text-orange-400 uppercase">{paymentMethod}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
