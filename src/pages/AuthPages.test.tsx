import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import SignIn from "./SignIn";
import SignUp from "./SignUp";

const auth = vi.hoisted(() => ({
  user: null as null | { uid: string },
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

function renderAt(path: string, page: ReactNode) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path.split("?")[0]} element={page} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
          <Route path="/auth/signin" element={<p>Sign-in page</p>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  auth.user = null;
  auth.loading = false;
  for (const fn of [auth.signIn, auth.signUp, auth.signInWithGoogle, auth.resetPassword, auth.confirmResetPassword]) {
    fn.mockReset();
    fn.mockResolvedValue({ error: null });
  }
  toast.mockReset();
});

const PAGES: [string, string, ReactNode][] = [
  ["sign-in", "/auth/signin", <SignIn />],
  ["sign-up", "/auth/signup", <SignUp />],
  ["forgot-password", "/auth/forgot-password", <ForgotPassword />],
  ["reset-password", "/auth/reset-password", <ResetPassword />],
];

describe.each(PAGES)("%s page", (_name, path, page) => {
  it("makes no unsupported claims (user counts, ratings, named testimonials)", () => {
    renderAt(path, page);
    expect(document.body.textContent).not.toMatch(/\d[\d,]*\+\s*(candidates|reviews|users)|\/\s*5 from|Hired at/i);
  });

  it("shows the honest product panel with the example score", () => {
    renderAt(path, page);
    const panel = screen.getByRole("complementary", { name: "About Amplify Interview" });
    expect(panel).toHaveTextContent("Example");
    expect(panel.closest("[data-landing]")).not.toBeNull();
  });

  it("links the brand mark home", () => {
    renderAt(path, page);
    expect(screen.getByRole("link", { name: "Amplify Interview home" })).toHaveAttribute("href", "/");
  });
});

describe("SignIn", () => {
  it("labels every field and drops the checkbox that did nothing", () => {
    renderAt("/auth/signin", <SignIn />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.queryByText(/remember me/i)).toBeNull();
  });

  it("toggles password visibility with a named control", async () => {
    const user = userEvent.setup();
    renderAt("/auth/signin", <SignIn />);
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
  });

  it("signs in with the typed credentials", async () => {
    const user = userEvent.setup();
    renderAt("/auth/signin", <SignIn />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: /^sign in/i }));
    expect(auth.signIn).toHaveBeenCalledWith("ada@example.com", "secret123");
  });

  it("does not call sign-in when validation fails", async () => {
    const user = userEvent.setup();
    renderAt("/auth/signin", <SignIn />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "123");
    await user.click(screen.getByRole("button", { name: /^sign in/i }));
    expect(auth.signIn).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Validation error" }));
  });

  it("sends signed-in users to the dashboard", () => {
    auth.user = { uid: "u1" };
    renderAt("/auth/signin", <SignIn />);
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });
});

describe("SignUp", () => {
  it("labels every field and does not link to a terms page that does not exist", () => {
    renderAt("/auth/signup", <SignUp />);
    for (const label of ["Full name", "Email", "Password", "Confirm password"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole("checkbox", { name: /terms and conditions/i })).toBeInTheDocument();
    expect(document.querySelector('a[href="/terms"]')).toBeNull();
  });

  it("requires the terms checkbox before creating an account", async () => {
    const user = userEvent.setup();
    renderAt("/auth/signup", <SignUp />);
    await user.type(screen.getByLabelText("Full name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "Secret123!");
    await user.type(screen.getByLabelText("Confirm password"), "Secret123!");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(auth.signUp).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox", { name: /terms and conditions/i }));
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(auth.signUp).toHaveBeenCalledWith("ada@example.com", "Secret123!", "Ada Lovelace");
  });

  it("says whether the passwords match, in words", async () => {
    const user = userEvent.setup();
    renderAt("/auth/signup", <SignUp />);
    await user.type(screen.getByLabelText("Password"), "Secret123!");
    await user.type(screen.getByLabelText("Confirm password"), "Secret12");
    expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Confirm password"), "3!");
    expect(screen.getByText("Passwords match")).toBeInTheDocument();
  });

  it("sends signed-in users to the dashboard", () => {
    auth.user = { uid: "u1" };
    renderAt("/auth/signup", <SignUp />);
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });
});

describe("ForgotPassword", () => {
  it("sends the reset email and then confirms where it went", async () => {
    const user = userEvent.setup();
    renderAt("/auth/forgot-password", <ForgotPassword />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: /send reset code/i }));
    expect(auth.resetPassword).toHaveBeenCalledWith("ada@example.com");
    expect(screen.getByRole("heading", { level: 1, name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });
});

describe("ResetPassword", () => {
  it("prefills from the link, resets, and returns to sign-in", async () => {
    const user = userEvent.setup();
    renderAt("/auth/reset-password?email=ada@example.com&code=123456", <ResetPassword />);
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByLabelText("Verification code")).toHaveValue("123456");
    await user.type(screen.getByLabelText("New password"), "Secret123!");
    await user.type(screen.getByLabelText("Confirm new password"), "Secret123!");
    await user.click(screen.getByRole("button", { name: /update password/i }));
    expect(auth.confirmResetPassword).toHaveBeenCalledWith("ada@example.com", "123456", "Secret123!");
    expect(screen.getByText("Sign-in page")).toBeInTheDocument();
  });

  it("gives each password field its own named visibility toggle", () => {
    renderAt("/auth/reset-password", <ResetPassword />);
    expect(screen.getAllByRole("button", { name: "Show password" })).toHaveLength(2);
  });
});
