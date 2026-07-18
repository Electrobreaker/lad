import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronRight, Inbox, Languages, ListTodo, Moon, Plus, Settings, Sparkles, Sun, X } from "lucide-react";

type Priority = "high" | "medium" | "low";
type Task = { id: string; title: string; duration: number; priority: Priority; done: boolean; today: boolean };
type Tab = "capture" | "inbox" | "today" | "settings";
type Language = "en" | "uk";
type Theme = "light" | "dark";

const STORAGE_KEY = "dayflow-tasks-v1";
const LANGUAGE_KEY = "lad-language";
const THEME_KEY = "lad-theme";

const copy = {
  en: {
    priority: { high: "High", medium: "Medium", low: "Low" }, incomplete: "Mark as incomplete", complete: "Mark as complete", addToday: "Add to Today", remove: "Remove", min: "min", hr: "hr",
    addFirst: "Add at least one thought first", noTasks: "No tasks found", aiOrganized: "AI organized", foundLocally: "Found locally", task: "task", tasks: "tasks",
    example: "Prepare the presentation by 3 PM, 45 min. Reply to Olivia. Buy groceries after work, 30 min. If I have time, book a dentist appointment.",
    clearMind: "Clear your mind", mind1: "What's on", mind2: "your mind?", lead: "Write it down just as it is. We'll turn the chaos into a clear plan.", placeholder: "For example: finish the report by 4 PM, message Olivia, buy groceries...", addExample: "Add an example", organizing: "Organizing…", organize: "Organize thoughts", privacy: "Tasks stay on this device · text is processed by Gemini",
    organized: "Organized", inbox: "Inbox", addThoughts: "Add thoughts", choose: "Choose what truly matters today.", addedToday: "Added to today's plan", goPlan: "Go to today's plan", inboxEmpty: "Your inbox is empty", inboxEmptyText: "New thoughts you organize will appear here.",
    focus: "Your focus", today: "Today", remaining: "Remaining", planEmpty: "Your plan is empty", planEmptyText: "Open your Inbox and add a few priority tasks for today.",
    navigation: "Main navigation", add: "Add", settings: "Settings", preferences: "Preferences", personalize: "Make Lad feel right for you.", language: "Language", languageHint: "Choose the language used throughout the app and for AI-generated tasks.", theme: "Appearance", themeHint: "Choose how Lad looks on this device.", english: "English", ukrainian: "Українська", light: "Light", dark: "Dark", getStarted: "Get started",
  },
  uk: {
    priority: { high: "Високий", medium: "Середній", low: "Низький" }, incomplete: "Позначити невиконаною", complete: "Позначити виконаною", addToday: "Додати на сьогодні", remove: "Видалити", min: "хв", hr: "год",
    addFirst: "Спочатку додай хоча б одну думку", noTasks: "Не вдалося знайти задачі", aiOrganized: "AI упорядкував", foundLocally: "Локально знайдено", task: "задачу", tasks: "задачі",
    example: "Підготувати презентацію до 15:00, 45 хв. Відповісти Олені. Купити продукти після роботи, 30 хв. Якщо буде час — забронювати стоматолога.",
    clearMind: "Звільни голову", mind1: "Що в тебе", mind2: "на думці?", lead: "Просто напиши все як є. Ми перетворимо хаос на зрозумілий план.", placeholder: "Наприклад: підготувати звіт до 16:00, написати Олені, купити продукти...", addExample: "Додати приклад", organizing: "Упорядковую…", organize: "Упорядкувати думки", privacy: "Задачі зберігаються на пристрої · текст обробляє Gemini",
    organized: "Розібрано", inbox: "Inbox", addThoughts: "Додати думки", choose: "Обери, що справді важливо зробити сьогодні.", addedToday: "Додано до плану на сьогодні", goPlan: "Перейти до плану", inboxEmpty: "Inbox порожній", inboxEmptyText: "Нові думки, які ти розбереш, з’являться тут.",
    focus: "Твій фокус", today: "Сьогодні", remaining: "Залишилось", planEmpty: "План ще порожній", planEmptyText: "Зайди в Inbox і додай кілька пріоритетних задач на сьогодні.",
    navigation: "Головна навігація", add: "Додати", settings: "Налаштування", preferences: "Твої вподобання", personalize: "Налаштуй Lad так, як зручно тобі.", language: "Мова", languageHint: "Обери мову інтерфейсу та задач, які створює AI.", theme: "Вигляд", themeHint: "Обери оформлення Lad на цьому пристрої.", english: "English", ukrainian: "Українська", light: "Світла", dark: "Темна", getStarted: "Почати",
  },
} as const;

function parseTasks(text: string): Task[] {
  const fragments = text.split(/\n|[;•]+|(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  return fragments.map((raw, index) => {
    const durationMatch = raw.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?|h|хв|хвилин|год|години)/i);
    const duration = durationMatch ? Number(durationMatch[1]) * (/hours?|hrs?|h|год/i.test(durationMatch[2]) ? 60 : 1) : 30;
    const high = /urgent|important|today|asap|by \d|deadline|термін|важлив|сьогодні|до \d|асап/i.test(raw);
    const low = /someday|if (?:i have|there is) time|not urgent|optional|колись|якщо буде час|не термін/i.test(raw);
    const title = raw.replace(/^[-–—\d.)\s]+/, "").replace(/[.!]$/, "");
    const priority: Priority = high ? "high" : low ? "low" : "medium";
    return { id: `${Date.now()}-${index}`, title: title.charAt(0).toUpperCase() + title.slice(1), duration, priority, done: false, today: false };
  }).slice(0, 12);
}

function TaskRow({ task, onToggle, onPlan, onRemove, showPlan, language }: { task: Task; onToggle: () => void; onPlan: () => void; onRemove: () => void; showPlan: boolean; language: Language }) {
  const t = copy[language];
  return <article className={`task ${task.done ? "task--done" : ""}`}>
    <button className="check" aria-label={task.done ? t.incomplete : t.complete} onClick={onToggle}>{task.done && <Check size={15} strokeWidth={3} />}</button>
    <div className="task__body"><p>{task.title}</p><div className="meta"><span className={`dot dot--${task.priority}`} />{t.priority[task.priority]}<span>·</span><span>{task.duration} {t.min}</span></div></div>
    {showPlan && !task.today ? <button className="icon-button plan" onClick={onPlan} aria-label={t.addToday}><ChevronRight size={20} /></button> : <button className="icon-button remove" onClick={onRemove} aria-label={t.remove}><X size={17} /></button>}
  </article>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("capture");
  const [input, setInput] = useState("");
  const [tasks, setTasks] = useState<Task[]>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } });
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem(LANGUAGE_KEY) === "uk" ? "uk" : "en");
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");
  const [notice, setNotice] = useState("");
  const [isOrganizing, setIsOrganizing] = useState(false);
  const t = copy[language];

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)), [tasks]);
  useEffect(() => { localStorage.setItem(LANGUAGE_KEY, language); document.documentElement.lang = language === "uk" ? "uk" : "en"; }, [language]);
  useEffect(() => { localStorage.setItem(THEME_KEY, theme); document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 2200); return () => clearTimeout(timer); }, [notice]);

  const inboxTasks = tasks.filter((task) => !task.today);
  const todayTasks = tasks.filter((task) => task.today);
  const completed = todayTasks.filter((task) => task.done).length;
  const totalMinutes = useMemo(() => todayTasks.filter((task) => !task.done).reduce((sum, task) => sum + task.duration, 0), [todayTasks]);

  async function organize() {
    if (!input.trim()) { setNotice(t.addFirst); return; }
    setIsOrganizing(true); let next: Task[] = []; let usedAi = false;
    try {
      const response = await fetch("/api/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: input.trim(), language }) });
      if (!response.ok) throw new Error("AI unavailable");
      const data = await response.json() as { tasks: Array<Pick<Task, "title" | "duration" | "priority">> };
      next = data.tasks.map((task, index) => ({ ...task, id: `${Date.now()}-${index}`, done: false, today: false })); usedAi = true;
    } catch { next = parseTasks(input); } finally { setIsOrganizing(false); }
    if (!next.length) { setNotice(t.noTasks); return; }
    setTasks((current) => [...current, ...next]); setInput(""); setTab("inbox"); setNotice(`${usedAi ? t.aiOrganized : t.foundLocally} ${next.length} ${next.length === 1 ? t.task : t.tasks}`);
  }
  function update(id: string, patch: Partial<Task>) { setTasks((all) => all.map((task) => task.id === id ? { ...task, ...patch } : task)); }
  function remove(id: string) { setTasks((all) => all.filter((task) => task.id !== id)); }

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand__mark"><Sparkles size={17} /></span><span>lad</span></div><div className="date"><CalendarDays size={16} /><span>{new Intl.DateTimeFormat(language === "uk" ? "uk-UA" : "en-US", { day: "numeric", month: "short" }).format(new Date())}</span></div></header>
    <section className="content">
      {tab === "capture" && <div className="screen capture-screen"><div className="eyebrow"><span />{t.clearMind}</div><h1>{t.mind1}<br />{t.mind2}</h1><p className="lead">{t.lead}</p><div className="capture-box"><textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.placeholder} maxLength={600} autoFocus /><div className="capture-actions"><button className="text-button" onClick={() => setInput(t.example)}>{t.addExample}</button><span>{input.length}/600</span></div></div><button className="primary" onClick={organize} disabled={isOrganizing}><Sparkles size={19} />{isOrganizing ? t.organizing : t.organize}<ArrowRight size={19} /></button><p className="privacy">{t.privacy}</p></div>}
      {tab === "inbox" && <div className="screen list-screen"><div className="list-header"><div><span className="kicker">{t.organized}</span><h1>{t.inbox}</h1></div><button className="round-add" onClick={() => setTab("capture")} aria-label={t.addThoughts}><Plus size={22} /></button></div>{inboxTasks.length ? <><p className="section-note">{t.choose}</p><div className="task-list">{inboxTasks.map((task) => <TaskRow key={task.id} task={task} language={language} showPlan onToggle={() => update(task.id, { done: !task.done })} onPlan={() => { update(task.id, { today: true }); setNotice(t.addedToday); }} onRemove={() => remove(task.id)} />)}</div><button className="secondary" onClick={() => setTab("today")}>{t.goPlan} <ArrowRight size={18} /></button></> : <Empty title={t.inboxEmpty} text={t.inboxEmptyText} label={t.getStarted} action={() => setTab("capture")} />}</div>}
      {tab === "today" && <div className="screen list-screen"><div className="list-header"><div><span className="kicker">{t.focus}</span><h1>{t.today}</h1></div><div className="progress-ring">{completed}/{todayTasks.length}</div></div>{todayTasks.length ? <><div className="day-summary"><span>{t.remaining}</span><strong>{totalMinutes === 0 ? `0 ${t.min}` : <>{Math.floor(totalMinutes / 60) ? `${Math.floor(totalMinutes / 60)} ${t.hr} ` : ""}{totalMinutes % 60 ? `${totalMinutes % 60} ${t.min}` : ""}</>}</strong></div><div className="task-list">{todayTasks.map((task) => <TaskRow key={task.id} task={task} language={language} showPlan={false} onToggle={() => update(task.id, { done: !task.done })} onPlan={() => {}} onRemove={() => update(task.id, { today: false, done: false })} />)}</div></> : <Empty title={t.planEmpty} text={t.planEmptyText} label={t.getStarted} action={() => setTab("inbox")} />}</div>}
      {tab === "settings" && <div className="screen settings-screen"><div className="list-header"><div><span className="kicker">{t.preferences}</span><h1>{t.settings}</h1></div></div><p className="section-note">{t.personalize}</p><section className="setting-card"><div className="setting-heading"><span className="setting-icon"><Languages size={19} /></span><div><h2>{t.language}</h2><p>{t.languageHint}</p></div></div><div className="segmented"><button className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")}>{t.english}</button><button className={language === "uk" ? "selected" : ""} onClick={() => setLanguage("uk")}>{t.ukrainian}</button></div></section><section className="setting-card"><div className="setting-heading"><span className="setting-icon">{theme === "light" ? <Sun size={19} /> : <Moon size={19} />}</span><div><h2>{t.theme}</h2><p>{t.themeHint}</p></div></div><div className="segmented"><button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><Sun size={15} />{t.light}</button><button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}><Moon size={15} />{t.dark}</button></div></section></div>}
    </section>
    <nav className="bottom-nav" aria-label={t.navigation}><button className={tab === "capture" ? "active" : ""} onClick={() => setTab("capture")}><Plus size={21} /><span>{t.add}</span></button><button className={tab === "inbox" ? "active" : ""} onClick={() => setTab("inbox")}><Inbox size={21} /><span>{t.inbox}</span>{inboxTasks.length > 0 && <i>{inboxTasks.length}</i>}</button><button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}><ListTodo size={21} /><span>{t.today}</span></button><button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}><Settings size={21} /><span>{t.settings}</span></button></nav>
    {notice && <div className="toast">{notice}</div>}
  </main>;
}

function Empty({ title, text, label, action }: { title: string; text: string; label: string; action: () => void }) {
  return <div className="empty"><div className="empty__icon"><Check size={26} /></div><h2>{title}</h2><p>{text}</p><button onClick={action}>{label} <ArrowRight size={17} /></button></div>;
}
