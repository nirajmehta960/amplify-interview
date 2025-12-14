import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  getBestRecordingFormat,
  getFormatDisplayName,
} from "@/utils/videoFormatSupport";

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
  getAudioBlob: () => Blob | null;
  onAudioChunk: (cb: (chunk: Blob) => void) => () => void;
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
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioChunkSubscribersRef = useRef<Array<(chunk: Blob) => void>>([]);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      // First, check if we have audio permissions
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioStream.getTracks().forEach((track) => track.stop());
      } catch (audioError) {
        console.error("Audio permission denied:", audioError);
        toast({
          title: "Audio Permission Required",
          description: "Please allow microphone access to record audio",
          variant: "destructive",
        });
        return;
      }

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

      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();

      if (audioTracks.length === 0) {
        console.warn("No audio tracks found in stream! Trying fallback...");

        // Try fallback with basic audio settings
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1920, max: 3840 },
              height: { ideal: 1080, max: 2160 },
              frameRate: { ideal: 30, max: 60 },
              facingMode: "user",
            },
            audio: true, // Basic audio without constraints
          });

          if (fallbackStream.getAudioTracks().length > 0) {
            // Stop the original stream and use the fallback
            stream.getTracks().forEach((track) => track.stop());
            streamRef.current = fallbackStream;
          }
        } catch (fallbackError) {
          console.error("Fallback audio also failed:", fallbackError);
        }
      }

      // Get the best supported format for this browser
      const mimeType = getBestRecordingFormat();

      // Create MediaRecorder with optimized settings for reliable uploads
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2000000, // 2Mbps for reliable uploads
        audioBitsPerSecond: 128000, // 128kbps for good quality audio
      });

      // Verify MediaRecorder supports audio
      if (mediaRecorder.mimeType && !mediaRecorder.mimeType.includes("opus")) {
        console.warn(
          "MediaRecorder MIME type doesn't include audio codec:",
          mediaRecorder.mimeType
        );
      }

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setState((prev) => ({
            ...prev,
            recordedChunks: [...prev.recordedChunks, event.data],
          }));
        }
      };

      mediaRecorder.onstart = () => {
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
        setState((prev) => ({
          ...prev,
          isRecording: false,
        }));

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Stop audio-only recorder
        if (
          audioRecorderRef.current &&
          audioRecorderRef.current.state !== "inactive"
        ) {
          try {
            audioRecorderRef.current.stop();
          } catch {}
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

      // Start parallel audio-only recorder for background transcription
      try {
        const audioOnlyStream = new MediaStream(stream.getAudioTracks());
        const audioMime = MediaRecorder.isTypeSupported(
          "audio/webm;codecs=opus"
        )
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";
        const audioRecorder = new MediaRecorder(audioOnlyStream, {
          mimeType: audioMime,
          audioBitsPerSecond: 128000,
        });
        audioRecorderRef.current = audioRecorder;
        audioChunksRef.current = [];
        audioRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
            audioChunkSubscribersRef.current.forEach((cb) => cb(e.data));
          }
        };
        audioRecorder.start(1000);
      } catch (audioRecError) {
        console.warn(
          "Audio-only recorder failed, continuing without it",
          audioRecError
        );
      }

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

      // Create a local variable to capture chunks
      let finalChunks: Blob[] = [];

      mediaRecorderRef.current.onstop = () => {
        // Get the latest chunks from state
        setState((prev) => {
          finalChunks = [...prev.recordedChunks];

          if (finalChunks.length === 0) {
            console.warn("No recorded chunks available");
            resolve(null);
            return prev;
          }

          // Determine the correct MIME type based on what was used
          let mimeType = "video/webm";
          if (mediaRecorderRef.current?.mimeType) {
            mimeType = mediaRecorderRef.current.mimeType;
          }

          const blob = new Blob(finalChunks, { type: mimeType });

          // Check if the blob contains audio by creating a video element
          const video = document.createElement("video");
          video.src = URL.createObjectURL(blob);
          video.onloadedmetadata = () => {
            URL.revokeObjectURL(video.src);
          };

          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // Use setTimeout to avoid calling toast during render
          setTimeout(() => {
            toast({
              title: "Recording Stopped",
              description: `Video recording saved (${(
                blob.size /
                1024 /
                1024
              ).toFixed(1)}MB)`,
            });
          }, 0);

          resolve(blob);

          return {
            ...prev,
            isRecording: false,
            isPaused: false,
            stream: null,
          };
        });
      };

      mediaRecorderRef.current.stop();
    });
  }, [toast]);

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

  const getAudioBlob = useCallback((): Blob | null => {
    if (audioChunksRef.current.length > 0) {
      const type = audioRecorderRef.current?.mimeType || "audio/webm";
      return new Blob(audioChunksRef.current, { type });
    }
    return null;
  }, []);

  const onAudioChunk = useCallback((cb: (chunk: Blob) => void) => {
    audioChunkSubscribersRef.current.push(cb);
    return () => {
      audioChunkSubscribersRef.current =
        audioChunkSubscribersRef.current.filter((fn) => fn !== cb);
    };
  }, []);

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
    getAudioBlob,
    onAudioChunk,
  };
};
