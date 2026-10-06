# Frontend Phase 4 — Authentication

**What this covers:** talking to AWS Cognito directly over `fetch`, token storage, and form validation with Zod.
**Files:** `src/contexts/AuthContext.tsx`, `src/pages/{SignIn,SignUp,ForgotPassword,ResetPassword}.tsx`
**You need to know:** React context, JWTs in the browser, Cognito's IDP API

---

## No Amplify SDK — raw fetch to the Cognito API

Cognito's IDP API is plain JSON over HTTPS. This app calls it directly:

```ts
const cognitoRequest = async (action: string, body: object) => {
  const res = await fetch(`https://cognito-idp.${REGION}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify(body),
  });
  ...
};
```

Actions used: `InitiateAuth`, `SignUp`, `ConfirmSignUp`, `ForgotPassword`, `ConfirmForgotPassword`, `GlobalSignOut`.

**Why this is reasonable:** `aws-amplify` is a very large dependency, and this app needs six calls. The unusual headers are the whole trick — `Content-Type: application/x-amz-json-1.1` and `X-Amz-Target: <Service>.<Action>` are how AWS's JSON protocol dispatches. There is no request signing because these are unauthenticated public-client endpoints.

**What you give up:** automatic token refresh, Hosted UI / social login, and device tracking. The refresh gap is the one that matters (below).

---

## Mock mode

```ts
const isMockMode = !import.meta.env.VITE_AWS_COGNITO_CLIENT_ID;
```

With no client ID configured, every auth function short-circuits: any credentials succeed, a fake user is fabricated, and `localStorage` gets the literal token `"mock-user-token"` — which the backend accepts while `ENVIRONMENT=development` (backend Phase 3).

This is a genuinely useful pattern for UI work without infrastructure. The risk is the mirror image of the backend's: it keys off the *absence* of config, so a production build that fails to inline `VITE_AWS_COGNITO_CLIENT_ID` **silently ships an app where any password works**. Since Vite inlines at build time, a missing variable in CI produces exactly that.

A safer design fails closed — refuse to render rather than fall back to mock — or gates on an explicit `VITE_USE_MOCK_AUTH=true`.

---

## Token storage

```ts
localStorage.setItem("amplify_id_token", IdToken);
localStorage.setItem("amplify_access_token", AccessToken);
localStorage.setItem("amplify_refresh_token", RefreshToken);
```

`localStorage` is readable by any JavaScript on the origin, so an XSS bug means token theft. The alternative — `httpOnly` cookies — is immune to that but requires a same-origin backend or careful CORS credentials, and doesn't fit a CloudFront-plus-separate-API-domain deployment.

Given a SPA on `app.domain.com` calling `api.domain.com`, `localStorage` is the pragmatic choice. The real mitigation is not shipping XSS: no `dangerouslySetInnerHTML` with user content, and a strict CSP.

On mount, the user is restored by **decoding the JWT client-side**:

```ts
const payload = JSON.parse(atob(token.split(".")[1]));
setUser({ uid: payload.sub, email: payload.email, name: payload.name });
```

This is safe *for display purposes only* — the payload is base64, not encrypted, and trivially forgeable. It is fine to render a name from it; it must never be trusted for authorization. The backend verifies the signature on every request, which is where the real check lives.

---

## ⚠️ No refresh flow

The refresh token is stored and **never used**. Cognito ID tokens expire after one hour, so a user working for more than an hour starts getting 401s until they manually sign in again.

The fix is a response interceptor in `apiClient.ts`: on 401, call `InitiateAuth` with `AuthFlow: "REFRESH_TOKEN_AUTH"`, store the new tokens, retry the original request once. It needs a single-flight guard so ten concurrent 401s trigger one refresh, not ten.

This is the most impactful missing piece in the frontend.

---

## ⚠️ Google sign-in is not implemented

```ts
const signInWithGoogle = async () => {
  alert("Google Sign-In requires Cognito Hosted UI configuration");
  // …falls through to a mock login
};
```

The button exists in the UI. Making it real requires a Cognito Hosted UI domain, a Google identity provider in the pool, and the OAuth redirect flow — which is genuinely more work than the six direct API calls, and is the main reason to reconsider the Amplify SDK.

---

## Zod without a form library

`react-hook-form` and `@hookform/resolvers` are dependencies with **zero usages**. Validation is imperative:

```tsx
const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  try {
    const validated = signInSchema.parse({ email, password });
    await signIn(validated.email, validated.password);
    navigate("/dashboard");
  } catch (error) {
    if (error instanceof z.ZodError) {
      toast({ title: "Validation error",
              description: error.errors[0].message, variant: "destructive" });
    } else {
      toast({ title: "Sign in failed", description: error.message,
              variant: "destructive" });
    }
  }
};
```

Controlled `useState` per field, `schema.parse()` on submit (which throws), and an `instanceof z.ZodError` branch.

It works, but note what it costs: **only the first error is surfaced**, via a toast rather than inline next to the offending field; there is no validation until submit; and no touched/dirty state. `useForm({ resolver: zodResolver(schema) })` with the shadcn `<FormField>` components — all already installed — would give per-field inline errors for less code.

The schemas themselves are good practice: shared shape definitions, meaningful messages, and inferred types via `z.infer`.

---

## The context surface

```ts
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn(email, password): Promise<void>;
  signUp(email, password, name): Promise<void>;
  signInWithGoogle(): Promise<void>;      // not implemented
  signOut(): Promise<void>;
  resetPassword(email): Promise<void>;
  confirmResetPassword(email, code, newPassword): Promise<void>;
}
```

`loading` starts `true` and flips after the mount-time token check — that is what `ProtectedRoute` uses to avoid flashing the sign-in page (Phase 3).

Sign-up also fires a one-time welcome email via `emailService`, guarded by a `localStorage` flag so a re-render can't send duplicates.

---

## 🧠 Check your understanding

1. What do the `X-Amz-Target` and `Content-Type` headers do, and why is no signing needed?
2. Why is decoding the JWT client-side safe for display but never for authorization?
3. What is the concrete risk of `localStorage` token storage, and what actually mitigates it?
4. Why is mock-mode-on-missing-config dangerous in a production build?
5. What breaks after one hour of continuous use, and what fixes it?
6. What does the imperative Zod approach cost compared with `zodResolver`?
7. Why does `loading` need to start as `true`?

---

## ⚠️ Summary of gaps

| Gap | Impact |
|---|---|
| No token refresh | 401s after 1 hour of use |
| `signInWithGoogle` unimplemented | The button alerts and mock-logs-in |
| Mock mode triggered by missing config | A build without the client ID accepts any password |
| `react-hook-form` unused | More code, worse validation UX |
| Only the first Zod error shown | Users fix errors one at a time |

---

**Next:** [Phase 5 — The API client](PHASE_05_api_client.md)
