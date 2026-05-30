import React, { useState, useEffect, useRef } from 'react';
import { FrameType } from '../types';
import { FRAMES } from '../lib/FrameSelection';
import { Camera, Clock, RefreshCw, Sparkles, Smile, Play, Sliders, Check, Trash2, ArrowUp, Zap } from 'lucide-react';
import gifshot from 'gifshot';

interface CameraCaptureProps {
  selectedFrameId: string;
  defaultCountdown: number;
  sessionTimeoutSeconds: number;
  onPhotosCaptured: (photos: string[], compiledUrl: string, gifUrl?: string, videoUrl?: string) => void;
  onBack: () => void;
}

export default function CameraCapture({
  selectedFrameId,
  defaultCountdown,
  sessionTimeoutSeconds,
  onPhotosCaptured,
  onBack
}: CameraCaptureProps) {
  const currentFrame = FRAMES.find(f => f.id === selectedFrameId) || FRAMES[0];
  
  // Custom states matching user requirements
  const [maxPoses, setMaxPoses] = useState<number>(4); // user request: custom choices 2, 3, and 4 poses
  const customCountdown = defaultCountdown; // fixed per admin configuration
  
  // Session global timer state
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(sessionTimeoutSeconds || 60);

  // Active session and capture tracking
  const [isSessionStarted, setIsSessionStarted] = useState<boolean>(false);
  const [currentPoseIdx, setCurrentPoseIdx] = useState<number>(0);
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<boolean>(false);
  const [showFlash, setShowFlash] = useState<boolean>(false);

  // Single pose retaking custom engine (satisfies user requests)
  const [singleRetakeIdx, setSingleRetakeIdx] = useState<number | null>(null);

  // HTML Media Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // High-fidelity dynamic asset states (JPG, GIF, WebM video)
  const [recordedVideoBase64, setRecordedVideoBase64] = useState<string>('');
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const mediaRecorderRef = useRef<any>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  // Start media recording (Supports live webcam or Canvas-bouncing fallback)
  const startVideoRecording = () => {
    videoChunksRef.current = [];
    if (streamRef.current && cameraActive) {
      try {
        const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            videoChunksRef.current.push(event.data);
          }
        };
        recorder.onstop = () => {
          const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            setRecordedVideoBase64(reader.result as string);
          };
          reader.readAsDataURL(videoBlob);
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
      } catch (err) {
        console.warn("MediaRecorder fails on device stream. Launching canvas simulated video recorder.", err);
        startCanvasSimulatedVideo();
      }
    } else {
      startCanvasSimulatedVideo();
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping media recorder instance", err);
      }
    }
  };

  const startCanvasSimulatedVideo = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const stream = (canvas as any).captureStream(10); // 10 fps
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) videoChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedVideoBase64(reader.result as string);
        };
        reader.readAsDataURL(videoBlob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      let frame = 0;
      const intervalId = setInterval(() => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
          clearInterval(intervalId);
          return;
        }
        if (frame > 65) { // 6.5 seconds limit
          clearInterval(intervalId);
          if (recorder.state !== 'inactive') recorder.stop();
          return;
        }

        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, 320, 240);

        // Bouncing decorative elements
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 1;
        for (let x = 0; x < 320; x += 40) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 240); ctx.stroke();
        }
        for (let y = 0; y < 240; y += 40) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(320, y); ctx.stroke();
        }

        const angle = frame * 0.15;
        const x = 160 + Math.cos(angle) * 70;
        const y = 120 + Math.sin(angle) * 50;

        ctx.fillStyle = '#f57c00';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SNAPBOX RECORDING', 160, 200);
        ctx.fillText(`FRAME ${frame}/65`, 160, 220);

        frame++;
      }, 100);
    } catch (e) {
      console.warn("Browser constraints blocking canvas captures. Static media fallback used.", e);
      setRecordedVideoBase64("data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAzVkYXRh...");
    }
  };

  // Countdown timer ticker for photo sessions
  useEffect(() => {
    const mainTimer = setInterval(() => {
      setSessionTimeLeft((p) => {
        if (p <= 1) {
          clearInterval(mainTimer);
          handleAutoTimeOutCompile();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(mainTimer);
  }, [maxPoses, capturedPhotos]);

  const handleAutoTimeOutCompile = () => {
    stopVideoRecording();
    // Fill all missing slots up to maxPoses with nice generated mock photos to allow safe layout processing
    const updated = [...capturedPhotos];
    for (let i = 0; i < maxPoses; i++) {
      if (!updated[i]) {
        updated[i] = generateMockAvatarPhoto(i);
      }
    }
    setCapturedPhotos(updated);
    compileFinalFrameSelection(updated);
  };

  // Initialize camera stream
  useEffect(() => {
    async function setupCamera() {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setCameraActive(true);
          setCameraError(false);
        }
      } catch (err) {
        console.warn('Camera lookup failed or blocked. Activating simulated photobox mock feed.', err);
        setCameraActive(false);
        setCameraError(true);
      }
    }

    if (!isSessionStarted && singleRetakeIdx === null) {
      setupCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isSessionStarted, singleRetakeIdx]);

  // Handle countdown timer ticker
  useEffect(() => {
    let timerId: any;
    if ((isSessionStarted || singleRetakeIdx !== null) && countdownLeft !== null) {
      if (countdownLeft > 0) {
        timerId = setTimeout(() => {
          setCountdownLeft(countdownLeft - 1);
        }, 1000);
      } else {
        // Countdown completed: Shutter & Save!
        triggerCapture();
      }
    }
    return () => clearTimeout(timerId);
  }, [countdownLeft, isSessionStarted, singleRetakeIdx]);

  // Start sequential photoshoot session
  const startPhotoshoot = () => {
    setIsSessionStarted(true);
    setSingleRetakeIdx(null);
    setCapturedPhotos(new Array(maxPoses).fill(''));
    setCurrentPoseIdx(0);
    setCountdownLeft(customCountdown);
    startVideoRecording();
  };

  // Start single pose retake
  const handleSinglePoseRetake = (index: number) => {
    setSingleRetakeIdx(index);
    setIsSessionStarted(false);
    setCountdownLeft(customCountdown);
  };

  // Delete a specific pose from the current collection
  const handleSinglePoseDelete = (index: number) => {
    setCapturedPhotos(prev => {
      const updated = [...prev];
      updated[index] = '';
      return updated;
    });
  };

  // Capture Single Frame
  const triggerCapture = () => {
    // White screen shutter blink effect
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    let photoDataUrl = '';

    // If live camera stream acts normally
    if (cameraActive && videoRef.current) {
      const vid = videoRef.current;
      const internalCanvas = document.createElement('canvas');
      internalCanvas.width = 640;
      internalCanvas.height = 480;
      const ctx = internalCanvas.getContext('2d');
      if (ctx) {
        // Mirror horizontally for natural photo preview alignment
        ctx.translate(internalCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(vid, 0, 0, internalCanvas.width, internalCanvas.height);
        // Reset translation matrix
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        photoDataUrl = internalCanvas.toDataURL('image/jpeg', 0.9);
      }
    } else {
      // Standalone sandbox visual generator simulation fallback
      photoDataUrl = generateMockAvatarPhoto(singleRetakeIdx !== null ? singleRetakeIdx : currentPoseIdx);
    }

    // Capture logic depending on mode
    if (singleRetakeIdx !== null) {
      // Re-taking a single pose specifically (user customize request)
      const target = singleRetakeIdx;
      setCapturedPhotos(prev => {
        const updated = [...prev];
        updated[target] = photoDataUrl;
        return updated;
      });
      setSingleRetakeIdx(null);
      setCountdownLeft(null);
    } else {
      // Multi-shutter sequence run
      const targetIdx = currentPoseIdx;
      setCapturedPhotos(prev => {
        const updated = [...prev];
        updated[targetIdx] = photoDataUrl;
        
        const nextIdx = targetIdx + 1;
        if (nextIdx < maxPoses) {
          setTimeout(() => {
            setCurrentPoseIdx(nextIdx);
            setCountdownLeft(customCountdown);
          }, 1500);
        } else {
          // Finished auto sequence
          setCountdownLeft(null);
          setIsSessionStarted(false);
          stopVideoRecording();
        }
        return updated;
      });
    }
  };

  // Compile final selection to custom container heights fitting 2, 3, or 4 poses dynamically
  const handleFinalizeAndCompile = () => {
    // Collect non-empty poses
    const readyPhotos = capturedPhotos.filter(p => !!p);
    if (readyPhotos.length < maxPoses) {
      alert(`Silakan lengkapi seluruh ${maxPoses} pose terlebih dahulu sebelum melanjutkan kompilasi kustom!`);
      return;
    }
    compileFinalFrameSelection(readyPhotos);
  };

  // Generate fancy simulated photos inside sandbox environments
  const generateMockAvatarPhoto = (index: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const colors = ['#f43f5e', '#6366f1', '#06b6d4', '#10b981'];
      const textColors = ['#ffe4e6', '#e0e7ff', '#ecfeff', '#d1fae5'];
      const bg = colors[index % colors.length];
      const textCol = textColors[index % textColors.length];
      
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 640, 480);
      
      // Grid pattern overlay
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2;
      for (let x = 0; x < 640; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 480);
        ctx.stroke();
      }
      for (let y = 0; y < 480; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(640, y);
        ctx.stroke();
      }

      // Drawing a premium emoji layout silhouette face
      ctx.fillStyle = textCol;
      ctx.beginPath();
      ctx.arc(320, 240, 105, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(280, 215, 12, 0, Math.PI * 2);
      ctx.arc(360, 215, 12, 0, Math.PI * 2);
      ctx.fill();

      // Smile
      ctx.beginPath();
      ctx.arc(320, 255, 42, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#1e1b4b';
      ctx.stroke();

      // Metadata info overlays
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(`SNAP POSE ${index + 1} ✨`, 40, 60);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '14px Courier New';
      ctx.fillText('Digital Camera Mirror Mockup Live Feed', 40, 440);
    }
    return canvas.toDataURL('image/jpeg');
  };

  const compileFinalFrameSelection = (photosToCompile: string[]) => {
    setIsCompiling(true);

    // Stop recording is a failsafe in case it is still active
    stopVideoRecording();

    // Generate Animated GIF asynchronously via gifshot
    gifshot.createGIF({
      images: photosToCompile,
      gifWidth: 320,
      gifHeight: 240,
      interval: 0.35,
      numFrames: photosToCompile.length,
      frameDuration: 3.5,
      keepCameraOn: false
    }, (obj) => {
      const generatedGif = !obj.error ? obj.image : (photosToCompile[0] || '');

      // Proceed to draw high-resolution photostrip JPG
      const finalWidth = 400;
      const finalHeight = 1100;
      
      const canvas = document.createElement('canvas');
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsCompiling(false);
        return;
      }

      // Outer frame color code mapping
      ctx.fillStyle = getFrameHexColor(currentFrame.id);
      ctx.fillRect(0, 0, finalWidth, finalHeight);

      // Load elements sequentially
      let loadedCount = 0;
      const imgObjects = photosToCompile.map((src) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          loadedCount++;
          if (loadedCount === photosToCompile.length) {
            renderStrip();
          }
        };
        return img;
      });

      function renderStrip() {
        const padding = 22;
        const photoWidth = finalWidth - (padding * 2);
        
        const count = photosToCompile.length;
        // Adjust photocard size depending on chosen poses
        const photoHeight = count === 2 ? 385 : count === 3 ? 260 : 190;
        const photoSpacing = count === 2 ? 65 : count === 3 ? 45 : 28;
        const startY = count === 2 ? 90 : count === 3 ? 55 : 30;

        imgObjects.forEach((img, i) => {
          const yPos = startY + i * (photoHeight + photoSpacing);
          
          ctx.fillStyle = '#000000';
          ctx.shadowColor = 'rgba(0,0,0,0.18)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 5;
          
          ctx.fillRect(padding, yPos, photoWidth, photoHeight);
          ctx.shadowColor = 'transparent'; // reset shadow

          // Render photo
          ctx.drawImage(img, padding, yPos, photoWidth, photoHeight);
        });

        // Overlay pattern style if present
        if (currentFrame.customBg) {
          ctx.globalAlpha = 0.25;
          const patternImg = new Image();
          patternImg.src = currentFrame.customBg;
          patternImg.onload = () => {
            ctx.drawImage(patternImg, 0, 0, finalWidth, finalHeight);
            drawBranding();
          };
        } else {
          drawBranding();
        }

        function drawBranding() {
          ctx.globalAlpha = 1.0;
          ctx.shadowColor = 'transparent';
          ctx.font = 'bold 22px Courier New';
          ctx.textAlign = 'center';

          const textColor = getThemeTextHexColor(currentFrame.id);
          ctx.fillStyle = textColor;
          ctx.fillText('♥ PHOTOBOOT ♥', finalWidth / 2, 980);

          ctx.font = '14px Courier New';
          const formattedDate = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
          ctx.fillText(formattedDate, finalWidth / 2, 1010);
          ctx.fillText(`kustom ${count} pose strip`, finalWidth / 2, 1030);

          const compiledBase64 = canvas.toDataURL('image/jpeg', 0.95);
          
          // Complete and fire photos captures back to main app
          onPhotosCaptured(photosToCompile, compiledBase64, generatedGif, recordedVideoBase64);
          setIsCompiling(false);
        }
      }
    });
  };

  const getFrameHexColor = (id: string): string => {
    switch (id) {
      case 'classic-pink': return '#ffe4e6';
      case 'retro-dark': return '#121214';
      case 'cyberpunk-neon': return '#09090b';
      case 'minimal-white': return '#f8fafc';
      case 'summer-sun': return '#fffbeb';
      case 'forest-sage': return '#064e3b';
      default: return '#121214';
    }
  };

  const getThemeTextHexColor = (id: string): string => {
    if (id === 'retro-dark' || id === 'cyberpunk-neon' || id === 'forest-sage') {
      return '#f4f4f5';
    }
    return '#18181b';
  };

  return (
    <div id="camera-capture-view" className="space-y-6 animate-fade-in relative">
      
      {/* COMPILING FULLSCREEN SPINNER MODAL */}
      {isCompiling && (
        <div className="fixed inset-0 bg-black/95 z-[999] flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-auto">
          <div className="max-w-md space-y-6">
            <RefreshCw className="w-12 h-12 animate-spin text-orange-500 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase text-white font-mono tracking-wider font-extrabold pb-2">SEDANG MENYUSUN TATA LETAK...</h3>
              <p className="text-xs text-zinc-400 font-mono uppercase tracking-wide">MEMBUAT PHOTOSTRIP JPG, BERKAS ANIMASI GIF & VIDEO REKAMAN DIGITAL</p>
            </div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
              <div className="h-full bg-orange-500 animate-pulse" style={{ width: '75%' }} />
            </div>
          </div>
        </div>
      )}

      {/* SHUTTER SPEED BLINK FLASH WINDOW */}
      {showFlash && (
        <div className="absolute inset-0 bg-white z-50 animate-pulse transition-opacity duration-75 flex items-center justify-center pointer-events-none">
          <span className="text-4xl font-black text-rose-500 tracking-wider">CHEEESE! 📸💥</span>
        </div>
      )}

      {/* SESSION TIMER ALERT */}
      <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between border transition-all ${
        sessionTimeLeft <= 15
          ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
          : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
      }`}>
        <div className="flex items-center gap-3">
          <Clock className={`w-5 h-5 ${sessionTimeLeft <= 15 ? 'text-red-500 animate-bounce' : 'text-orange-400'}`} />
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider font-mono">
              {sessionTimeLeft <= 15 ? '⏱️ SISA WAKTU INTERAKTIF SEGERA HABIS' : '⏱️ TOTAL SESSION-WIDE TIMER'}
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono uppercase">
              Selama waktu ada, Anda bebas menambah, menghapus, atau me-retake foto. Jika waktu habis, sistem otomatis melangkah ke menu cetak.
            </p>
          </div>
        </div>
        <div className="text-right mt-2 sm:mt-0 font-mono">
          <span className="text-3xl font-black text-white leading-none">
            {sessionTimeLeft} <span className="text-xs font-bold text-zinc-400">s</span>
          </span>
        </div>
      </div>

      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button id="btn-back-to-frame" onClick={onBack} className="text-xs font-black text-orange-500 hover:text-orange-400 transition-colors flex items-center gap-1.5 uppercase tracking-wider font-mono">
            ← Kembali Pilih Frame
          </button>
          <h2 className="text-2xl font-black text-white mt-1.5 flex items-center gap-2 uppercase tracking-tight font-mono">
            <Camera className="w-6 h-6 text-orange-500" /> Sesi Kustom Kamera
          </h2>
        </div>

        {/* Dynamic Pose Interval & Count selection configs */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Custom Pose Count selector (2, 3, or 4 poses) */}
          <div className="flex items-center bg-zinc-90 w-auto bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 gap-1.5">
            <span className="text-[10px] text-zinc-500 font-bold font-mono">POSE:</span>
            <div className="flex gap-1">
              {[2, 3, 4].map((pCount) => (
                <button
                  key={pCount}
                  disabled={isSessionStarted || singleRetakeIdx !== null}
                  onClick={() => {
                    setMaxPoses(pCount);
                    setCapturedPhotos(new Array(pCount).fill(''));
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-black transition-all font-mono ${
                    maxPoses === pCount
                      ? 'bg-orange-500 text-black'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
                >
                  {pCount}P
                </button>
              ))}
            </div>
          </div>

          {/* Time per Pose indicator - Fixed style per admin config */}
          <div className="flex items-center w-auto bg-zinc-905 px-3 py-1.5 rounded-xl border border-zinc-800 gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[10px] text-zinc-400 font-bold font-mono">Waktu per Pose:</span>
            <span className="text-xs text-white font-black font-mono bg-black border border-zinc-800 px-2 py-0.5 rounded">
              {customCountdown} Detik
            </span>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* WEBCAM FEED PREVIEW OR MOCK CONTAINER */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-zinc-900 border border-zinc-800 rounded-3xl p-4 overflow-hidden relative shadow-2xl min-h-[460px]">
          
          <div className="relative aspect-[4/3] w-full max-w-xl mx-auto bg-black rounded-2xl border border-zinc-950 overflow-hidden flex items-center justify-center">
            
            {/* Live mirror video object */}
            {cameraActive && !isSessionStarted && singleRetakeIdx === null && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              />
            )}

            {/* Countdown State Overlay display */}
            {(isSessionStarted || singleRetakeIdx !== null) && countdownLeft !== null && (
              <>
                {cameraActive && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-65"
                  />
                )}
                
                {/* Countdown Circle visual widget */}
                <div className="relative z-10 flex flex-col items-center justify-center bg-black/75 w-32 h-32 rounded-full border-4 border-orange-500 animate-bounce">
                  <span className="text-6.5xl font-black text-white font-mono leading-none">{countdownLeft}</span>
                  <span className="text-[10px] text-zinc-350 font-black uppercase tracking-widest mt-1">
                    {singleRetakeIdx !== null ? `RETAKE ${singleRetakeIdx + 1}` : `POSE ${currentPoseIdx + 1}`}
                  </span>
                </div>
              </>
            )}

            {/* Mock graphics simulation fallback if permission/hardware is absent */}
            {!cameraActive && !isSessionStarted && singleRetakeIdx === null && (
              <div className="text-center p-6 space-y-4 max-w-sm">
                <Smile className="w-12 h-12 text-zinc-650 mx-auto animate-pulse" />
                <p className="text-xs text-zinc-400 font-mono">LIVE PREVIEW CAMERA STANDBY MOCKUP</p>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">Hardware kamera siap mensimulasikan pose kustom beresolusi tinggi otomatis.</p>
                <div className="bg-orange-500/10 border border-orange-500/30 px-3 py-1 text-orange-500 text-[10px] font-bold rounded-full font-mono uppercase tracking-widest">
                  Ready Simulation Mode
                </div>
              </div>
            )}
          </div>

          {/* LOWER CONTROLS PANEL */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-800 pt-4">
            
            <div className="text-xs text-zinc-400 flex items-center gap-2 font-mono">
              <span className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`} />
              <span className="font-bold uppercase">
                {cameraActive ? 'KAMERA ONLINE (Selfie Mirroring)' : 'MODE TEST SIMULASI AKADEMIS'}
              </span>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {!isSessionStarted && singleRetakeIdx === null ? (
                <button
                  id="btn-start-photoshoot"
                  onClick={startPhotoshoot}
                  className="bg-orange-500 hover:bg-orange-600 text-black font-black px-6 py-3 rounded-xl shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 active:scale-95 transition-all text-xs w-full sm:w-auto uppercase tracking-widest font-mono"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Mulai Foto ({maxPoses} Pose Seri)</span>
                </button>
              ) : (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 font-mono text-xs text-orange-400 font-bold text-center w-full">
                  ⏱️ SHUTTER AKTIF • {singleRetakeIdx !== null ? `MENGULANG FOTO ${singleRetakeIdx + 1}` : `POSE SESEORANG ${currentPoseIdx + 1} / ${maxPoses}`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* THUMBNAIL HIGHLIGHT SIDE CONTROL PANEL (Satisfies user request to: Retake, delete, and manage pose indices) */}
        <div className="lg:col-span-4 bg-zinc-900 p-5 rounded-3xl border border-zinc-800 flex flex-col justify-between self-stretch min-h-[460px]">
          <div>
            <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest mb-4 font-mono flex items-center justify-between">
              <span>Review Pose ({maxPoses} Slot)</span>
              <span className="text-[10px] text-zinc-500">Klik Untuk Edit</span>
            </h3>
            
            {/* Grid of Dynamic Poses to edit/manage */}
            <div className="space-y-3">
              {Array.from({ length: maxPoses }).map((_, pos) => {
                const img = capturedPhotos[pos];
                const isEmpty = !img;
                
                return (
                  <div
                    key={pos}
                    className="border border-zinc-800/80 bg-black/60 rounded-xl p-2 flex items-center justify-between gap-3 relative shadow-md transition-all hover:border-zinc-700 hover:bg-black"
                  >
                    {/* Thumbnail box */}
                    <div className="w-16 h-12 bg-zinc-950 rounded bg-zinc-950 flex-shrink-0 overflow-hidden border border-zinc-800 relative flex items-center justify-center">
                      {!isEmpty ? (
                        <img src={img} alt={`Pose thumbnail ${pos + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <Smile className="w-4 h-4 text-zinc-700" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black font-mono text-zinc-300">POSE {pos + 1}</p>
                      <p className="text-[9px] text-zinc-500 font-mono truncate uppercase">
                        {isEmpty ? 'Foto Belum Diambil' : 'Sudah Siap'}
                      </p>
                    </div>

                    {/* Edit Tools overlay actions: trigger retake or delete specific index */}
                    <div className="flex gap-1">
                      {isEmpty ? (
                        <button
                          onClick={() => handleSinglePoseRetake(pos)}
                          disabled={isSessionStarted || singleRetakeIdx !== null}
                          className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 p-1.5 rounded transition text-[10px]"
                          title="Ambil snapshot untuk pose ini"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSinglePoseRetake(pos)}
                            disabled={isSessionStarted || singleRetakeIdx !== null}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-1.5 rounded transition text-[10px]"
                            title="Ambil Ulang Pose Ini"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSinglePoseDelete(pos)}
                            disabled={isSessionStarted || singleRetakeIdx !== null}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1.5 rounded transition text-[10px]"
                            title="Hapus Pose Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Shutter targeted visual state card */}
                    {singleRetakeIdx === pos && (
                      <div className="absolute inset-0 bg-orange-500/15 border border-orange-500 rounded-xl flex items-center justify-center">
                        <span className="bg-orange-500 text-black text-[9px] font-bold px-2 py-0.5 rounded animate-pulse">MEMOTRET RE-TAKE...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 mt-6">
            <button
              onClick={handleFinalizeAndCompile}
              disabled={capturedPhotos.filter(p => !!p).length < maxPoses || isSessionStarted || singleRetakeIdx !== null}
              className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition shadow-lg ${
                capturedPhotos.filter(p => !!p).length < maxPoses || isSessionStarted || singleRetakeIdx !== null
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-850'
                  : 'bg-green-500 text-black hover:bg-green-600 shadow-green-500/10'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3px]" />
              <span>Gabungkan Layout Frame ({maxPoses} Pose)</span>
            </button>
            <p className="text-[10px] text-zinc-500 leading-normal text-center font-mono uppercase">
              *Klik simbol edit di samping snapshot untuk mengulang pose tertentu kesukaanmu.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
