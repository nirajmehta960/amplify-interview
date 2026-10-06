# Frontend Phase 6 — The Interview Chat UI

**What this covers:** the real-time chat that is the core of the product — state, optimistic updates, auto-scroll, and animation.
**Files:** `src/pages/ChatInterviewSession.tsx`, `src/components/chat-interview/{ChatBubble,ChatInput,ProgressSidebar,TypingIndicator}.tsx`
**You need to know:** React state, refs, `AnimatePresence`, optimistic UI

---

## State: deliberately plain

```tsx
const [sessionId, setSessionId]     = useState<string | null>(null);
const [messages, setMessages]       = useState<ChatMessage[]>([]);
const [progress, setProgress]       = useState<SessionProgress | null>(null);
const [isProcessing, setIsProcessing] = useState(false);
const [cameraOn, setCameraOn]       = useState(false);
const [videoError, setVideoError]   = useState<string | null>(null);

const videoRef       = useRef<HTMLVideoElement>(null);
const streamRef      = useRef<MediaStream | null>(null);
const messagesEndRef = useRef<HTMLDivElement>(null);
```

Six `useState` values and three refs — no reducer, no context, no store. For a page with one linear flow, that is the right amount of machinery. A `useReducer` would be justified if transitions got more complex, but they haven't.

The ref/state split is the standard rule: **refs for things that shouldn't trigger a re-render** (the media stream, the scroll sentinel), state for things the UI reflects.

---

## Config handoff between pages

```tsx
const config = location.state?.config
            || JSON.parse(sessionStorage.getItem("interviewConfig") || "{}")?.config;

if (!config) {
  toast({ title: "No interview configuration found", variant: "destructive" });
  navigate("/interview/setup");
  return;
}
```

`InterviewSetup` passes config through router state, with a `sessionStorage` fallback. Router state alone is lost on refresh; `sessionStorage` survives it and clears when the tab closes — the right storage for something this short-lived.

⚠️ **The session ID is not in the URL.** `/interview/session` takes no parameter, so a refresh **mid-interview creates a brand-new session** — the previous one is orphaned in-progress and the user starts over. Making the route `/interview/session/:sessionId` and redirecting to it after creation would fix this. It is the most user-visible bug in the app.

---

## The message flow: optimistic updates

```tsx
const handleSendMessage = async (content: string, durationSeconds?: number) => {
  // 1. Show the user's message immediately
  const optimistic: ChatMessage = { role: "candidate", content, timestamp: new Date().toISOString() };
  setMessages(prev => [...prev, optimistic]);
  setIsProcessing(true);

  try {
    const res = await interviewApi.sendMessage(sessionId, content, durationSeconds);

    // 2. Replace the optimistic entry with the server's analyzed pair
    setMessages(prev => [...prev.slice(0, -1), res.candidate_message, res.interviewer_message]);
    setProgress(res.session_progress);

    if (res.session_progress.is_complete) {
      setTimeout(() => navigate(`/results/${sessionId}`), 3000);
    }
  } catch (err) {
    // 3. Roll back
    setMessages(prev => prev.slice(0, -1));
    toast({ title: "Failed to send", description: err.message, variant: "destructive" });
  } finally {
    setIsProcessing(false);
  }
};
```

**Why optimistic matters here:** the backend makes 1–3 LLM calls per turn, so a response can take 5–15 seconds. Waiting to render the user's own message would feel broken.

**Why the server's version replaces it:** the returned `candidate_message` carries the `analysis` object — seven scores plus feedback — that the optimistic entry cannot have. `slice(0, -1)` drops the placeholder and appends both real messages.

`slice(0, -1)` assumes the optimistic message is still last. That holds because `isProcessing` disables the input, so no second send can interleave. Worth noting as a real coupling: if concurrent sends were ever allowed, this would corrupt the list, and matching on a temporary ID would be the fix.

The rollback path is what makes optimistic UI honest — without it, a failed send leaves a message on screen that the server never received.

---

## Auto-scroll

```tsx
<div className="overflow-y-auto scroll-smooth">
  {messages.map(...)}
  {isProcessing && <TypingIndicator key="typing" />}
  <div ref={messagesEndRef} />          {/* sentinel */}
</div>
```
```tsx
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages, isProcessing]);
```

The **empty sentinel div** is the standard trick — scrolling an element into view is far more reliable than computing `scrollTop = scrollHeight`, which fights with dynamic content height and images that load late.

Including `isProcessing` in the deps means the typing indicator also scrolls into view, so the user sees that something is happening.

---

## Animation

```tsx
<AnimatePresence initial={false}>
  {messages.map(msg => <ChatBubble key={msg.message_id} message={msg} />)}
  {isProcessing && <TypingIndicator key="typing" />}
</AnimatePresence>
```

**`initial={false}`** suppresses entry animations on first mount, so restoring a transcript doesn't replay every message animating in — only genuinely new messages animate.

The typing indicator lives **inside** `AnimatePresence` with a stable `key`, so it animates in and out like a message rather than popping.

```tsx
// TypingIndicator.tsx
{[0, 1, 2].map(i => (
  <motion.span key={i}
    animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
))}
```

Keyframe arrays plus a per-dot `delay` produce the classic wave. `repeat: Infinity` needs no cleanup — framer-motion stops it on unmount.

---

## ChatBubble and inline analysis

Role-based layout (interviewer left, candidate right) plus an `InlineAnalysis` sub-component: a collapsible pill showing `{score}/100` and the first sentence of feedback, expandable to the full breakdown, with local `expanded` state.

Score colours use threshold helpers — ≥80 emerald, ≥60 cyan, ≥40 amber, else rose.

⚠️ **Those helpers are duplicated verbatim in `ProgressSidebar.tsx`.** Two copies of the same thresholds will drift; they belong in `@/lib/utils`.

---

## ProgressSidebar

Pure presentation — it takes `progress` plus `lastAnalysis` and renders. The parent derives the latter:

```tsx
const lastAnalysis = [...messages].reverse().find(m => m.role === "candidate" && m.analysis);
```

Note `[...messages]` — `reverse()` mutates in place, so copying first avoids corrupting the messages array. A classic and easily-missed bug.

Keeping the sidebar presentational (no fetching, no derivation) makes it trivially testable.

---

## Camera preview

```tsx
useEffect(() => {
  if (!cameraOn) return;
  let cancelled = false;
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    })
    .catch(err => setVideoError(err.message));

  return () => {
    cancelled = true;
    streamRef.current?.getTracks().forEach(t => t.stop());
  };
}, [cameraOn]);
```

**Stopping every track in cleanup is mandatory.** Skip it and the camera light stays on after navigation — the most visible resource leak a web app can have.

⚠️ **This preview is entirely separate from `useVideoRecording`** (Phase 7). It calls `getUserMedia` itself and only displays the feed. **Nothing records the interview video.** The recording hook is fully built and used only for voice input.

---

## 🧠 Check your understanding

1. Why optimistic updates here specifically?
2. Why replace the optimistic message with the server's version instead of keeping it?
3. What assumption does `slice(0, -1)` make, and what enforces it?
4. Why is a sentinel div better than setting `scrollTop`?
5. What does `initial={false}` prevent?
6. Why `[...messages].reverse()` rather than `messages.reverse()`?
7. What happens if media tracks aren't stopped on cleanup?
8. What breaks when a user refreshes mid-interview, and how would you fix it?

---

## ⚠️ Issues in this layer

| Issue | Impact |
|---|---|
| Session ID not in the URL | Refresh mid-interview starts a new session and orphans the old one |
| No interview video recorded | Camera preview only; the recording hook is used solely for voice |
| Score-colour helpers duplicated | `ChatBubble.tsx` and `ProgressSidebar.tsx` will drift |
| Hardcoded 3s completion delay | Not cancellable if the user navigates away first |

---

**Next:** [Phase 7 — Media capture & voice](PHASE_07_media_capture.md)
