import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardData } from "./useDashboardData";

const auth = vi.hoisted(() => ({ user: { uid: "u1", email: "ada@example.com", displayName: "Ada" } }));
const toast = vi.hoisted(() => vi.fn());
const api = vi.hoisted(() => ({
  getProfile: vi.fn(),
  listSessions: vi.fn(),
  getOverview: vi.fn(),
  getProgress: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/services/apiClient", () => ({
  userApi: { getProfile: api.getProfile },
  interviewApi: { listSessions: api.listSessions },
  analyticsApi: { getOverview: api.getOverview, getProgress: api.getProgress },
}));

beforeEach(() => {
  toast.mockReset();
  api.getProfile.mockReset().mockResolvedValue({ uid: "u1", display_name: "Ada" });
  api.listSessions.mockReset().mockResolvedValue([{ session_id: "s1" }]);
  api.getOverview.mockReset().mockResolvedValue({ completed_sessions: 1 });
  api.getProgress.mockReset().mockResolvedValue({ score_timeline: [] });
});

describe("useDashboardData", () => {
  it("is loading until the first fetch settles, then exposes the data", async () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toEqual({ uid: "u1", display_name: "Ada" });
    expect(result.current.sessions).toEqual([{ session_id: "s1" }]);
    expect(result.current.overview).toEqual({ completed_sessions: 1 });
    expect(api.listSessions).toHaveBeenCalledWith(20);
  });

  it("falls back to the auth user when the profile request fails", async () => {
    api.getProfile.mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toMatchObject({ uid: "u1", display_name: "Ada" });
  });

  it("stops loading and toasts when sessions fail", async () => {
    api.listSessions.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error Loading Sessions" }));
  });

  it("flags which part failed so the page can say so", async () => {
    api.listSessions.mockRejectedValue(new Error("down"));
    api.getOverview.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessionsError).toBe(true);
    expect(result.current.analyticsError).toBe(true);
  });

  it("refresh reports failure instead of claiming success", async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessionsError).toBe(false);
    api.getOverview.mockRejectedValue(new Error("down"));
    toast.mockClear();
    await act(() => result.current.refresh());
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Refresh Failed" }));
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Refreshed" }));
    expect(result.current.analyticsError).toBe(true);
  });

  it("refresh refetches sessions and analytics", async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    api.listSessions.mockClear();
    api.getOverview.mockClear();
    await act(() => result.current.refresh());
    expect(api.listSessions).toHaveBeenCalledTimes(1);
    expect(api.getOverview).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Refreshed" }));
  });
});
