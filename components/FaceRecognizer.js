"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import useLabels from "@/components/useLabels";
import { recordAttendance } from "@/services/attendanceService";
import { analytics } from "@/lib/firebaseConfig";
import { logEvent } from "firebase/analytics";
import { getAverageEAR } from "@/utils/livenessUtils";
import { syncAttendanceQueue } from "@/lib/syncService";

const MIN_CONFIDENCE_TO_RECORD = 60;
const EAR_THRESHOLD = 0.25;
const BLINK_COOLDOWN_MS = 300;
const PROCESSING_INTERVAL_MS = 100;

export default function FaceRecognizer({ authUser }) {
  // ── REFS: Track lifecycle and streams ──────────
  const isMounted = useRef(true);
  const activeStreamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const faceMatcherRef = useRef(null);
  const faceapiRef = useRef(null);
  const abortControllerRef = useRef(null);
  const modelWorkerRef = useRef(null);

  const animationFrameId = useRef(null);
  const lastDetectionTime = useRef(0);

  const blinkStateRef = useRef({
    isEyeClosed: false,
    blinkCount: 0,
    requiredBlinks: 2,
    lastBlinkTime: 0,
  });

  const {
    labels: fetchedLabels,
    loading: labelsLoading,
    error,
  } = useLabels(authUser);

  const [message, setMessage] = useState("Loading AI models...");
  const [finished, setFinished] = useState(false);
  const [detectedPerson, setDetectedPerson] = useState(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [confidence, setConfidence] = useState(0);
  const [attendanceState, setAttendanceState] = useState("idle");
  const [livenessState, setLivenessState] = useState("IDLE");
  const [blinkPrompt, setBlinkPrompt] = useState("");
  const [facingMode, setFacingMode] = useState("user");
  const [isOffline, setIsOffline] = useState(
    typeof window !== "undefined" ? !navigator.onLine : false
  );

  // ── HARD CLEANUP FUNCTION ──────────
  const stopAllMedia = useCallback(() => {
    isMounted.current = false;
    if (animationFrameId.current)
      cancelAnimationFrame(animationFrameId.current);
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return stopAllMedia;
  }, [stopAllMedia]);

  const MODEL_URL = "/models";
  const labels = fetchedLabels;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      if (!isMounted.current) return;
      setIsOffline(false);
      syncAttendanceQueue();
    };
    const handleOffline = () => {
      if (!isMounted.current) return;
      setIsOffline(true);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const buildFaceMatcher = async (signal) => {
    if (!labels || labels.length === 0) return;
    if (!isMounted.current || signal?.aborted) return;

    const faceapi = await import("face-api.js");
    faceapiRef.current = faceapi;

    const labeledFaceDescriptors = (
      await Promise.all(
        labels.map(async (student) => {
          try {
            if (!isMounted.current || signal?.aborted) return null;
            if (
              student.faceDescriptor &&
              Array.isArray(student.faceDescriptor) &&
              student.faceDescriptor.length > 0
            ) {
              return new faceapi.LabeledFaceDescriptors(student.name, [
                new Float32Array(student.faceDescriptor),
              ]);
            }
            if (!student.hasImage) return null;
            const imgUrl = `/api/images?id=${student._id}`;
            const img = await faceapi.fetchImage(imgUrl);
            if (!isMounted.current || signal?.aborted) return null;
            const detection = await faceapi
              .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (detection && isMounted.current && !signal?.aborted) {
              return new faceapi.LabeledFaceDescriptors(student.name, [
                detection.descriptor,
              ]);
            }
            return null;
          } catch (err) {
            console.error("Face descriptor error:", err);
            return null;
          }
        })
      )
    ).filter(Boolean);

    if (!isMounted.current || signal?.aborted) return;

    if (!labeledFaceDescriptors.length) {
      setMessage("No labeled faces found ❌");
      setFinished(true);
      return;
    }
    faceMatcherRef.current = new faceapi.FaceMatcher(
      labeledFaceDescriptors,
      0.6
    );
  };

  const processVideo = async (signal) => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !faceMatcherRef.current ||
      !isMounted.current ||
      signal?.aborted
    ) {
      return;
    }

    const faceapi = faceapiRef.current || (await import("face-api.js"));
    faceapiRef.current = faceapi;

    if (!isMounted.current || signal?.aborted) return;
    const video = videoRef.current;

    if (video.paused || video.ended || !video.videoWidth) {
      if (isMounted.current && !finished && !signal?.aborted) {
        animationFrameId.current = requestAnimationFrame(() =>
          processVideo(signal)
        );
      }
      return;
    }

    const now = Date.now();
    if (now - lastDetectionTime.current < PROCESSING_INTERVAL_MS) {
      if (isMounted.current && !finished && !signal?.aborted) {
        animationFrameId.current = requestAnimationFrame(() =>
          processVideo(signal)
        );
      }
      return;
    }
    lastDetectionTime.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = video.getBoundingClientRect();
    const displaySize = {
      width: rect.width || video.videoWidth || 720,
      height: rect.height || video.videoHeight || 500,
    };

    canvas.width = displaySize.width;
    canvas.height = displaySize.height;
    faceapi.matchDimensions(canvas, displaySize);

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!isMounted.current || signal?.aborted) return;

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (resizedDetections.length > 0 && ctx) {
      const face = resizedDetections[0];
      const bestMatch = faceMatcherRef.current.findBestMatch(face.descriptor);
      const label = bestMatch.label === "unknown" ? "Unknown" : bestMatch.label;
      const confidenceScore = Math.round((1 - bestMatch.distance) * 100);
      const box = face.detection.box;

      ctx.strokeStyle = label !== "Unknown" ? "#10b981" : "#ef4444";
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.fillStyle = label !== "Unknown" ? "#10b981" : "#ef4444";
      ctx.fillRect(box.x, box.y - 30, box.width, 30);
      ctx.fillStyle = "white";
      ctx.font = "16px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `${label} (${confidenceScore}%)`,
        box.x + box.width / 2,
        box.y - 8
      );

      setConfidence(confidenceScore);

      if (label !== "Unknown" && confidenceScore >= MIN_CONFIDENCE_TO_RECORD) {
        const person = labels.find((l) => l.name === label);
        setDetectedPerson(person || null);

        setLivenessState((prevState) => {
          if (prevState === "DETECTING_FACE" || prevState === "IDLE") {
            setMessage(`Recognized: ${label}. Checking liveness...`);
            setBlinkPrompt(
              `Please blink ${blinkStateRef.current.requiredBlinks} time(s) naturally.`
            );
            return "VERIFYING_LIVENESS";
          }
          if (prevState === "VERIFYING_LIVENESS") {
            const leftEye = face.landmarks.getLeftEye();
            const rightEye = face.landmarks.getRightEye();
            const ear = getAverageEAR(leftEye, rightEye);

            if (ear < EAR_THRESHOLD) {
              blinkStateRef.current.isEyeClosed = true;
            } else {
              if (blinkStateRef.current.isEyeClosed) {
                blinkStateRef.current.isEyeClosed = false;
                const blinkTime = Date.now();
                if (
                  blinkTime - blinkStateRef.current.lastBlinkTime >
                  BLINK_COOLDOWN_MS
                ) {
                  blinkStateRef.current.blinkCount += 1;
                  blinkStateRef.current.lastBlinkTime = blinkTime;
                  const remaining =
                    blinkStateRef.current.requiredBlinks -
                    blinkStateRef.current.blinkCount;
                  if (remaining > 0) {
                    setBlinkPrompt(`Blink detected! ${remaining} more to go.`);
                  } else {
                    setMessage("Liveness verified. Authentication successful!");
                    setBlinkPrompt("Success!");
                    setFinished(true);
                    return "AUTHENTICATED";
                  }
                }
              }
            }
          }
          return prevState;
        });
      } else {
        setDetectedPerson(null);
        if (livenessState !== "AUTHENTICATED") {
          setMessage("Face not recognized.");
          setLivenessState("DETECTING_FACE");
        }
      }
    } else {
      if (isMounted.current && !signal?.aborted) {
        if (livenessState !== "AUTHENTICATED") {
          setMessage("No face detected");
          setLivenessState("DETECTING_FACE");
        }
        setDetectedPerson(null);
        setConfidence(0);
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    if (isMounted.current && !finished && !signal?.aborted) {
      if (livenessState !== "AUTHENTICATED") {
        animationFrameId.current = requestAnimationFrame(() =>
          processVideo(signal)
        );
      }
    }
  };

  const startVideo = async (signal) => {
    try {
      setMessage("Requesting camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
      });

      if (!isMounted.current || signal.aborted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      activeStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (!isMounted.current || signal.aborted) return;
          videoRef.current
            .play()
            .catch((e) => console.warn("Play interrupted", e));
          setIsLoading(false);
          setMessage("Building face models...");

          buildFaceMatcher(signal).then(() => {
            if (!isMounted.current || signal.aborted) return;
            setMessage("Looking for faces...");
            setLivenessState("DETECTING_FACE");
            setModelsReady(true);
            blinkStateRef.current.requiredBlinks =
              Math.floor(Math.random() * 2) + 1;
            processVideo(signal);
          });
        };
      }
    } catch (err) {
      if (!isMounted.current || signal.aborted) return;
      setIsLoading(false);
      if (err.name === "NotAllowedError") {
        setMessage(
          "Camera access denied. Please enable camera permissions in browser settings."
        );
      } else {
        setMessage("Cannot access webcam ❌");
      }
      setFinished(true);
    }
  };

  const handleRetry = async () => {
    isSubmittingRef.current = false;
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setFinished(false);
    setAttendanceState("idle");
    setLivenessState("IDLE");
    startVideo(signal);
  };

  const handleCameraToggle = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  useEffect(() => {
    if (labelsLoading || error || !labels || labels.length === 0) return;

    const localAbortController = new AbortController();
    abortControllerRef.current = localAbortController;
    const signal = localAbortController.signal;

    const loadModels = async () => {
      try {
        setMessage("Loading AI models...");
        setIsLoading(true);

        const faceapi = await import("face-api.js");
        faceapiRef.current = faceapi;
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        if (signal.aborted) return;
        startVideo(signal);
      } catch (err) {
        if (signal.aborted) return;
        setMessage("Failed to load models.");
        setIsLoading(false);
        setFinished(true);
      }
    };

    loadModels();

    return () => {
      localAbortController.abort();
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((t) => t.stop());
        activeStreamRef.current = null;
      }
    };
  }, [labelsLoading, error, labels, facingMode]);

  useEffect(() => {
    if (analytics) {
      try {
        logEvent(analytics, "page_view", { page: "attendance" });
      } catch (err) {
        console.warn("Analytics blocked:", err);
      }
    }
  }, []);

  useEffect(() => {
    const persistAttendance = async () => {
      if (
        !finished ||
        !detectedPerson ||
        !authUser?.uid ||
        livenessState !== "AUTHENTICATED"
      )
        return;
      if (isSubmittingRef.current) return;

      const detectedEmail = detectedPerson.email?.trim().toLowerCase();
      const userEmail = authUser.email?.trim().toLowerCase();
      if (detectedEmail && userEmail && detectedEmail !== userEmail) {
        setAttendanceState("mismatch");
        setMessage("Face does not match signed-in account.");
        return;
      }

      isSubmittingRef.current = true;
      setAttendanceState("saving");
      try {
        const result = await recordAttendance({
          userId: authUser.uid,
          studentName: detectedPerson.name,
          email: detectedPerson.email || authUser.email,
          confidenceScore: confidence,
        });
        if (result.queuedOffline) {
          setAttendanceState("queued-offline");
          setMessage("Attendance cached offline. ✅");
        } else {
          setAttendanceState(
            result.alreadyRecorded ? "already-recorded" : "saved"
          );
        }
      } catch (err) {
        setAttendanceState("error");
        setMessage(err.message || "Could not save attendance.");
      }
    };
    persistAttendance();
  }, [authUser, confidence, detectedPerson, finished, livenessState]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4 relative">
      {isOffline && (
        <div className="w-full max-w-4xl mb-4 bg-amber-500/10 backdrop-blur-md border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between relative z-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">📡</span>
            <div className="text-left">
              <h4 className="font-bold text-amber-400 text-sm">
                Offline Mode Active
              </h4>
              <p className="text-xs text-gray-300">
                Scans will be saved locally and synced later.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl border border-white/10 backdrop-blur-xl bg-white/5">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover relative z-10"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-20 object-cover"
        />

        {livenessState === "VERIFYING_LIVENESS" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-72 h-72 border-4 border-dashed border-blue-400 rounded-full animate-[spin_4s_linear_infinite]" />
              <p className="text-xl font-bold text-blue-300 animate-pulse text-center px-6 relative z-40">
                {blinkPrompt}
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 backdrop-blur-sm z-40 gap-6 px-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-white font-medium text-sm text-center">
                {message}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl mt-8 relative z-10">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 text-center">
          <p className="text-white font-semibold text-lg">{message}</p>
          {confidence > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-300">
                <span>Confidence Level</span>
                <span className="font-bold text-purple-400">{confidence}%</span>
              </div>
              <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700"
                  style={{ width: `${confidence}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleCameraToggle}
        className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
      >
        {facingMode === "user"
          ? "Switch to Rear Camera"
          : "Switch to Front Camera"}
      </button>

      {finished && (
        <Button
          onClick={handleRetry}
          className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-10 py-6 rounded-xl shadow-2xl"
        >
          Scan Again
        </Button>
      )}
    </div>
  );
}
