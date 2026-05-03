import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
} as const;

const requiredFirebaseEnvKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const missingFirebaseEnvKeys = requiredFirebaseEnvKeys.filter(
  (k) => !import.meta.env[k],
);

if (missingFirebaseEnvKeys.length) {
  throw new Error(
    [
      "Missing required Firebase env vars.",
      "",
      `Add these to your root \`.env.local\` (recommended) or \`.env\`:`,
      ...missingFirebaseEnvKeys.map((k) => `- ${k}`),
      "",
      "You can copy the template from `.env.example`.",
    ].join("\n"),
  );
}

// Avoid re-initializing when hot-reloaded in dev
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export default app;
