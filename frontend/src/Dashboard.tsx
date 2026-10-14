import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList,
  Pie, PieChart, ResponsiveContainer, XAxis, YAxis,
} from "recharts";
import {
  ArrowDown, ArrowRight, ArrowUp, BarChart3, CalendarDays, ChevronDown,
  Lightbulb, Megaphone, MoreVertical, Send, Sparkles, Target, UserMinus, Users,
} from "lucide-react";
import "./Dashboard.css";

/* ===================== Tipos ===================== */
interface Kpi {
  id: string;
  label: string;
  value: string;
  delta: string;
  direction: "up" | "down";
  note: string;
  tone: "violet" | "green" | "orange" | "indigo";
  icon: ReactNode;
}
interface ChannelPoint { channel: string; rate: number }
interface TimePoint { month: string; converted: number; notConverted: number }
interface Factor { label: string; value: number; color: string }
interface ChatMessage { id: number; role: "user" | "agent"; time: string; content: ReactNode }

/** Troque por uma chamada ao seu agente de IA (API). Deve devolver o texto da resposta. */
export type AskAgent = (question: string) => Promise<string>;

/* ===================== Dados (substitua por dados reais da API) ===================== */
const KPIS: Kpi[] = [
  { id: "total", label: "Total de Clientes", value: "8.000", delta: "100%", direction: "up", note: "base analisada", tone: "violet", icon: <Users size={26} /> },
  { id: "conv", label: "Taxa de Conversão", value: "87,6%", delta: "2,4%", direction: "up", note: "vs. período anterior", tone: "green", icon: <Target size={26} /> },
  { id: "not", label: "Não Convertidos", value: "12,4%", delta: "2,4%", direction: "down", note: "grupo de atenção", tone: "orange", icon: <UserMinus size={26} /> },
  { id: "spend", label: "Gasto com Anúncios", value: "$ 48.320", delta: "8,7%", direction: "down", note: "custo otimizado", tone: "indigo", icon: <Megaphone size={26} /> },
];

const CHANNELS: ChannelPoint[] = [
  { channel: "Email", rate: 82.3 },
  { channel: "Social Media", rate: 85.7 },
  { channel: "SEO", rate: 80.1 },
  { channel: "PPC", rate: 89.4 },
  { channel: "Referral", rate: 86.2 },
];
const BAR_GRADIENTS: [string, string][] = [
  ["#A855F7", "#6D3FD0"], ["#3B82F6", "#2D5BE3"], ["#10D9A0", "#0E8F82"],
  ["#FDBA5A", "#F2873A"], ["#F472B6", "#D63A94"],
];

const TIMELINE: TimePoint[] = [
  { month: "Jan", converted: 500, notConverted: 90 },
  { month: "Fev", converted: 620, notConverted: 180 },
  { month: "Mar", converted: 840, notConverted: 190 },
  { month: "Abr", converted: 985, notConverted: 290 },
  { month: "Mai", converted: 1010, notConverted: 295 },
  { month: "Jun", converted: 1250, notConverted: 400 },
];

const FACTORS: Factor[] = [
  { label: "Tipo de Campanha (Conversion)", value: 32.7, color: "#10D9A0" },
  { label: "Tempo no Site (TimeOnSite)", value: 24.1, color: "#3B82F6" },
  { label: "Cliques em E-mails (EmailClicks)", value: 18.6, color: "#A855F7" },
  { label: "Aberturas de E-mail (EmailOpens)", value: 12.3, color: "#FDBA5A" },
  { label: "Outros fatores", value: 8.3, color: "#7C8AA5" },
];

const CLASS_SPLIT = [
  { name: "Converteram", value: 7008, pct: "87,6%", color: "#10D9A0" },
  { name: "Não converteram", value: 992, pct: "12,4%", color: "#A855F7" },
];

const EXAMPLES = ["Prever conversão", "Comparar campanhas", "Analisar clientes de risco"];

/* ===================== Utilidades ===================== */
const nowTime = () =>
  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Resposta de demonstração, usada enquanto não houver agente real. */
const mockAgent: AskAgent = async (q) => {
  await new Promise((r) => setTimeout(r, 700));
  const s = q.toLowerCase();
  if (s.includes("e-mail") || s.includes("email") || s.includes("redes") || s.includes("campanha"))
    return "Nesta base o canal quase não separa quem converte de quem não converte: PPC lidera com 89,4% e SEO fica com 80,1%. O tipo de campanha pesa mais que o canal.";
  if (s.includes("risco"))
    return "Os clientes de maior risco combinam pouco tempo no site, poucos cliques em e-mail e campanhas que não são do tipo Conversion. São o grupo de 12,4% que vale recuperar.";
  if (s.includes("prever"))
    return "A previsão por cliente depende do modelo da Etapa 2. Quando ele estiver conectado, mostro a probabilidade de conversão individual.";
  return "Posso comparar campanhas, explicar os fatores de influência e apontar clientes de risco. O que você quer ver primeiro?";
};

/* ===================== Subcomponentes ===================== */
function KpiCard({ k }: { k: Kpi }) {
  const Arrow = k.direction === "up" ? ArrowUp : ArrowDown;
  return (
    <article className={`kpi tone-${k.tone}`}>
      <div className="kpi-icon">{k.icon}</div>
      <p className="kpi-label">{k.label}</p>
      <p className="kpi-value">{k.value}</p>
      <p className="kpi-foot">
        <span className={`delta ${k.direction}`}><Arrow size={14} />{k.delta}</span>
        {k.note}
      </p>
    </article>
  );
}

function ChannelChart() {
  return (
    <section className="card">
      <div className="card-head">
        <h2><BarChart3 size={20} /> Desempenho das Campanhas</h2>
        <select aria-label="Métrica" defaultValue="rate">
          <option value="rate">Taxa de Conversão</option>
        </select>
      </div>
      <div className="chart" style={{ height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={CHANNELS} margin={{ top: 22, right: 8, left: -8, bottom: 0 }}>
            <defs>
              {BAR_GRADIENTS.map(([from, to], i) => (
                <linearGradient key={i} id={`bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={from} />
                  <stop offset="100%" stopColor={to} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="channel" tickLine={false} axisLine={false} stroke="var(--text)" />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v}%`}
                   tickLine={false} axisLine={false} stroke="var(--text)" />
            <Bar dataKey="rate" radius={[3, 3, 0, 0]} maxBarSize={48}>
              {CHANNELS.map((_, i) => <Cell key={i} fill={`url(#bar-${i})`} />)}
              <LabelList dataKey="rate" position="top" fill="var(--text)"
                         formatter={(v: unknown) => `${Number(v).toFixed(1).replace(".", ",")}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function TimelineChart() {
  return (
    <section className="card">
      <div className="card-head">
        <h2><Sparkles size={20} /> Conversões ao Longo do Tempo</h2>
        <select aria-label="Período" defaultValue="m">
          <option value="m">Mensal</option>
        </select>
      </div>
      <ul className="legend">
        <li><i style={{ background: "#10D9A0" }} />Convertidos</li>
        <li><i style={{ background: "#A855F7" }} />Não convertidos</li>
      </ul>
      <div className="chart" style={{ height: 215 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={TIMELINE} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="area-ok" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10D9A0" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10D9A0" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="area-no" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A855F7" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#A855F7" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="var(--text)" />
            <YAxis domain={[0, 1500]} ticks={[0, 500, 1000, 1500]}
                   tickFormatter={(v: number) => v.toLocaleString("pt-BR")}
                   tickLine={false} axisLine={false} stroke="var(--text)" />
            <Area type="monotone" dataKey="converted" name="Convertidos" stroke="#10D9A0" strokeWidth={2.5}
                  fill="url(#area-ok)" dot={{ r: 4, fill: "#10D9A0", strokeWidth: 0 }} />
            <Area type="monotone" dataKey="notConverted" name="Não convertidos" stroke="#A855F7" strokeWidth={2.5}
                  fill="url(#area-no)" dot={{ r: 4, fill: "#A855F7", strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function FactorsCard() {
  const max = Math.max(...FACTORS.map((f) => f.value));
  return (
    <section className="card">
      <div className="card-head">
        <h2><Lightbulb size={20} /> Fatores que mais influenciam</h2>
      </div>
      <ul className="factors">
        {FACTORS.map((f) => (
          <li key={f.label}>
            <span className="factor-label">{f.label}</span>
            <div className="bar-track" role="progressbar" aria-label={f.label}
                 aria-valuenow={f.value} aria-valuemin={0} aria-valuemax={100}>
              <div className="bar-fill" style={{ width: `${(f.value / max) * 100}%`, background: f.color }} />
            </div>
            <span className="factor-value">{f.value.toFixed(1).replace(".", ",")}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClassDistribution({ onDetail }: { onDetail: () => void }) {
  const total = CLASS_SPLIT.reduce((s, c) => s + c.value, 0);
  return (
    <section className="card">
      <div className="card-head">
        <h2><Target size={20} /> Distribuição da Classe-Alvo</h2>
      </div>
      <div className="donut-row">
        <div className="donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={CLASS_SPLIT} dataKey="value" innerRadius="68%" outerRadius="100%"
                   startAngle={90} endAngle={-270} stroke="none" paddingAngle={2}>
                {CLASS_SPLIT.map((c) => <Cell key={c.name} fill={c.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center">
            <strong>{total.toLocaleString("pt-BR")}</strong>
            <span>clientes</span>
          </div>
        </div>
        <ul className="split">
          {CLASS_SPLIT.map((c) => (
            <li key={c.name}>
              <i style={{ background: c.color }} />
              <span>{c.name}</span>
              <b>{c.pct}</b>
              <small>{c.value.toLocaleString("pt-BR")}</small>
            </li>
          ))}
        </ul>
      </div>
      <button type="button" className="cta" onClick={onDetail}>
        <Sparkles size={26} />
        <span>
          <strong>Quer uma análise mais detalhada?</strong>
          Pergunte ao nosso agente de IA e descubra insights personalizados para o seu negócio!
        </span>
        <ArrowRight size={18} />
      </button>
    </section>
  );
}

interface ChatProps {
  messages: ChatMessage[];
  pending: boolean;
  onSend: (text: string) => void;
}
function ChatPanel({ messages, pending, onSend }: ChatProps) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v || pending) return;
    setText("");
    onSend(v);
  };

  return (
    <aside className="chat" aria-label="Agente de IA">
      <header className="chat-head">
        <Sparkles size={24} className="chat-logo" />
        <h2>Agente de IA</h2>
        <span className="online">Online</span>
        <button type="button" className="icon-btn" aria-label="Mais opções"><MoreVertical size={18} /></button>
      </header>

      <div className="chat-log" role="log" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            <div className="bubble-body">{m.content}</div>
            <time>{m.time}</time>
          </div>
        ))}
        {pending && <div className="bubble agent typing">Analisando…</div>}
        <div ref={endRef} />
      </div>

      <form className="chat-input" onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)}
               placeholder="Digite sua pergunta aqui..." aria-label="Sua pergunta" />
        <button type="submit" className="send" aria-label="Enviar" disabled={pending}><Send size={18} /></button>
      </form>

      <p className="examples-title">Exemplos de perguntas:</p>
      <div className="examples">
        {EXAMPLES.map((e) => (
          <button key={e} type="button" className="chip" onClick={() => onSend(e)} disabled={pending}>{e}</button>
        ))}
      </div>
    </aside>
  );
}

/* ===================== Tela principal ===================== */
export default function Dashboard({ askAgent = mockAgent }: { askAgent?: AskAgent }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: "user", time: "12:41", content: "Quais fatores mais influenciam a conversão dos clientes?" },
    {
      id: 2, role: "agent", time: "12:41",
      content: (
        <>
          <p>Com base na análise dos dados, os principais fatores que influenciam a conversão são:</p>
          <ol>
            <li>Tipo de campanha (especialmente campanhas do tipo Conversion)</li>
            <li>Tempo no site (TimeOnSite)</li>
            <li>Cliques em e-mails (EmailClicks)</li>
          </ol>
          <p>Esses fatores estão diretamente ligados ao nível de engajamento do cliente com a marca.</p>
          <button type="button" className="ghost-btn"><BarChart3 size={14} /> Ver gráfico relacionado</button>
        </>
      ),
    },
  ]);
  const [pending, setPending] = useState(false);

  const send = async (question: string) => {
    const id = Date.now();
    setMessages((m) => [...m, { id, role: "user", time: nowTime(), content: question }]);
    setPending(true);
    try {
      const reply = await askAgent(question);
      setMessages((m) => [...m, { id: id + 1, role: "agent", time: nowTime(), content: reply }]);
    } catch {
      setMessages((m) => [...m, {
        id: id + 1, role: "agent", time: nowTime(),
        content: "Não consegui falar com o agente agora. Tente de novo em instantes.",
      }]);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="content">
      <main className="main">
        <div className="hello">
          <div>
            <h1>Olá, Thaís!</h1>
            <p>Aqui está um resumo do desempenho das suas campanhas e o comportamento dos seus clientes.</p>
          </div>
          <button type="button" className="date-range">
            <CalendarDays size={18} /> 01/01/2025 <ArrowRight size={14} /> 31/12/2025 <ChevronDown size={16} />
          </button>
        </div>

        <div className="kpis">{KPIS.map((k) => <KpiCard key={k.id} k={k} />)}</div>
        <div className="row two"><ChannelChart /><TimelineChart /></div>
        <div className="row two-b">
          <FactorsCard />
          <ClassDistribution onDetail={() => send("Quero uma análise mais detalhada")} />
        </div>
      </main>
      <ChatPanel messages={messages} pending={pending} onSend={send} />
    </div>
  );
}