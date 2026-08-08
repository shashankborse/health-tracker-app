"use client";

import { useEffect, useRef, useState } from "react";

type Stage = "starting" | "previewing" | "recording" | "reviewing" | "uploading" | "error";

const RECORD_MIME_TYPE = "video/mp4";

export default function RecordExerciseModal({
  planExerciseId,
  recordedDate,
  onClose,
  onSaved,
}: {
  planExerciseId: string;
  recordedDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [stage, setStage] = useState<Stage>("starting");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!MediaRecorder.isTypeSupported(RECORD_MIME_TYPE)) {
        setError("Video recording isn't supported on this device.");
        setStage("error");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStage("previewing");
      } catch {
        setError("Couldn't access the camera. Check camera permissions for this app.");
        setStage("error");
      }
    }
    start();

    return () => {
      cancelled = true;
      stopStream();
      stopTimer();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleStartRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: RECORD_MIME_TYPE,
      videoBitsPerSecond: 1_000_000,
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: RECORD_MIME_TYPE });
      blobRef.current = blob;
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      stopStream();
      stopTimer();
      setStage("reviewing");
    };
    recorderRef.current = recorder;
    recorder.start();
    setElapsedSeconds(0);
    timerRef.current = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    setStage("recording");
  }

  function handleStopRecording() {
    recorderRef.current?.stop();
  }

  function handleRetake() {
    blobRef.current = null;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setError(null);
    setStage("starting");
    // Re-run the effect's camera-acquisition logic by remounting via key
    // would be cleaner, but a direct re-call keeps this component simple.
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStage("previewing");
      } catch {
        setError("Couldn't access the camera. Check camera permissions for this app.");
        setStage("error");
      }
    })();
  }

  async function handleSave() {
    const blob = blobRef.current;
    if (!blob) return;
    setStage("uploading");
    setError(null);

    const formData = new FormData();
    formData.set("plan_exercise_id", planExerciseId);
    formData.set("recorded_date", recordedDate);
    formData.set("video", blob, "exercise-recording.mp4");

    const res = await fetch("/api/workouts/recordings", { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Upload failed. Please try again.");
      setStage("reviewing");
      return;
    }
    onSaved();
    onClose();
  }

  function formatElapsed(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-base font-medium text-white">Record</p>
          <button onClick={onClose} className="px-2 text-2xl leading-none text-white">
            ×
          </button>
        </div>

        <div className="relative aspect-[9/16] w-full bg-black">
          {stage === "error" && (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-white">
              {error}
            </div>
          )}
          {stage === "starting" && (
            <div className="flex h-full w-full items-center justify-center text-sm text-white">
              Starting camera…
            </div>
          )}
          {(stage === "previewing" || stage === "recording") && (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          )}
          {stage === "recording" && (
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--danger)" }} />
              <span className="text-xs font-medium text-white">{formatElapsed(elapsedSeconds)}</span>
            </div>
          )}
          {(stage === "reviewing" || stage === "uploading") && previewUrl && (
            <video src={previewUrl} controls playsInline className="h-full w-full object-cover" />
          )}
        </div>

        {(stage === "reviewing" || stage === "uploading") && error && (
          <p className="px-4 pt-3 text-center text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <div className="flex gap-2 p-4">
          {stage === "previewing" && (
            <button
              onClick={handleStartRecording}
              className="flex-1 rounded-xl py-3 text-center text-base font-semibold text-white"
              style={{ backgroundColor: "var(--danger)" }}
            >
              Start Recording
            </button>
          )}
          {stage === "recording" && (
            <button
              onClick={handleStopRecording}
              className="flex-1 rounded-xl py-3 text-center text-base font-semibold text-white"
              style={{ backgroundColor: "var(--danger)" }}
            >
              Stop
            </button>
          )}
          {stage === "reviewing" && (
            <>
              <button
                onClick={handleRetake}
                className="flex-1 rounded-xl py-3 text-center text-base font-medium text-white"
                style={{ backgroundColor: "color-mix(in srgb, white 15%, transparent)" }}
              >
                Retake
              </button>
              <button
                onClick={handleSave}
                className="flex-1 rounded-xl py-3 text-center text-base font-semibold text-white"
                style={{ backgroundColor: "var(--accent)" }}
              >
                Save
              </button>
            </>
          )}
          {stage === "uploading" && (
            <p className="w-full py-3 text-center text-base font-medium text-white">Uploading…</p>
          )}
        </div>
      </div>
    </div>
  );
}
