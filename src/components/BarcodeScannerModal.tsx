"use client";

import { useEffect, useRef, useState } from "react";
import { BarcodeDetector } from "barcode-detector/ponyfill";

// Side-effect-free ponyfill import (not the global-installing polyfill) —
// Next.js still evaluates "use client" component modules during SSR for
// the initial HTML, so anything that touches browser globals at import
// time needs to stay out of module scope. The detector itself is only
// ever constructed inside an effect, never at import time.

type Stage = "starting" | "scanning" | "error";

const SCAN_INTERVAL_MS = 300;
// Standard retail product barcode formats — Open Food Facts items are
// keyed by EAN-13/EAN-8 (most of the world) or UPC-A/UPC-E (US).
const BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;

export default function BarcodeScannerModal({
  onClose,
  onDetected,
}: {
  onClose: () => void;
  onDetected: (code: string) => void;
}) {
  const [stage, setStage] = useState<Stage>("starting");
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const intervalRef = useRef<number | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function stopScanning() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function start() {
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
        detectorRef.current = new BarcodeDetector({ formats: [...BARCODE_FORMATS] });
        setStage("scanning");
      } catch {
        setError("Couldn't access the camera. Check camera permissions for this app.");
        setStage("error");
      }
    }
    start();

    return () => {
      cancelled = true;
      stopScanning();
      stopStream();
    };
  }, []);

  // Same fix as RecordExerciseModal's black-screen bug: the <video> only
  // mounts once stage flips to "scanning" (conditionally rendered below),
  // so attaching the stream has to happen after that render commits, not
  // inside the getUserMedia callback above where the ref is still null.
  useEffect(() => {
    if (stage === "scanning" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stage]);

  useEffect(() => {
    if (stage !== "scanning") return;

    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");

    intervalRef.current = window.setInterval(async () => {
      const video = videoRef.current;
      const detector = detectorRef.current;
      if (!video || !detector || !ctx || video.readyState < video.HAVE_CURRENT_DATA) return;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) {
          stopScanning();
          stopStream();
          onDetected(barcodes[0].rawValue);
        }
      } catch {
        // A single failed decode attempt on a blurry/transient frame isn't
        // an error state — just keep polling.
      }
    }, SCAN_INTERVAL_MS);

    return () => stopScanning();
  }, [stage, onDetected]);

  return (
    // Nests inside FoodSearchModal's own backdrop-click-to-close div —
    // stopPropagation here so closing the scanner doesn't also bubble up
    // and close the food-search modal underneath it.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-black" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-base font-medium text-white">Scan barcode</p>
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
          {stage === "scanning" && (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 rounded-xl border-2 border-white/70 py-10" />
              <p className="absolute inset-x-0 bottom-6 text-center text-sm text-white">
                Point the camera at a barcode
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
