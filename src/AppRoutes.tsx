import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppShell } from "@/components/shell/AppShell";
import ChatInterviewSession from "@/pages/ChatInterviewSession";
import Dashboard from "@/pages/Dashboard";
import ForgotPassword from "@/pages/ForgotPassword";
import Index from "@/pages/Index";
import Insights from "@/pages/Insights";
import InterviewResults from "@/pages/InterviewResults";
import InterviewSetup from "@/pages/InterviewSetup";
import NotFound from "@/pages/NotFound";
import PracticeQuestions from "@/pages/PracticeQuestions";
import Progress from "@/pages/Progress";
import ResetPassword from "@/pages/ResetPassword";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";

/**
 * Every route. Signed-in pages share one layout route (dark rail, spec §3.1);
 * the live interview is protected but outside it, so nothing competes with the
 * conversation (focus mode). URLs are unchanged from before the shell.
 */
const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth/signin" element={<SignIn />} />
    <Route path="/auth/signup" element={<SignUp />} />
    <Route path="/auth/forgot-password" element={<ForgotPassword />} />
    <Route path="/auth/reset-password" element={<ResetPassword />} />

    <Route
      element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }
    >
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/progress" element={<Progress />} />
      <Route path="/dashboard/insights" element={<Insights />} />
      <Route path="/dashboard/practice-questions" element={<PracticeQuestions />} />
      <Route path="/interview/setup" element={<InterviewSetup />} />
      <Route path="/results/:sessionId" element={<InterviewResults />} />
    </Route>

    <Route
      path="/interview/session"
      element={
        <ProtectedRoute>
          <ChatInterviewSession />
        </ProtectedRoute>
      }
    />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
