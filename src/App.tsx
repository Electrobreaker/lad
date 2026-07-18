import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronRight, Inbox, ListTodo, Plus, Sparkles, X } from "lucide-react";

type Priority = "high" | "medium" | "low";
type Task = { id: string; title: string; duration: number; priority: Priority; done: boolean; today: boolean };
type Tab = "capture" | "inbox" | "today";

const STORAGE_KEY = "dayflow-tasks-v1";
const priorityLabel = { high: "High", medium: "Medium", low: "Low" };

function parseTasks(text: string): Task[] {
  const fragments = text.split(/\n|[;•]+|(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  return fragments.map((raw, index) => {
    const durationMatch = raw.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?|h)/i);
    const duration = durationMatch ? Number(durationMatch[1]) * (/hours?|hrs?|h/i.test(durationMatch[2]) ? 60 : 1) : 30;
    const high = /urgent|important|today|asap|by \d|deadline/i.test(raw);
    const low = /someday|if (?:i have|there is) time|not urgent|optional/i.test(raw);
    const title = raw.replace(/^[-–—\d.)\s]+/, "").replace(/[.!]$/, "");
    const priority: Priority = high ? "high" : low ? "low" : "medium";
    return { id: `${Date.now()}-${index}`, title: title.charAt(0).toUpperCase() + title.slice(1), duration, priority, done: false, today: false };
  }).slice(0, 12);
}

function TaskRow({ task, onToggle, onPlan, onRemove, showPlan }: { task: Task; onToggle: () => void; onPlan: () => void; onRemove: () => void; showPlan: boolean }) {
  return (
    <article className={`task ${task.done ? "task--done" : ""}`}>
      <button className="check" aria-label={task.done ? "Mark as incomplete" : "Mark as complete"} onClick={onToggle}>{task.done && <Check size={15} strokeWidth={3} />}</button>
      <div className="task__body">
        <p>{task.title}</p>
        <div className="meta"><span className={`dot dot--${task.priority}`} />{priorityLabel[task.priority]}<span>·</span><span>{task.duration} min</span></div>
      </div>
      {showPlan && !task.today ? <button className="icon-button plan" onClick={onPlan} aria-label="Add to Today"><ChevronRight size={20} /></button> : <button className="icon-button remove" onClick={onRemove} aria-label="Remove"><X size={17} /></button>}
    </article>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("capture");
  const [input, setInput] = useState("");
  const [tasks, setTasks] = useState<Task[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [notice, setNotice] = useState("");
  const [isOrganizing, setIsOrganizing] = useState(false);
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)), [tasks]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 2200); return () => clearTimeout(timer); }, [notice]);

  const inboxTasks = tasks.filter((task) => !task.today);
  const todayTasks = tasks.filter((task) => task.today);
  const completed = todayTasks.filter((task) => task.done).length;
  const totalMinutes = useMemo(() => todayTasks.filter((task) => !task.done).reduce((sum, task) => sum + task.duration, 0), [todayTasks]);

  async function organize() {
    if (!input.trim()) { setNotice("Add at least one thought first"); return; }
    setIsOrganizing(true);
    let next: Task[] = [];
    let usedAi = false;
    try {
      const response = await fetch("/api/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: input.trim() }) });
      if (!response.ok) throw new Error("AI unavailable");
      const data = await response.json() as { tasks: Array<Pick<Task, "title" | "duration" | "priority">> };
      next = data.tasks.map((task, index) => ({ ...task, id: `${Date.now()}-${index}`, done: false, today: false }));
      usedAi = true;
    } catch {
      next = parseTasks(input);
    } finally {
      setIsOrganizing(false);
    }
    if (!next.length) { setNotice("No tasks found"); return; }
    setTasks((current) => [...current, ...next]); setInput(""); setTab("inbox"); setNotice(`${usedAi ? "AI organized" : "Found locally"} ${next.length} ${next.length === 1 ? "task" : "tasks"}`);
  }
  function update(id: string, patch: Partial<Task>) { setTasks((all) => all.map((task) => task.id === id ? { ...task, ...patch } : task)); }
  function remove(id: string) { setTasks((all) => all.filter((task) => task.id !== id)); }
  function addExample() { setInput("Prepare the presentation by 3 PM, 45 min. Reply to Olivia. Buy groceries after work, 30 min. If I have time, book a dentist appointment."); }

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand"><span className="brand__mark"><Sparkles size={17} /></span><span>lad</span></div><div className="date"><CalendarDays size={16} /><span>{new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(new Date())}</span></div></header>

      <section className="content">
        {tab === "capture" && <div className="screen capture-screen">
          <div className="eyebrow"><span />Clear your mind</div>
          <h1>What's on<br />your mind?</h1>
          <p className="lead">Write it down just as it is. We'll turn the chaos into a clear plan.</p>
          <div className="capture-box">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="For example: finish the report by 4 PM, message Olivia, buy groceries..." autoFocus />
            <div className="capture-actions"><button className="text-button" onClick={addExample}>Add an example</button><span>{input.length}/600</span></div>
          </div>
          <button className="primary" onClick={organize} disabled={isOrganizing}><Sparkles size={19} />{isOrganizing ? "Organizing…" : "Organize thoughts"}<ArrowRight size={19} /></button>
          <p className="privacy">Tasks stay on this device · text is processed by Gemini</p>
        </div>}

        {tab === "inbox" && <div className="screen list-screen">
          <div className="list-header"><div><span className="kicker">Organized</span><h1>Inbox</h1></div><button className="round-add" onClick={() => setTab("capture")} aria-label="Add thoughts"><Plus size={22} /></button></div>
          {inboxTasks.length ? <><p className="section-note">Choose what truly matters today.</p><div className="task-list">{inboxTasks.map((task) => <TaskRow key={task.id} task={task} showPlan onToggle={() => update(task.id, { done: !task.done })} onPlan={() => { update(task.id, { today: true }); setNotice("Added to today's plan"); }} onRemove={() => remove(task.id)} />)}</div>
          <button className="secondary" onClick={() => setTab("today")}>Go to today's plan <ArrowRight size={18} /></button></> : <Empty title="Your inbox is empty" text="New thoughts you organize will appear here." action={() => setTab("capture")} />}
        </div>}

        {tab === "today" && <div className="screen list-screen">
          <div className="list-header"><div><span className="kicker">Your focus</span><h1>Today</h1></div><div className="progress-ring">{completed}/{todayTasks.length}</div></div>
          {todayTasks.length ? <><div className="day-summary"><span>Remaining</span><strong>{totalMinutes === 0 ? "0 min" : <>{Math.floor(totalMinutes / 60) ? `${Math.floor(totalMinutes / 60)} hr ` : ""}{totalMinutes % 60 ? `${totalMinutes % 60} min` : ""}</>}</strong></div><div className="task-list">{todayTasks.map((task) => <TaskRow key={task.id} task={task} showPlan={false} onToggle={() => update(task.id, { done: !task.done })} onPlan={() => {}} onRemove={() => update(task.id, { today: false, done: false })} />)}</div></> : <Empty title="Your plan is empty" text="Open your Inbox and add a few priority tasks for today." action={() => setTab("inbox")} />}
        </div>}
      </section>

      <nav className="bottom-nav" aria-label="Main navigation">
        <button className={tab === "capture" ? "active" : ""} onClick={() => setTab("capture")}><Plus size={21} /><span>Add</span></button>
        <button className={tab === "inbox" ? "active" : ""} onClick={() => setTab("inbox")}><Inbox size={21} /><span>Inbox</span>{inboxTasks.length > 0 && <i>{inboxTasks.length}</i>}</button>
        <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}><ListTodo size={21} /><span>Today</span></button>
      </nav>
      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}

function Empty({ title, text, action }: { title: string; text: string; action: () => void }) {
  return <div className="empty"><div className="empty__icon"><Check size={26} /></div><h2>{title}</h2><p>{text}</p><button onClick={action}>Get started <ArrowRight size={17} /></button></div>;
}
