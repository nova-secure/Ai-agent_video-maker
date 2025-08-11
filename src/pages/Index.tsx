import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Download, FolderOpen, Play, Rocket, Settings, Shield, Sparkles, Timer, Upload } from "lucide-react";
type StepStatus = "pending" | "running" | "done";
interface JobStep {
  name: string;
  status: StepStatus;
  duration: number; // seconds (simulated)
  log: string[];
}
interface JobOutput {
  thumbnail?: string;
  caption?: string;
  hashtags?: string[];
}
interface Job {
  id: string;
  prompt: string;
  status: "idle" | "running" | "completed";
  progress: number; // 0-100
  etaSeconds: number;
  steps: JobStep[];
  createdAt: string;
  outputs: JobOutput[];
}
const DEFAULT_STEPS: JobStep[] = [{
  name: "Ingest & Highlights Detection",
  status: "pending",
  duration: 8,
  log: []
}, {
  name: "Speech-to-Text & Subtitles",
  status: "pending",
  duration: 10,
  log: []
}, {
  name: "Video Editing",
  status: "pending",
  duration: 12,
  log: []
}, {
  name: "Quality Gates",
  status: "pending",
  duration: 4,
  log: []
}, {
  name: "Export",
  status: "pending",
  duration: 6,
  log: []
}, {
  name: "Captions & Hashtags",
  status: "pending",
  duration: 4,
  log: []
}, {
  name: "Scheduling Plan",
  status: "pending",
  duration: 3,
  log: []
}];
const storage = {
  getJobs(): Job[] {
    try {
      return JSON.parse(localStorage.getItem("jobs") || "[]");
    } catch {
      return [];
    }
  },
  setJobs(jobs: Job[]) {
    localStorage.setItem("jobs", JSON.stringify(jobs));
  },
  getSettings(): Record<string, any> {
    try {
      return JSON.parse(localStorage.getItem("settings") || "{}");
    } catch {
      return {};
    }
  },
  setSettings(s: Record<string, any>) {
    localStorage.setItem("settings", JSON.stringify(s));
  }
};
const Index = () => {
  const [prompt, setPrompt] = useState("");
  const [jobs, setJobs] = useState<Job[]>(() => storage.getJobs());
  const [isRunning, setIsRunning] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [settingsState, setSettingsState] = useState(storage.getSettings());
  const heroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    storage.setJobs(jobs);
  }, [jobs]);
  useEffect(() => {
    storage.setSettings(settingsState);
  }, [settingsState]);
  const currentJob = useMemo(() => jobs.find(j => j.id === selectedJobId) || jobs[0], [jobs, selectedJobId]);
  const totalDuration = (steps: JobStep[]) => steps.reduce((s, st) => s + st.duration, 0);
  const createJob = (text: string): Job => ({
    id: crypto.randomUUID(),
    prompt: text.trim(),
    status: "idle",
    progress: 0,
    etaSeconds: totalDuration(DEFAULT_STEPS),
    steps: DEFAULT_STEPS.map(s => ({
      ...s,
      status: "pending",
      log: []
    })),
    createdAt: new Date().toISOString(),
    outputs: []
  });
  const simulateRun = async (jobId: string, dryRun = false) => {
    setIsRunning(true);
    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      status: "running"
    } : j));
    const tick = (ms: number) => new Promise(res => setTimeout(res, ms));
    let elapsed = 0;
    for (let i = 0; i < DEFAULT_STEPS.length; i++) {
      const stepName = DEFAULT_STEPS[i].name;
      const stepDuration = DEFAULT_STEPS[i].duration;
      setJobs(prev => prev.map(j => {
        if (j.id !== jobId) return j;
        const steps = j.steps.map((s, idx) => idx === i ? {
          ...s,
          status: "running" as StepStatus,
          log: [...s.log, `Started ${stepName}`]
        } : s);
        return {
          ...j,
          steps
        };
      }));
      const segments = Math.max(1, Math.floor(stepDuration * 2));
      for (let s = 0; s < segments; s++) {
        await tick(500);
        elapsed += 0.5;
        const progress = Math.min(100, Math.round(elapsed / totalDuration(DEFAULT_STEPS) * 100));
        const eta = Math.max(0, Math.round(totalDuration(DEFAULT_STEPS) - elapsed));
        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          progress,
          etaSeconds: eta
        } : j));
      }
      setJobs(prev => prev.map(j => {
        if (j.id !== jobId) return j;
        const steps = j.steps.map((s, idx) => idx === i ? {
          ...s,
          status: "done" as StepStatus,
          log: [...s.log, `Completed ${stepName}`]
        } : s);
        return {
          ...j,
          steps
        };
      }));
    }

    // Minimal placeholder outputs
    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      status: "completed",
      progress: 100,
      etaSeconds: 0,
      outputs: [{
        caption: "Sample Islamic reminder caption",
        hashtags: ["#Islamic", "#Reminder", "#Tawheed"]
      }]
    } : j));
    setIsRunning(false);
    toast(dryRun ? "Dry run complete" : "Job finished successfully");
  };
  const handleRun = (dryRun = false) => {
    if (!prompt.trim()) {
      toast("Please enter a prompt first");
      return;
    }
    const job = createJob(prompt);
    setJobs(prev => [job, ...prev]);
    setSelectedJobId(job.id);
    void simulateRun(job.id, dryRun);
  };
  const onHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 100;
    const y = (e.clientY - rect.top) / rect.height * 100;
    heroRef.current.style.setProperty("--x", `${x}%`);
    heroRef.current.style.setProperty("--y", `${y}%`);
  };
  return <main className="min-h-screen bg-background">
      {/* JSON-LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Islamic TikTok Auto-Video Agent",
        applicationCategory: "VideoEditingApplication",
        operatingSystem: "Web",
        description: "Automate short-video production for Islamic reminders with highlights, subtitles, and scheduling."
      })
    }} />

      <header ref={heroRef} onMouseMove={onHeroMouseMove} className="bg-hero-gradient">
        <div className="container py-12 md:py-16">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2 inline-flex items-center gap-2"><Shield className="opacity-70" size={16} /> Human approval required before posting</p>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight">TikTok Auto-Video Agent</h1>
              <p className="mt-3 text-muted-foreground max-w-2xl">Type a natural-language request. The agent plans and executes steps end-to-end with respectful, engaging edits for reminders.</p>
            </div>
            <Sparkles className="hidden md:block" size={40} />
          </div>
        </div>
      </header>

      <section className="container py-8">
        <Tabs defaultValue="command" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="command">Command Center</TabsTrigger>
            <TabsTrigger value="outputs">Outputs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="command">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Global Prompt Executor</CardTitle>
                <CardDescription>Describe what you want. Example: Take this YouTube video and make 30 clips with Arabic subtitles, soft nasheed, my logo in the corner.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Paste YouTube link or describe the local file and desired edits, languages, schedule…" />
                <div className="flex flex-wrap gap-3">
                  <Button variant="hero" onClick={() => handleRun(false)} disabled={isRunning} className="font-bold text-slate-50 bg-gray-950 hover:bg-gray-800">
                    <Rocket className="mr-2" size={16} /> Run
                  </Button>
                  <Button variant="secondary" onClick={() => handleRun(true)} disabled={isRunning}>
                    <Play className="mr-2" size={16} /> Dry Run
                  </Button>
                  <Button variant="outline" disabled>
                    <Timer className="mr-2" size={16} /> Approve & Publish
                  </Button>
                </div>

                {currentJob && <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Progress</p>
                      <p className="text-sm">ETA: {currentJob.etaSeconds}s</p>
                    </div>
                    <Progress value={currentJob.progress} />

                    <ul className="mt-4 grid gap-2">
                      {currentJob.steps.map((s, i) => <li key={i} className="flex items-center justify-between rounded-md border p-3">
                          <span className="text-sm">{s.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">{s.status}</span>
                        </li>)}
                    </ul>
                  </div>}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                  <CardDescription>Current steps, ETA, and quick access to outputs.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <FolderOpen size={20} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Outputs are listed in the Outputs tab. "Open Folder" requires the desktop companion.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Guardrails</CardTitle>
                  <CardDescription>Respectful content, no auto-posting without approval.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <Shield size={20} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">The app only processes files/URLs you provide and never posts without your confirmation.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="outputs">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map(j => <Card key={j.id} className="hover:shadow-md transition" onClick={() => setSelectedJobId(j.id)}>
                  <CardHeader>
                    <CardTitle className="text-base">Job {j.id.slice(0, 6)}</CardTitle>
                    <CardDescription className="truncate">{j.prompt}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="aspect-[9/16] w-full rounded-md bg-hero-gradient shadow-glow" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{j.status}</span>
                      <span>{j.progress}%</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary"><Download size={14} className="mr-2" /> Download</Button>
                      <Button size="sm" variant="outline"><FolderOpen size={14} className="mr-2" /> Open Folder</Button>
                    </div>
                  </CardContent>
                </Card>)}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                  <CardDescription>Upload your logo for corner watermark and end-card.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*" onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setSettingsState({
                      ...settingsState,
                      logo: reader.result
                    });
                    reader.readAsDataURL(file);
                  }} />
                    <Button variant="secondary"><Upload size={16} className="mr-2" /> Upload</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Audio Library</CardTitle>
                  <CardDescription>Background nasheed and SFX placeholders (stored locally).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm">Default subtitles languages</label>
                    <Input placeholder="e.g. Arabic, French" value={settingsState.subLangs || "Arabic, French"} onChange={e => setSettingsState({
                    ...settingsState,
                    subLangs: e.target.value
                  })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="file" accept="audio/*" onChange={e => setSettingsState({
                    ...settingsState,
                    nasheed: e.target.files?.[0]?.name
                  })} />
                    <Input type="file" accept="audio/*" onChange={e => setSettingsState({
                    ...settingsState,
                    sfx: e.target.files?.[0]?.name
                  })} />
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Scheduling Defaults</CardTitle>
                  <CardDescription>Define daily slots (local-only until backend is connected).</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-3">
                  <Input placeholder="Slots e.g. 09:00, 13:00, 18:00" value={settingsState.slots || "09:00, 13:00, 18:00"} onChange={e => setSettingsState({
                  ...settingsState,
                  slots: e.target.value
                })} />
                  <Input placeholder="Days e.g. Mon-Fri" value={settingsState.days || "Mon-Sun"} onChange={e => setSettingsState({
                  ...settingsState,
                  days: e.target.value
                })} />
                  <Button variant="secondary"><Settings size={16} className="mr-2" /> Save</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Logs</CardTitle>
                <CardDescription>Job history with per-step events.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {jobs.map(job => <div key={job.id} className="rounded-md border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Job {job.id.slice(0, 6)}</p>
                          <p className="text-sm text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</p>
                        </div>
                        <span className="text-sm capitalize">{job.status}</span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {job.steps.map((s, idx) => <div key={idx} className="text-sm">
                            <span className="font-medium">{s.name}:</span> <span className="capitalize text-muted-foreground">{s.status}</span>
                          </div>)}
                      </div>
                    </div>)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <footer className="container py-10 text-center text-sm text-muted-foreground">
        Built with respect. Connect Supabase to enable real processing, storage, and scheduling.
      </footer>
    </main>;
};
export default Index;