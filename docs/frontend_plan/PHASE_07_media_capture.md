# Frontend Phase 7 — Media Capture and Voice Input

**What this covers:** the MediaRecorder wrapper — the most technically involved code in the frontend.
**Files:** `src/hooks/useVideoRecording.ts` (387 lines), `src/utils/videoFormatSupport.ts`, `src/components/chat-interview/ChatInput.tsx`
**You need to know:** `getUserMedia`, MediaRecorder, codecs, Blobs

---

## What the hook does

`useVideoRecording()` returns state (`isRecording`, `isPaused`, `recordingTime`, `error`) and controls (`startRecording`, `stopRecording`, `pauseRecording`, `resumeRecording`, `onAudioChunk`).

The genuinely clever part is that it runs **two MediaRecorders on one stream simultaneously**: one recording video+audio for playback, one recording audio-only for live transcription.

---

## Permission pre-flight

```ts
const audioTest = await navigator.mediaDevices.getUserMedia({ audio: true });
audioTest.getTracks().forEach(t => t.stop());
// …then request the real video+audio stream
```

Requesting audio alone first, then immediately stopping it, surfaces the microphone permission prompt separately. Requesting camera and mic together and having one denied produces a confusing partial failure; this way you know which permission failed.

---

## Constraints

```ts
{
  video: {
    width:     { ideal: 1920, max: 3840 },
    height:    { ideal: 1080, max: 2160 },
    frameRate: { ideal: 30,   max: 60   },
    facingMode: "user",
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl:  true,
    sampleRate: 48000,
    channelCount: 2,
  },
}
```

`ideal` is a preference the browser tries to satisfy; `max` is a hard ceiling. Using `exact` instead would throw `OverconstrainedError` on devices that can't comply — `ideal` degrades gracefully, which is almost always what you want.

The three audio flags are what make a laptop mic usable in a room: `echoCancellation` stops speaker feedback, `noiseSuppression` cuts steady background noise, `autoGainControl` normalizes volume.

There is also a defensive re-request:

```ts
if (stream.getAudioTracks().length === 0) {
  // some devices silently return video-only — retry with plain `audio: true`
}
```

Constraints can be *satisfied* by returning nothing. Verifying you actually got an audio track is the kind of check you only write after being burned.

---

## Codec negotiation

`videoFormatSupport.ts` probes what the browser can actually record:

```ts
MediaRecorder.isTypeSupported("video/mp4;codecs=h264,aac")
MediaRecorder.isTypeSupported("video/mp4")
MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
MediaRecorder.isTypeSupported("video/webm")
```

Returns `{ mp4, webm, preferredFormat, fallbackFormat }`; `getBestRecordingFormat()` is what the hook consumes.

**MP4 is preferred over WebM** — Safari historically couldn't record or play WebM, and MP4 is more universally accepted downstream. Chrome and Firefox prefer WebM, so the cascade matters. Passing an unsupported `mimeType` to the MediaRecorder constructor throws, so probing is mandatory rather than optional.

---

## The dual-recorder pattern

```ts
// 1. Video + audio, for playback
const recorder = new MediaRecorder(stream, {
  mimeType: getBestRecordingFormat(),
  videoBitsPerSecond: 2_000_000,
  audioBitsPerSecond: 128_000,
});
recorder.start(1000);                     // emit a chunk every second

// 2. Audio only, for transcription — same stream, separate recorder
const audioStream = new MediaStream(stream.getAudioTracks());
const audioRecorder = new MediaRecorder(audioStream, { mimeType: "audio/webm;codecs=opus" });
audioRecorder.ondataavailable = (e) => {
  audioChunksRef.current.push(e.data);
  audioChunkSubscribersRef.current.forEach(cb => cb(e.data));   // fan-out
};
audioRecorder.start(1000);
```

`new MediaStream(stream.getAudioTracks())` builds a second stream that **shares the same underlying tracks** — no extra device access, no second permission prompt. Two recorders, two independent outputs, one camera.

**`start(1000)`** is what makes this incremental: without a timeslice argument, MediaRecorder emits one giant blob at the end. With it, `ondataavailable` fires every second, which is what enables transcription while the user is still speaking.

The subscriber fan-out is a small pub/sub:

```ts
const onAudioChunk = useCallback((cb: (chunk: Blob) => void) => {
  audioChunkSubscribersRef.current.push(cb);
  return () => {                                     // unsubscribe
    audioChunkSubscribersRef.current =
      audioChunkSubscribersRef.current.filter(s => s !== cb);
  };
}, []);
```

Returning the unsubscribe function is the standard contract — it lets the consumer clean up without the hook tracking who subscribed.

The audio recorder is wrapped in `try/catch`: if it fails, video recording continues and only transcription degrades.

---

## ⚠️ Two React anti-patterns worth knowing

**1. Resolving a promise from inside a `setState` updater.**

`stopRecording()` returns `Promise<Blob | null>` and resolves from within a state updater, reassigning `onstop` to read the freshest chunks. It works, but state updaters must be pure — React may call them twice (exactly what StrictMode would expose, and StrictMode is disabled here — Phase 3). A ref holding the chunks would be the clean fix.

Toasts are also deferred with `setTimeout(..., 0)` to avoid firing during render — a symptom of the same problem.

**2. Stashing a callback on `window`.**

```tsx
// ChatInput.tsx
(window as any).__dgFinalize = async () => {
  try { return await session.finalize(); }
  finally { unsubscribe(); }
};
// …later
const transcript = await (window as any).__dgFinalize();
delete (window as any).__dgFinalize;
```

A global to pass a function between two handlers in the same component. A `useRef` is the direct replacement. As written, two `ChatInput` instances would clobber each other, and the global leaks if the component unmounts mid-recording.

---

## The voice input flow

```
user taps mic
  └── startRecording()                       ← both recorders start
  └── deepgramTranscriptionService.createStreamingSession()
  └── onAudioChunk(chunk => session.pushChunk(chunk))

user taps stop
  └── stopRecording()
  └── await __dgFinalize()                   → POST /api/speech/transcribe
  └── append transcript into the textarea    ← user can edit before sending
```

Putting the transcript **into the textarea rather than sending it** is the right UX call: transcription is imperfect, and letting the user fix it before submitting avoids a wrong answer being scored.

⚠️ **The service is misnamed twice.** There is no Deepgram — the backend uses AWS Transcribe. And `createStreamingSession()` does not stream: `pushChunk` buffers blobs into an array and `finalize()` concatenates them into one blob and POSTs it once. The chunked plumbing exists; real streaming does not.

The textarea auto-resizes by resetting `style.height = "60px"` then setting `Math.min(scrollHeight, 200)` — reset first, or it can only ever grow.

---

## ⚠️ Nothing records the interview

The hook is 387 lines of well-built video recording, and **video is never captured for an interview**. `ChatInterviewSession` runs its own `getUserMedia` for the preview (Phase 6), and the hook is used only by `ChatInput` for microphone capture.

The video path — `stopRecording()` → `Blob` → upload → playback — is fully built and never invoked. `SessionReview.tsx` (Phase 8) renders a video player against mock data with a placeholder URL.

Two coherent choices: wire it up (record the session, upload the blob, play it back in review), or delete the video half and keep audio capture. The current middle state is ~300 lines of dead capability.

---

## 🧠 Check your understanding

1. Why request audio permission separately before video?
2. What is the difference between `ideal` and `exact` constraints, and why does `ideal` win here?
3. Why probe codecs instead of hardcoding a mimeType?
4. Why is MP4 preferred over WebM despite better browser support for WebM?
5. How can two MediaRecorders share one camera without a second permission prompt?
6. What does `start(1000)` change, and why is it essential for transcription?
7. Why is resolving a promise inside a `setState` updater risky?
8. Why put the transcript in the textarea instead of sending it directly?

---

**Next:** [Phase 8 — Results, charts & known gaps](PHASE_08_results_and_gaps.md)
