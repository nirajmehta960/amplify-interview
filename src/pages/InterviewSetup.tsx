import { useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Briefcase,
  Upload,
  Check,
  Brain,
  Users,
  Code2,
  Layers,
  Target,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  X,
} from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { resumeApi } from "@/services/apiClient";

type Step = 1 | 2 | 3;

const roles = [
  { id: "swe", label: "Software Engineer", icon: Code2, hint: "Coding, system design, CS fundamentals" },
  { id: "data", label: "Data Analyst", icon: Layers, hint: "SQL, analytics, storytelling with data" },
  { id: "pm", label: "Product Manager", icon: Target, hint: "Strategy, prioritization, user empathy" },
  { id: "design", label: "Product Designer", icon: Sparkles, hint: "UX craft, critique, design process" },
] as const;

const modes = [
  { id: "behavioral", label: "Behavioral", icon: Users, desc: "STAR-style stories about past experience." },
  { id: "technical", label: "Technical", icon: Brain, desc: "Role-specific technical & problem solving." },
  { id: "mixed", label: "Mixed", icon: Sparkles, desc: "Balanced blend of behavioral and technical." },
] as const;

const InterviewSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [jdId, setJdId] = useState<string | null>(null);

  const [role, setRole] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setResumeFile(f);
  };

  const canNext1 = !!resumeFile && (jdText.trim().length > 30 || jdUrl.trim().length > 0);
  const canNext2 = !!role && !!mode;

  const handleContinueFromStep1 = async () => {
    if (!resumeFile) return;
    const rawText = jdText.trim() || jdUrl.trim();
    if (!rawText) return;

    setAnalyzing(true);
    try {
      const uploaded = await resumeApi.upload(resumeFile);
      setResumeId(uploaded.resume_id);

      const jdRes = await resumeApi.createJD(rawText);
      setJdId(jdRes.jd_id);

      setStep(2);
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message || "Could not process resume/JD. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const startInterview = () => {
    if (!resumeId || !jdId || !role || !mode) return;

    setAnalyzing(true);
    const config = {
      mode,
      duration: 30,
      questionCount: 10,
      adaptiveDifficulty: true,
      enableFollowups: true,
      role,
      difficulty,
    };

    const state = { config, resumeId, jdId };
    sessionStorage.setItem("interviewConfig", JSON.stringify(state));
    navigate("/interview/session", { state });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
      <Helmet>
        <title>New Interview - Amplify Interview</title>
        <meta
          name="description"
          content="Upload your resume and job description to generate a personalized interview."
        />
      </Helmet>

        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-xl">
            <div className="h-14 px-4 md:px-6 flex items-center gap-3">
              <SidebarTrigger />
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard" className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Link>
              </Button>
              <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Personalized AI Interview
              </div>
            </div>
          </header>

          <main className="px-4 md:px-10 py-8 max-w-5xl mx-auto w-full">
            {/* Stepper */}
            <div className="flex items-center justify-between mb-10">
              {[
                { n: 1, label: "Upload" },
                { n: 2, label: "Role & Mode" },
                { n: 3, label: "Review" },
              ].map((s, i) => (
                <div key={s.n} className="flex items-center flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border transition-all ${
                        step >= (s.n as Step)
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card text-muted-foreground border-border"
                      }`}
                    >
                      {step > (s.n as Step) ? <Check className="w-4 h-4" /> : s.n}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        step >= (s.n as Step) ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={`flex-1 h-px mx-4 ${step > (s.n as Step) ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-5 h-5 text-primary" />
                    <h2 className="font-display font-semibold text-lg">Your Resume</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">
                    PDF, DOCX or TXT. We'll extract skills and experience.
                  </p>

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-secondary/40 hover:bg-secondary/70 hover:border-primary/40 transition-all p-8 text-center"
                  >
                    {!resumeFile ? (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          Drop your resume here, or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Max 10MB</p>
                      </>
                    ) : (
                      <div className="flex items-center justify-between bg-card border border-border rounded-lg p-3 text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{resumeFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(resumeFile.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setResumeFile(null);
                          }}
                          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-5 h-5 text-accent" />
                    <h2 className="font-display font-semibold text-lg">Job Description</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">
                    Paste the JD or share a link to the role.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Job posting URL (optional)</Label>
                      <Input
                        placeholder="https://company.com/careers/..."
                        value={jdUrl}
                        onChange={(e) => setJdUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Or paste the description</Label>
                      <Textarea
                        rows={8}
                        placeholder="Paste the role responsibilities, requirements, and qualifications…"
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                        className="resize-none"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">{jdText.length} characters</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div>
                  <h2 className="font-display text-lg font-semibold mb-1">Target role</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    We'll tailor questions to this role using your resume and JD.
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {roles.map((r) => {
                      const active = role === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => setRole(r.id)}
                          className={`text-left rounded-xl border p-4 transition-all ${
                            active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                              active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            <r.icon className="w-4 h-4" />
                          </div>
                          <p className="font-medium text-sm">{r.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{r.hint}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-lg font-semibold mb-1">Interview mode</h2>
                  <p className="text-sm text-muted-foreground mb-4">Choose what you want to focus on this session.</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {modes.map((m) => {
                      const active = mode === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setMode(m.id)}
                          className={`text-left rounded-xl border p-5 transition-all ${
                            active ? "border-accent bg-accent/5 shadow-sm" : "border-border bg-card hover:border-accent/40"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                              active ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            <m.icon className="w-5 h-5" />
                          </div>
                          <p className="font-medium">{m.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-lg font-semibold mb-1">Difficulty</h2>
                  <p className="text-sm text-muted-foreground mb-4">Adaptive — we'll adjust based on your answers.</p>
                  <div className="inline-flex rounded-lg border border-border bg-card p-1">
                    {(["easy", "medium", "hard"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`px-4 py-1.5 text-sm rounded-md capitalize transition-all ${
                          difficulty === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-8">
                <h2 className="font-display text-xl font-semibold mb-1">Ready to start</h2>
                <p className="text-sm text-muted-foreground mb-6">Review your setup. You can change anything before starting.</p>

                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  {[
                    { label: "Resume", value: resumeFile?.name ?? "—", icon: FileText },
                    { label: "Job Description", value: jdUrl ? "Linked posting" : `${jdText.length} chars pasted`, icon: Briefcase },
                    { label: "Target Role", value: roles.find((r) => r.id === role)?.label ?? "—", icon: Target },
                    { label: "Mode", value: `${modes.find((m) => m.id === mode)?.label ?? "—"} • ${difficulty}`, icon: Sparkles },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-medium truncate">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-gradient-to-br from-primary/5 via-accent/5 to-transparent border border-border p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">AI is preparing your session</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        We'll generate questions tailored to your background, the JD, and your selected mode. Difficulty adapts as you answer.
                      </p>
                    </div>
                  </div>
                </div>

                <Button size="lg" className="w-full sm:w-auto gap-2" onClick={startInterview} disabled={analyzing || !resumeId || !jdId}>
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Analyzing your profile…
                    </>
                  ) : (
                    <>
                      Start Interview <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Footer nav */}
            {step !== 3 && (
              <div className="flex justify-between mt-10">
                <Button variant="ghost" onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))} disabled={step === 1 || analyzing}>
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (step === 1) void handleContinueFromStep1();
                    else setStep((s) => (s + 1) as Step);
                  }}
                  disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2) || analyzing}
                  className="gap-2"
                >
                  {step === 1 && analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default InterviewSetup;
