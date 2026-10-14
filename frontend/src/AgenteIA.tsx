import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  BarChart3, Check, Copy, Database, MessageSquare, Plus, Send, Sparkles, Target, Trash2, UserX,
} from "lucide-react";
import "./AgenteIA.css";

/* ===================== Tipos ===================== */
export type ChartKey = "fatores" | "canais" | "classe";

export interface Msg {
  id: string;
  role: "user" | "agent";
  text: string;
  time: string;
  chart?: ChartKey;
  followUps?: string[];
}
interface Conversation { id: string; title: string; updatedAt: number; messages: Msg[] }

export interface AgentReply { text: string; chart?: ChartKey; followUps?: string[] }

/** Troque por uma chamada ao seu agente de IA (API). Recebe a pergunta e o histórico da conversa. */
export type AskAgent = (question: string, history: Msg[]) => Promise<AgentReply>;

/* ===================== Agente de demonstração (respostas locais do EDA) ===================== */
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

interface KbEntry { keys: string[]; reply: AgentReply }
const KB: KbEntry[] = [
  { keys: ["risco", "nao convert", "nao converte"], reply: {
    text: "Os clientes de maior risco são o grupo de 992 pessoas (12,4%) que não converteu. Pelo EDA, o que mais os separa dos demais é o baixo engajamento (menos tempo no site, menos cliques e aberturas de e-mail) e campanhas que não são do tipo Conversion. Idade, renda e gênero quase não ajudam a identificá-los.\n\nNa tela Previsão de Conversão você simula um cliente e vê quanto cada fator pesa.",
    chart: "classe", followUps: ["O que mais influencia a conversão dos clientes?", "Como a análise ajuda o marketing?"] } },
  { keys: ["prever", "previsao"], reply: {
    text: "A previsão por cliente fica na tela Previsão de Conversão: você informa os dados do cliente e recebe a chance de converter, os fatores que mais pesaram e simulações do tipo \"e se…\". Hoje ela usa uma estimativa provisória. Quando o modelo da Etapa 2 estiver conectado, passa a usar a previsão real.",
    followUps: ["Como funciona o modelo da Etapa 2?", "Quem são os clientes com maior risco de não converter?"] } },
  { keys: ["desbalance", "balance", "87,6", "12,4", "classe"], reply: {
    text: "A base está desbalanceada: 87,6% dos clientes convertem (7.008) e 12,4% não convertem (992). Como o grupo menor é o que o negócio mais precisa recuperar, o modelo da Etapa 2 deve tratar esse desbalanceamento, por exemplo com pesos de classe ou reamostragem, e ser avaliado por recall e F1 de quem não converte, não só por acurácia.",
    chart: "classe", followUps: ["Quem são os clientes com maior risco de não converter?", "Como funciona o modelo da Etapa 2?"] } },
  { keys: ["influenc", "fator", "importa", "pesa", "o que leva"], reply: {
    text: "Os fatores que mais pesam são:\n\n1. Tipo de campanha, principalmente Conversion (32,7%)\n2. Tempo no site (24,1%)\n3. Cliques em e-mails (18,6%)\n4. Aberturas de e-mail (12,3%)\n\nEm resumo, a conversão depende mais do que a empresa faz e do quanto o cliente se engaja do que de quem ele é.",
    chart: "fatores", followUps: ["O canal da campanha importa?", "Idade e renda influenciam?"] } },
  { keys: ["desempenho", "canal", "e-mail", "email", "redes sociais", "comparar", "ppc", "seo", "referral"], reply: {
    text: "A taxa de conversão fica entre 80,1% (SEO) e 89,4% (PPC) nos cinco canais. Social Media está em 85,7%, Referral em 86,2% e Email em 82,3%. A diferença entre canais é pequena perto do efeito do tipo de campanha e do engajamento.",
    chart: "canais", followUps: ["O que o tipo de campanha muda?", "O que mais influencia a conversão dos clientes?"] } },
  { keys: ["tipo de campanha", "conversion", "awareness"], reply: {
    text: "Campanhas do tipo Conversion convertem bem mais do que Awareness, Consideration e Retention. É o fator de maior peso na análise e também o que a empresa controla diretamente.",
    followUps: ["O que mais influencia a conversão dos clientes?", "Como a análise ajuda o marketing?"] } },
  { keys: ["idade", "renda", "genero", "demograf", "perfil"], reply: {
    text: "Idade, renda e gênero quase não separam quem converte de quem não converte nesta base. Por isso o perfil demográfico pesa pouco na previsão, e vale focar em engajamento e tipo de campanha.",
    followUps: ["O que mais influencia a conversão dos clientes?"] } },
  { keys: ["ausent", "duplic", "outlier", "qualidade", "limpeza", "integra"], reply: {
    text: "A base chegou íntegra: sem dados ausentes, duplicatas ou outliers. Só removemos duas colunas inúteis (AdvertisingPlatform e AdvertisingTool), com o mesmo valor em todas as linhas. Como a base é sintética e educacional, os resultados tendem a ser mais limpos do que seriam em dados reais.",
    followUps: ["Por que a base está desbalanceada?"] } },
  { keys: ["modelo", "etapa 2", "algoritmo", "recall", "f1"], reply: {
    text: "A Etapa 2 vai combinar tipo de campanha e engajamento e tratar o desbalanceamento para identificar bem quem não converte. Como a base mistura variáveis numéricas e categóricas (Gender, CampaignChannel, CampaignType), as categóricas precisam de codificação, como one-hot, antes do treino. Avalie com recall e F1 da classe que não converte.",
    followUps: ["Por que a base está desbalanceada?"] } },
  { keys: ["roi", "orcamento", "investimento", "gasto", "dinheiro", "custo", "marketing"], reply: {
    text: "Prever conversão ajuda a direcionar orçamento: se a empresa sabe quem tem baixa chance de converter, pode ajustar o tipo de campanha e o investimento em anúncios, reduzir o custo de aquisição e aumentar o ROI. A base tem a coluna AdSpend, que permite aprofundar essa análise.",
    followUps: ["O que mais influencia a conversão dos clientes?"] } },
];

const SUGGESTIONS = [
  { icon: <Target size={20} />, title: "Prever conversão", desc: "O que leva um cliente a converter", q: "O que mais influencia a conversão dos clientes?" },
  { icon: <BarChart3 size={20} />, title: "Comparar campanhas", desc: "Desempenho por canal", q: "Como está o desempenho das campanhas por canal?" },
  { icon: <UserX size={20} />, title: "Analisar clientes de risco", desc: "Quem tende a não converter", q: "Quem são os clientes com maior risco de não converter?" },
  { icon: <Database size={20} />, title: "Entender a base", desc: "Desbalanceamento e qualidade dos dados", q: "Por que a base está desbalanceada?" },
];

const localAgent: AskAgent = async (question) => {
  await new Promise((r) => setTimeout(r, 800));
  const s = norm(question);
  const hit = KB.find((e) => e.keys.some((k) => s.includes(norm(k))));
  if (hit) return hit.reply;
  return {
    text: "Posso explicar o desbalanceamento da base, os fatores que mais influenciam a conversão, o desempenho por canal, o perfil dos clientes de risco e o modelo da Etapa 2. Sobre o que você quer saber?",
    followUps: SUGGESTIONS.map((x) => x.q).slice(0, 3),
  };
};

/* ===================== Gráficos dentro das respostas ===================== */
const FACTORS = [
  { name: "Tipo de campanha", value: 32.7, color: "#10D9A0" },
  { name: "Tempo no site", value: 24.1, color: "#3B82F6" },
  { name: "Cliques em e-mail", value: 18.6, color: "#A855F7" },
  { name: "Aberturas de e-mail", value: 12.3, color: "#FDBA5A" },
  { name: "Outros fatores", value: 8.3, color: "#7C8AA5" },
];
const CHANNELS = [
  { name: "Email", value: 82.3, color: "#A855F7" },
  { name: "Social", value: 85.7, color: "#3B82F6" },
  { name: "SEO", value: 80.1, color: "#10D9A0" },
  { name: "PPC", value: 89.4, color: "#FDBA5A" },
  { name: "Referral", value: 86.2, color: "#F472B6" },
];
const CLASSES = [
  { name: "Converteram", value: 7008, label: "87,6%", color: "#10D9A0" },
  { name: "Não converteram", value: 992, label: "12,4%", color: "#A855F7" },
];
const pct1 = (v: unknown) => `${Number(v).toFixed(1).replace(".", ",")}%`;

function ChartBlock({ kind }: { kind: ChartKey }) {
  if (kind === "fatores")
    return (
      <figure className="ag-chart">
        <figcaption>Fatores que mais influenciam a conversão</figcaption>
        <div style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={FACTORS} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
              <XAxis type="number" hide domain={[0, 40]} />
              <YAxis type="category" dataKey="name" width={124} tickLine={false} axisLine={false} stroke="var(--text)" />
              <Bar dataKey="value" radius={4} barSize={14}>
                {FACTORS.map((f) => <Cell key={f.name} fill={f.color} />)}
                <LabelList dataKey="value" position="right" fill="var(--text)" formatter={pct1} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>
    );

  if (kind === "canais")
    return (
      <figure className="ag-chart">
        <figcaption>Taxa de conversão por canal</figcaption>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CHANNELS} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="var(--text)" />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(v: number) => `${v}%`} tickLine={false} axisLine={false} stroke="var(--text)" />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {CHANNELS.map((c) => <Cell key={c.name} fill={c.color} />)}
                <LabelList dataKey="value" position="top" fill="var(--text)" formatter={pct1} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>
    );

  return (
    <figure className="ag-chart">
      <figcaption>Distribuição da classe-alvo</figcaption>
      <div className="ag-donut-row">
        <div className="ag-donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={CLASSES} dataKey="value" innerRadius="68%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none" paddingAngle={2}>
                {CLASSES.map((c) => <Cell key={c.name} fill={c.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="ag-donut-center"><strong>8.000</strong><span>clientes</span></div>
        </div>
        <ul className="ag-legend">
          {CLASSES.map((c) => (
            <li key={c.name}>
              <i style={{ background: c.color }} />
              <span>{c.name}</span>
              <b>{c.label}</b>
              <small>{c.value.toLocaleString("pt-BR")}</small>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

/* ===================== Utilidades ===================== */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const nowTime = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const STORAGE_KEY = "converta-ai:conversas";
function loadConvs(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? (data as Conversation[]).sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

type Group = "Hoje" | "Ontem" | "Anteriores";
const GROUPS: Group[] = ["Hoje", "Ontem", "Anteriores"];
function groupOf(ts: number): Group {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (ts >= start.getTime()) return "Hoje";
  if (ts >= start.getTime() - 86_400_000) return "Ontem";
  return "Anteriores";
}

/** Converte o texto da resposta em parágrafos e listas. */
function renderText(text: string): ReactNode {
  return text.split("\n\n").map((block, i) => {
    const lines = block.split("\n");
    if (lines.every((l) => /^\d+\.\s/.test(l)))
      return <ol key={i}>{lines.map((l, j) => <li key={j}>{l.replace(/^\d+\.\s/, "")}</li>)}</ol>;
    if (lines.every((l) => l.startsWith("- ")))
      return <ul key={i}>{lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
    // O texto introdutório de uma lista numerada vem junto no mesmo bloco? Aqui cada bloco é independente.
    return <p key={i}>{block}</p>;
  });
}

/* ===================== Tela ===================== */
export default function AgenteIA({ askAgent = localAgent }: { askAgent?: AskAgent }) {
  const [convs, setConvs] = useState<Conversation[]>(loadConvs);
  const [activeId, setActiveId] = useState<string | null>(() => loadConvs()[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const active = convs.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];
  const lastAgent = [...messages].reverse().find((m) => m.role === "agent");

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convs)); } catch { /* armazenamento indisponível */ }
  }, [convs]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending, activeId]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  const addMsg = (cid: string, m: Msg) =>
    setConvs((prev) => prev.map((c) => (c.id === cid ? { ...c, updatedAt: Date.now(), messages: [...c.messages, m] } : c)));

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || pending) return;

    const userMsg: Msg = { id: uid(), role: "user", text, time: nowTime() };
    const existing = convs.find((c) => c.id === activeId);
    const convId = existing ? existing.id : uid();
    const history = [...(existing?.messages ?? []), userMsg];

    if (existing) {
      addMsg(convId, userMsg);
    } else {
      const conv: Conversation = { id: convId, title: text.length > 44 ? `${text.slice(0, 44)}…` : text, updatedAt: Date.now(), messages: [userMsg] };
      setConvs((prev) => [conv, ...prev]);
      setActiveId(convId);
    }

    setDraft("");
    setPending(true);
    try {
      const reply = await askAgent(text, history);
      addMsg(convId, { id: uid(), role: "agent", time: nowTime(), ...reply });
    } catch {
      addMsg(convId, { id: uid(), role: "agent", time: nowTime(), text: "Não consegui falar com o agente agora. Tente de novo em instantes." });
    } finally {
      setPending(false);
    }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(draft); };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(draft); }
  };

  const newChat = () => { setActiveId(null); setHistoryOpen(false); areaRef.current?.focus(); };
  const openChat = (id: string) => { setActiveId(id); setHistoryOpen(false); };
  const remove = (id: string) => {
    setConvs((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) setActiveId(null);
  };
  const copy = async (m: Msg) => {
    try {
      await navigator.clipboard.writeText(m.text);
      setCopied(m.id);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* sem permissão para copiar */ }
  };

  return (
    <div className="ag-page">
      {/* ----- Histórico ----- */}
      <aside className={`ag-history${historyOpen ? " open" : ""}`} aria-label="Histórico de conversas">
        <button type="button" className="btn-primary ag-new" onClick={newChat}>
          <Plus size={18} /> Nova conversa
        </button>

        {convs.length === 0 && <p className="ag-hint">Suas conversas com o agente aparecem aqui.</p>}

        {GROUPS.map((g) => {
          const items = convs.filter((c) => groupOf(c.updatedAt) === g);
          if (items.length === 0) return null;
          return (
            <div key={g} className="ag-group">
              <h2>{g}</h2>
              <ul>
                {items.map((c) => (
                  <li key={c.id} className={c.id === activeId ? "current" : undefined}>
                    <button type="button" className="ag-item" onClick={() => openChat(c.id)} aria-current={c.id === activeId ? "true" : undefined}>
                      {c.title}
                    </button>
                    <button type="button" className="ag-del" aria-label={`Apagar conversa: ${c.title}`} onClick={() => remove(c.id)}>
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </aside>

      {/* ----- Chat ----- */}
      <section className="ag-main" aria-label="Conversa com o agente">
        <header className="ag-head">
          <button type="button" className="icon-btn ag-toggle" aria-label="Conversas" aria-expanded={historyOpen} onClick={() => setHistoryOpen((o) => !o)}>
            <MessageSquare size={20} />
          </button>
          <Sparkles size={24} className="ag-logo" />
          <h1>Agente de IA</h1>
          <span className="online">Online</span>
          {active && <span className="ag-title" title={active.title}>{active.title}</span>}
        </header>

        <div className="ag-log" role="log" aria-live="polite">
          {messages.length === 0 && (
            <div className="ag-welcome">
              <Sparkles size={34} className="ag-logo" />
              <h2>Como posso ajudar, Thaís?</h2>
              <p>Pergunte sobre a base de 8.000 clientes, os fatores de conversão, o desempenho das campanhas ou os clientes de risco.</p>
              <div className="ag-cards">
                {SUGGESTIONS.map((s) => (
                  <button key={s.title} type="button" className="ag-card" onClick={() => void send(s.q)}>
                    {s.icon}
                    <strong>{s.title}</strong>
                    <span>{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <article key={m.id} className={`ag-msg ${m.role}`}>
              <div className="ag-bubble">
                {m.role === "agent" ? renderText(m.text) : <p>{m.text}</p>}
                {m.chart && <ChartBlock kind={m.chart} />}
              </div>
              <div className="ag-meta">
                <time>{m.time}</time>
                {m.role === "agent" && (
                  <button type="button" className="ag-copy" onClick={() => void copy(m)}>
                    {copied === m.id ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                  </button>
                )}
              </div>
            </article>
          ))}

          {pending && (
            <div className="ag-msg agent" aria-label="O agente está digitando">
              <div className="ag-bubble ag-typing"><i /><i /><i /></div>
            </div>
          )}

          {!pending && lastAgent?.followUps && messages[messages.length - 1]?.id === lastAgent.id && (
            <div className="ag-follow" aria-label="Perguntas sugeridas">
              {lastAgent.followUps.map((q) => (
                <button key={q} type="button" className="chip" onClick={() => void send(q)}>{q}</button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="ag-composer" onSubmit={onSubmit}>
          <div className="ag-input">
            <textarea ref={areaRef} rows={1} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown}
                      placeholder="Digite sua pergunta aqui…" aria-label="Sua pergunta" />
            <button type="submit" className="send" aria-label="Enviar" disabled={pending || !draft.trim()}>
              <Send size={18} />
            </button>
          </div>
          <p className="ag-disclaimer">Enter envia, Shift + Enter quebra a linha. Confira os números antes de usá-los em uma apresentação.</p>
        </form>
      </section>
    </div>
  );
}