import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, RotateCcw, Check, Pencil, ArrowRight, Camera, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MoodDetectorProps {
  onMoodDetected: (moodId: string) => void;
  onCustomMood: (text: string) => void;
  detectedMood: string | null;
  onReset: () => void;
  onMoodEvent?: (event: {
    moodId: string;
    method: "camera" | "quiz";
    detectedEmotion?: string | null;
  }) => void;
}

// Mood scoring: each answer maps moodId → points
const QUESTIONS = [
  {
    id: "energy",
    text: "How's your energy right now?",
    sub: "Be honest — we'll find the perfect match.",
    options: [
      { label: "Calm & relaxed",      emoji: "😌", scores: { neutral: 3, sad: 1 } },
      { label: "Wired & restless",    emoji: "⚡", scores: { angry: 3, surprise: 1 } },
      { label: "Curious, overthinking", emoji: "🌀", scores: { surprise: 3, fear: 1 } },
      { label: "Low-key anxious",     emoji: "😬", scores: { fear: 2, surprise: 1, neutral: 1 } },
    ],
  },
  {
    id: "want",
    text: "What do you want to feel after watching?",
    sub: "Pick the emotional destination.",
    options: [
      { label: "Warm & fuzzy inside", emoji: "🫶", scores: { happy: 3, neutral: 1 } },
      { label: "Heart still racing",  emoji: "🔥", scores: { angry: 3, surprise: 1 } },
      { label: "My mind is blown",    emoji: "🤯", scores: { surprise: 3, fear: 1 } },
      { label: "Glad I survived it",  emoji: "😱", scores: { fear: 3, surprise: 1 } },
    ],
  },
  {
    id: "scene",
    text: "Pick a vibe that matches tonight.",
    sub: "Go with your gut.",
    options: [
      { label: "Rain, blanket, tea",      emoji: "🌧️", scores: { sad: 3, neutral: 2 } },
      { label: "Lights off, headphones",  emoji: "🎧", scores: { fear: 2, surprise: 2 } },
      { label: "Need to punch something", emoji: "💢", scores: { angry: 3, disgust: 1 } },
      { label: "Want to cry a little",    emoji: "😢", scores: { sad: 3, happy: 1 } },
    ],
  },
  {
    id: "last",
    text: "Last one: pick your spirit genre.",
    sub: "The one that never gets old for you.",
    options: [
      { label: "Action / Thriller", emoji: "💥", scores: { angry: 3, surprise: 1 } },
      { label: "Sci-Fi / Mystery",  emoji: "🛸", scores: { surprise: 3, neutral: 1 } },
      { label: "Romance / Drama",   emoji: "💛", scores: { happy: 3, sad: 1 } },
      { label: "Horror / Dark",     emoji: "👁️", scores: { fear: 3, disgust: 1 } },
    ],
  },
];

const MOOD_META: Record<string, { label: string; emoji: string; color: string }> = {
  happy:    { label: "Happy",    emoji: "😊", color: "from-yellow-400 to-orange-400" },
  sad:      { label: "Sad",      emoji: "😢", color: "from-blue-500 to-indigo-600" },
  angry:    { label: "Angry",    emoji: "😠", color: "from-red-500 to-rose-700" },
  surprise: { label: "Surprise", emoji: "😮", color: "from-violet-500 to-purple-700" },
  fear:     { label: "Fear",     emoji: "😨", color: "from-slate-600 to-gray-900" },
  disgust:  { label: "Disgust",  emoji: "🤢", color: "from-green-700 to-emerald-900" },
  neutral:  { label: "Neutral",  emoji: "😐", color: "from-slate-400 to-slate-600" },
};

export default function MoodDetector({ onMoodDetected, onCustomMood, detectedMood, onReset, onMoodEvent }: MoodDetectorProps) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'idle' | 'quiz' | 'camera'>('idle');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [faceBox, setFaceBox] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoReadyRetryRef = useRef<number | null>(null);
  const faceDetectIntervalRef = useRef<number | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const isRunning = mode === 'quiz' && step > 0 && !revealed;
  const currentQ = QUESTIONS[step - 1];

  function startQuiz() {
    setMode('quiz');
    setCameraError(null);
    setStep(1);
    setScores({});
    setSelectedOptions([]);
    setRevealed(false);
    setPending(null);
    setCapturedImage(null);
  }

  function startCamera() {
    stopCamera();
    if (videoReadyRetryRef.current) {
      window.clearTimeout(videoReadyRetryRef.current);
      videoReadyRetryRef.current = null;
    }
    setVideoReady(false);
    setMode('camera');
    setCameraError(null);
    setRevealed(false);
    setPending(null);
    setCapturedImage(null);
  }

  // Effect to handle camera stream initialization when mode becomes 'camera'
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function initCamera() {
      if (mode !== 'camera') return;
      
      // If videoRef is not yet available, wait a tiny bit
      if (!videoRef.current) {
        console.log("videoRef not ready, retrying in 100ms...");
        videoReadyRetryRef.current = window.setTimeout(initCamera, 100);
        return;
      }

      console.log("Attempting to acquire camera stream...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        });
        
        console.log("Camera stream acquired successfully");
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          activeStream = stream;
          videoRef.current.onloadeddata = () => setVideoReady(true);
          videoRef.current.oncanplay = () => setVideoReady(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
        toast.error("Could not access camera. Please check permissions.");
        setCameraError("Camera access failed. Please allow camera permissions and try again.");
        setMode('idle');
      }
    }

    if (mode === 'camera') {
      initCamera();
    }

    return () => {
      if (videoReadyRetryRef.current) {
        window.clearTimeout(videoReadyRetryRef.current);
        videoReadyRetryRef.current = null;
      }
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode]);

  function stopCamera() {
    console.log("Stopping camera...");
    if (videoReadyRetryRef.current) {
      window.clearTimeout(videoReadyRetryRef.current);
      videoReadyRetryRef.current = null;
    }
    if (faceDetectIntervalRef.current) {
      clearInterval(faceDetectIntervalRef.current);
      faceDetectIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("Stopped track:", track.label);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setFaceBox(null);
  }

  // Draw face box overlay on the overlay canvas
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!faceBox || !videoReady) return;

    const scaleX = overlay.width / video.videoWidth;
    const scaleY = overlay.height / video.videoHeight;
    const x = faceBox.x * scaleX;
    const y = faceBox.y * scaleY;
    const w = faceBox.w * scaleX;
    const h = faceBox.h * scaleY;
    const corner = 18;

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 10;

    // Draw corner brackets only
    const drawCorner = (cx: number, cy: number, dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx * corner, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * corner);
      ctx.stroke();
    };
    drawCorner(x, y, 1, 1);
    drawCorner(x + w, y, -1, 1);
    drawCorner(x, y + h, 1, -1);
    drawCorner(x + w, y + h, -1, -1);

    // Label
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('FACE DETECTED', x, y - 8);
  }, [faceBox, videoReady]);

  // Real-time face detection using backend every 1.5s
  useEffect(() => {
    if (!videoReady || mode !== 'camera' || capturedImage) return;

    async function detectFace() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.5);

      try {
        const res = await fetch('http://localhost:5000/detect-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageData }),
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data = await res.json();
          setFaceBox(data.face || null);
        }
      } catch {
        // silently ignore detection errors
      }
    }

    faceDetectIntervalRef.current = window.setInterval(detectFace, 1500);
    detectFace();
    return () => {
      if (faceDetectIntervalRef.current) clearInterval(faceDetectIntervalRef.current);
    };
  }, [videoReady, mode, capturedImage]);

  useEffect(() => {
    // General cleanup on unmount
    return () => stopCamera();
  }, []);

  async function captureAndDetect() {
    console.log("Capturing image and detecting mood...");
    if (isScanning) {
      return;
    }

    if (!videoRef.current || !canvasRef.current) {
      console.warn("videoRef or canvasRef is missing", { video: !!videoRef.current, canvas: !!canvasRef.current });
      return;
    }

    setIsScanning(true);
    setCameraError(null);
    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Ensure video dimensions are valid
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Video dimensions are 0, waiting for video to load...");
      setCameraError("Camera is still starting. Please wait a moment, then try capture again.");
      setIsScanning(false);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    console.log(`Canvas dimensions set to ${canvas.width}x${canvas.height}`);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stopCamera();
      console.log(`Image captured (length: ${imageData.length})`);

      try {
        console.log("Sending request to backend: http://localhost:5000/detect-mood");
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 300000);
        let response: Response;
        try {
          response = await fetch('http://localhost:5000/detect-mood', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData }),
            signal: controller.signal,
          });
        } finally {
          window.clearTimeout(timeoutId);
        }

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Backend error response:", errorData);
          const errorMsg = errorData.details || errorData.error || 'Failed to detect mood';
          const errorHint = errorData.hint ? ` ${errorData.hint}` : "";
          const combinedError = `${errorMsg}${errorHint}`.trim();
          setCameraError(combinedError);
          toast.error(combinedError);
          throw new Error(errorMsg);
        }

        const result = await response.json();
        console.log("Backend response received:", result);

        if (result.error === "no_face") {
          setCameraError("No face detected. Make sure your face is well-lit and clearly visible, then retake.");
          toast.error("No face detected — try better lighting or move closer.");
          setCapturedImage(null);
          startCamera();
          setIsScanning(false);
          return;
        }

        setPending(result.mood_id);
        setRevealed(true);
        setMode('idle');
        onMoodEvent?.({
          moodId: result.mood_id,
          method: "camera",
          detectedEmotion: result.emotion ?? null,
        });
        onMoodDetected(result.mood_id);
      } catch (err: unknown) {
        console.error("Detection error:", err);
        const fallback =
          (err instanceof Error && err.name === "AbortError")
            ? "Detection timed out — the model may be warming up. Please try again."
            : "Capture worked, but detection failed. Please retake or restart the backend.";
        setCameraError(fallback);
        toast.error(fallback);
      } finally {
        setIsScanning(false);
      }
    } else {
      console.error("Failed to get 2D context from canvas");
      setIsScanning(false);
    }
  }

  function handleOption(optionIndex: number, optionScores: Record<string, number>) {
    if (selectedOptions[step - 1] !== undefined) return; 

    setSelectedOptions((prev) => {
      const next = [...prev];
      next[step - 1] = optionIndex;
      return next;
    });

    const newScores = { ...scores };
    for (const [moodId, pts] of Object.entries(optionScores)) {
      newScores[moodId] = (newScores[moodId] || 0) + pts;
    }
    setScores(newScores);

    setTimeout(() => {
      if (step < QUESTIONS.length) {
        setStep((s) => s + 1);
      } else {
        const detected = Object.entries(newScores).sort((a, b) => b[1] - a[1])[0][0];
        setPending(detected);
        setRevealed(true);
        onMoodEvent?.({
          moodId: detected,
          method: "quiz",
        });
        onMoodDetected(detected);
      }
    }, 420);
  }

  function handleReset() {
    setStep(0);
    setScores({});
    setSelectedOptions([]);
    setRevealed(false);
    setPending(null);
    setCameraError(null);
    setShowCustom(false);
    setCustomText("");
    setCapturedImage(null);
    setMode('idle');
    stopCamera();
    onReset();
  }

  function handleCustomSubmit() {
    const trimmed = customText.trim();
    if (!trimmed) return;
    onCustomMood(trimmed);
    setShowCustom(false);
    setRevealed(false);
    setStep(0);
  }

  const activeMood = pending || detectedMood;
  const meta = activeMood ? MOOD_META[activeMood] : null;

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {/* ── Result View ── */}
        {(revealed || !!detectedMood) && meta ? (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 space-y-6"
          >
            <div className="flex flex-col md:flex-row items-center gap-6">
              {capturedImage && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-32 h-32 shrink-0 rounded-2xl overflow-hidden border-2 border-primary/50 shadow-lg">
                  <img src={capturedImage} alt="Captured expression" className="w-full h-full object-cover" />
                </motion.div>
              )}
              <div className="space-y-2 flex-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mood Detected</p>
                <div className={cn(
                  "inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r text-white font-black text-lg uppercase tracking-tight",
                  meta.color
                )}>
                  <span className="text-2xl">{meta.emoji}</span>
                  {meta.label}
                </div>
                <p className="text-[10px] text-slate-400 font-medium pt-1">
                  We've detected you're in the mood for{" "}
                  <span className="text-primary font-bold">{meta.label.toLowerCase()}</span> cinema.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </motion.button>
            </div>

            {/* Custom mood fallback */}
            <div className="border-t border-white/5 pt-5 space-y-3">
              {!showCustom ? (
                <motion.button
                  whileHover={{ x: 3 }}
                  onClick={() => { setShowCustom(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="flex items-center gap-2 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest"
                >
                  <Pencil className="w-3 h-3" />
                  Describe your mood instead
                </motion.button>
              ) : (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                      placeholder="e.g. nostalgic, melancholic..."
                      className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                    />
                    <button onClick={handleCustomSubmit} className="p-2 bg-primary rounded-xl"><ArrowRight className="w-4 h-4 text-white" /></button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : mode === 'camera' ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 space-y-6 overflow-hidden relative"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-black text-white uppercase tracking-tight">Mood Scanner</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Face the camera and capture</p>
              </div>
              <button onClick={() => { stopCamera(); setMode('idle'); }} className="p-2 rounded-full hover:bg-white/10"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/5">
              {capturedImage ? (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedData={() => {
                      setVideoReady(true);
                      if (overlayCanvasRef.current && videoRef.current) {
                        overlayCanvasRef.current.width = videoRef.current.videoWidth || 640;
                        overlayCanvasRef.current.height = videoRef.current.videoHeight || 480;
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                  {!videoReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  )}
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
              {isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest text-white">Analyzing...</p>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {cameraError}
              </div>
            )}

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={captureAndDetect}
                disabled={isScanning || (!capturedImage && !videoReady)}
                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                Capture & Analyze
              </motion.button>
              {capturedImage && !isScanning && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setCapturedImage(null);
                    setCameraError(null);
                    startCamera();
                  }}
                  className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Retake
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : isRunning && currentQ ? (
          <motion.div
            key={`q-${step}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 space-y-6"
          >
            <div className="flex items-center gap-3">
              {QUESTIONS.map((_, i) => (
                <div key={i} className={cn("h-1 flex-1 rounded-full", i < step ? "bg-primary" : "bg-white/10")} />
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-xl font-black text-white uppercase tracking-tight">{currentQ.text}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{currentQ.sub}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {currentQ.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleOption(i, opt.scores)}
                  className="p-4 rounded-2xl border border-white/10 bg-card/40 hover:border-primary/40 text-left transition-all space-y-1"
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <p className="text-[11px] font-black uppercase tracking-tight text-foreground">{opt.label}</p>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-start gap-4"
          >
            <div className="flex flex-wrap gap-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={startQuiz}
                className="group flex items-center gap-3 px-6 py-4 rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/20 hover:border-primary/60 transition-all"
              >
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-sm font-black uppercase tracking-widest text-primary">Quick Quiz</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={startCamera}
                className="group flex items-center gap-3 px-6 py-4 rounded-2xl bg-violet-500/10 border border-violet-500/30 hover:bg-violet-500/20 hover:border-violet-500/60 transition-all"
              >
                <Camera className="w-5 h-5 text-violet-500" />
                <span className="text-sm font-black uppercase tracking-widest text-violet-500">Scan My Face</span>
              </motion.button>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Detect your mood via camera or quick questions</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
