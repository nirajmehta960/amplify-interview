import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface VideoRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  recordedChunks: Blob[];
  recordingTime: number;
  stream: MediaStream | null;
}

interface VideoRecordingControls {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  getRecordingUrl: () => string | null;
  clearRecording: () => void;
}

export const useVideoRecording = (): VideoRecordingState &
  VideoRecordingControls => {
  const [state, setState] = useState<VideoRecordingState>({
    isRecording: false,
    isPaused: false,
    recordedChunks: [],
    recordingTime: 0,
    stream: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      // Request camera and microphone access with high-quality settings for MacBooks
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, max: 3840 }, // Support up to 4K for MacBooks
          height: { ideal: 1080, max: 2160 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // Higher quality audio
          channelCount: 2, // Stereo
        },
      });

      streamRef.current = stream;

      // Check for supported MIME types and choose the best one
      let mimeType = "video/webm;codecs=vp9,opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm;codecs=vp8,opus";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/mp4";
      }

      console.log("Using MIME type:", mimeType);

      // Create MediaRecorder with optimized settings for reliable uploads
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2000000, // 2Mbps for reliable uploads
        audioBitsPerSecond: 128000, // 128kbps for good quality audio
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        console.log("Data available:", event.data.size, "bytes");
        if (event.data.size > 0) {
          setState((prev) => ({
            ...prev,
            recordedChunks: [...prev.recordedChunks, event.data],
          }));
        }
      };

      mediaRecorder.onstart = () => {
        console.log("MediaRecorder started");
        setState((prev) => ({
          ...prev,
          isRecording: true,
          isPaused: false,
          stream,
          recordedChunks: [], // Clear previous chunks
        }));

        // Start timer
        intervalRef.current = setInterval(() => {
          setState((prev) => ({
            ...prev,
            recordingTime: prev.recordingTime + 1,
          }));
        }, 1000);
      };

      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped");
        setState((prev) => ({
          ...prev,
          isRecording: false,
        }));

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };

      mediaRecorder.onpause = () => {
        setState((prev) => ({ ...prev, isPaused: true }));
      };

      mediaRecorder.onresume = () => {
        setState((prev) => ({ ...prev, isPaused: false }));
      };

      // Start recording with timeslice for better performance
      mediaRecorder.start(1000);

      toast({
        title: "Recording Started",
        description: "Video recording has begun",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description:
          "Unable to start recording. Please check camera and microphone permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        console.warn("No media recorder available to stop");
        resolve(null);
        return;
      }

      console.log("Stopping recording...");

      // Store the current chunks before stopping
      const currentChunks = state.recordedChunks;

      mediaRecorderRef.current.onstop = () => {
        console.log(
          "MediaRecorder stopped, final chunks:",
          currentChunks.length
        );

        if (currentChunks.length === 0) {
          console.warn("No recorded chunks available");
          resolve(null);
          return;
        }

        // Determine the correct MIME type based on what was used
        let mimeType = "video/webm";
        if (mediaRecorderRef.current?.mimeType) {
          mimeType = mediaRecorderRef.current.mimeType;
        }

        const blob = new Blob(currentChunks, { type: mimeType });
        console.log("Created video blob:", blob.size, "bytes");

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          stream: null,
        }));

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        toast({
          title: "Recording Stopped",
          description: `Video recording saved (${(
            blob.size /
            1024 /
            1024
          ).toFixed(1)}MB)`,
        });

        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, [state.recordedChunks, toast]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      toast({
        title: "Recording Paused",
        description: "Recording has been paused",
      });
    }
  }, [state.isRecording, state.isPaused, toast]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      toast({
        title: "Recording Resumed",
        description: "Recording has been resumed",
      });
    }
  }, [state.isRecording, state.isPaused, toast]);

  const getRecordingUrl = useCallback((): string | null => {
    if (state.recordedChunks.length > 0) {
      const blob = new Blob(state.recordedChunks, { type: "video/webm" });
      return URL.createObjectURL(blob);
    }
    return null;
  }, [state.recordedChunks]);

  const clearRecording = useCallback(() => {
    setState({
      isRecording: false,
      isPaused: false,
      recordedChunks: [],
      recordingTime: 0,
      stream: null,
    });

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    mediaRecorderRef.current = null;
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getRecordingUrl,
    clearRecording,
  };
};
