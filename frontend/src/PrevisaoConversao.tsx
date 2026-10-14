import { useState, type FormEvent } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Lightbulb, RotateCcw, Sparkles, Target, UserCheck, UserX } from "lucide-react";
import "./PrevisaoConversao.css";

/* ===================== Tipos (espelham as colunas da base) ===================== */
export type CampaignType = "Awareness" | "Consideration" | "Conversion" | "Retention";
export type Channel = "Email" | "Social Media" | "SEO" | "PPC" | "Referral";

export interface Customer {
  Age: number;
  Gender: "Female" | "Male";
  Income: number;
  CampaignChannel: Channel;
  CampaignType: CampaignType;
  AdSpend: number;
  ClickThroughRate: number;   // fração: 0,15 = 15%
  ConversionRate: number;     // fração: 0,05 = 5%
  WebsiteVisits: number;
  PagesPerVisit: number;
  TimeOnSite: number;         // minutos
  SocialShares: number;
  EmailOpens: number;
  EmailClicks: number;
  PreviousPurchases: number;
  LoyaltyPoints: number;
}

export interface Factor { label: string; delta: number }
export interface Prediction { pNotConvert: number; factors: Factor[] }

/** Contrato para ligar o modelo da Etapa 2: recebe o cliente, devolve a chance de NÃO converter (0 a 1). */
export type Predictor = (customer: Customer) => Promise<Prediction>;

/* ===================== Modelo provisório (substituir pelo da Etapa 2) ===================== */
const BASE_NOT_CONVERT = 0.124;
const fmtNum = (n: number) => String(n).replace(".", ",");

export function estimate(c: Customer): Prediction {
  const typeDelta: Record<CampaignType, number> = {
    Conversion: -0.9, Retention: 0.2, Consideration: 0.25, Awareness: 0.35,
  };
  const all: Factor[] = [
    { label: `Tipo de campanha: ${c.CampaignType}`, delta: typeDelta[c.CampaignType] },
    { label: `Tempo no site (${fmtNum(c.TimeOnSite)} min)`, delta: -((c.TimeOnSite - 7.5) / 7.5) * 0.8 },
    { label: `Cliques em e-mail (${c.EmailClicks})`, delta: -((c.EmailClicks - 5) / 5) * 0.5 },
    { label: `Aberturas de e-mail (${c.EmailOpens})`, delta: -((c.EmailOpens - 10) / 10) * 0.4 },
    { label: `Visitas ao site (${c.WebsiteVisits})`, delta: -((c.WebsiteVisits - 25) / 25) * 0.15 },
  ];
  const z = Math.log(BASE_NOT_CONVERT / (1 - BASE_NOT_CONVERT)) + all.reduce((s, f) => s + f.delta, 0);
  return {
    pNotConvert: 1 / (1 + Math.exp(-z)),
    factors: all.filter((f) => Math.abs(f.delta) > 0.05).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
  };
}
const localPredictor: Predictor = async (c) => estimate(c);

/* ===================== Formulário ===================== */
const CAMPAIGN_TYPES: CampaignType[] = ["Awareness", "Consideration", "Conversion", "Retention"];
const CHANNELS: Channel[] = ["Email", "Social Media", "SEO", "PPC", "Referral"];

type NumKey = { [K in keyof Customer]: Customer[K] extends number ? K : never }[keyof Customer];
interface SliderDef {
  key: NumKey; label: string; min: number; max: number; step: number; fmt: (v: number) => string;
}
interface GroupDef { id: "campanha" | "engajamento" | "historico" | "perfil"; title: string; hint?: string; sliders: SliderDef[] }

const int = (v: number) => v.toLocaleString("pt-BR");
const percent = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;

/* Faixas aproximadas da base: confira com o describe() do seu EDA e ajuste min/max. */
const GROUPS: GroupDef[] = [
  { id: "campanha", title: "Campanha", sliders: [
    { key: "AdSpend", label: "Gasto com anúncios (US$)", min: 100, max: 10000, step: 100, fmt: (v) => `US$ ${int(v)}` },
    { key: "ClickThroughRate", label: "Taxa de cliques", min: 0.01, max: 0.3, step: 0.005, fmt: percent },
    { key: "ConversionRate", label: "Taxa de conversão dos cliques", min: 0.01, max: 0.1, step: 0.005, fmt: percent },
  ]},
  { id: "engajamento", title: "Engajamento", hint: "é o que mais pesa", sliders: [
    { key: "TimeOnSite", label: "Tempo no site", min: 0.5, max: 15, step: 0.5, fmt: (v) => `${fmtNum(v)} min` },
    { key: "EmailClicks", label: "Cliques em e-mail", min: 0, max: 10, step: 1, fmt: int },
    { key: "EmailOpens", label: "Aberturas de e-mail", min: 0, max: 20, step: 1, fmt: int },
    { key: "WebsiteVisits", label: "Visitas ao site", min: 0, max: 50, step: 1, fmt: int },
    { key: "PagesPerVisit", label: "Páginas por visita", min: 1, max: 10, step: 0.5, fmt: (v) => fmtNum(v) },
    { key: "SocialShares", label: "Compartilhamentos", min: 0, max: 100, step: 1, fmt: int },
  ]},
  { id: "historico", title: "Histórico", sliders: [
    { key: "PreviousPurchases", label: "Compras anteriores", min: 0, max: 9, step: 1, fmt: int },
    { key: "LoyaltyPoints", label: "Pontos de fidelidade", min: 0, max: 5000, step: 50, fmt: int },
  ]},
  { id: "perfil", title: "Perfil", hint: "pouca influência na conversão", sliders: [
    { key: "Age", label: "Idade", min: 18, max: 69, step: 1, fmt: (v) => `${v} anos` },
    { key: "Income", label: "Renda anual (US$)", min: 20000, max: 150000, step: 1000, fmt: (v) => `US$ ${int(v)}` },
  ]},
];

const DEFAULT_CUSTOMER: Customer = {
  Age: 43, Gender: "Female", Income: 85000, CampaignChannel: "Email", CampaignType: "Conversion",
  AdSpend: 5000, ClickThroughRate: 0.15, ConversionRate: 0.05, WebsiteVisits: 25, PagesPerVisit: 5,
  TimeOnSite: 7.5, SocialShares: 50, EmailOpens: 10, EmailClicks: 5, PreviousPurchases: 4, LoyaltyPoints: 2500,
};
const ENGAGED: Customer = {
  ...DEFAULT_CUSTOMER, CampaignType: "Conversion", TimeOnSite: 12, EmailClicks: 8, EmailOpens: 16, WebsiteVisits: 35,
};
const AT_RISK: Customer = {
  ...DEFAULT_CUSTOMER, CampaignType: "Awareness", CampaignChannel: "Social Media",
  TimeOnSite: 2, EmailClicks: 1, EmailOpens: 3, WebsiteVisits: 6, PagesPerVisit: 2,
};

/* ===================== Resultado ===================== */
const pct = (p: number) => `${(p * 100).toFixed(1).replace(".", ",")}%`;

interface Level { text: string; css: string; reco: string }
function level(p: number): Level {
  if (p < 0.08) return { text: "Risco baixo", css: "lvl-good",
    reco: "Cliente com boa chance de converter. Mantenha a abordagem atual e evite gastar verba extra aqui." };
  if (p < 0.18) return { text: "Risco médio", css: "lvl-mid",
    reco: "Risco parecido com o da base. Um empurrão de engajamento, como e-mail com clique ou retorno ao site, já ajuda." };
  if (p < 0.35) return { text: "Risco elevado", css: "lvl-warn",
    reco: "Vale priorizar este perfil: migrar para uma campanha do tipo Conversion e estimular cliques em e-mail tende a reduzir o risco." };
  return { text: "Risco alto", css: "lvl-high",
    reco: "Alta chance de não converter. É o grupo que o negócio mais precisa recuperar: teste campanha Conversion e reengajamento por e-mail." };
}

interface Scenario { label: string; customer: Customer }
function buildScenarios(c: Customer): Scenario[] {
  const list: Scenario[] = [];
  if (c.CampaignType !== "Conversion")
    list.push({ label: "Mudar para campanha Conversion", customer: { ...c, CampaignType: "Conversion" } });
  if (c.EmailClicks < 10)
    list.push({ label: "Mais 3 cliques em e-mail", customer: { ...c, EmailClicks: Math.min(10, c.EmailClicks + 3) } });
  if (c.TimeOnSite < 15)
    list.push({ label: "50% mais tempo no site", customer: { ...c, TimeOnSite: Math.min(15, c.TimeOnSite * 1.5) } });
  if (c.EmailOpens < 20)
    list.push({ label: "Mais 5 aberturas de e-mail", customer: { ...c, EmailOpens: Math.min(20, c.EmailOpens + 5) } });
  return list.slice(0, 3);
}

interface Result {
  pred: Prediction;
  scenarios: { label: string; p: number }[];
}

/* ===================== Tela ===================== */
export default function PrevisaoConversao({ predict = localPredictor }: { predict?: Predictor }) {
  const [c, setC] = useState<Customer>(DEFAULT_CUSTOMER);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setNum = (key: NumKey, value: number) => setC((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const scen = buildScenarios(c);
      const [main, ...rest] = await Promise.all([predict(c), ...scen.map((s) => predict(s.customer))]);
      setResult({ pred: main, scenarios: scen.map((s, i) => ({ label: s.label, p: rest[i].pNotConvert })) });
    } catch {
      setError("Não foi possível calcular a previsão. Tente de novo em instantes.");
    } finally {
      setLoading(false);
    }
  };

  const load = (preset: Customer) => { setC(preset); setResult(null); setError(null); };

  return (
    <div className="pv-page">
      <div className="pv-head">
        <div>
          <h1>Previsão de Conversão</h1>
          <p>Preencha os dados de um cliente e veja a chance de ele converter, o que mais pesou e o que fazer para melhorar.</p>
        </div>
        <div className="pv-presets" role="group" aria-label="Exemplos prontos">
          <button type="button" className="chip" onClick={() => load(ENGAGED)}>Cliente engajado</button>
          <button type="button" className="chip" onClick={() => load(AT_RISK)}>Cliente em risco</button>
          <button type="button" className="chip" onClick={() => load(DEFAULT_CUSTOMER)}>
            <RotateCcw size={14} /> Restaurar
          </button>
        </div>
      </div>

      <div className="pv-grid">
        {/* ----- Formulário ----- */}
        <form className="card pv-form" onSubmit={onSubmit}>
          <div className="card-head"><h2><Target size={20} /> Dados do cliente</h2></div>

          {GROUPS.map((g) => (
            <fieldset key={g.id} className="pv-group">
              <legend>{g.title}{g.hint && <small> {g.hint}</small>}</legend>
              <div className="pv-fields">
                {g.id === "campanha" && (
                  <>
                    <div className="pv-f">
                      <label htmlFor="pv-type">Tipo de campanha</label>
                      <select id="pv-type" value={c.CampaignType}
                              onChange={(e) => setC((p) => ({ ...p, CampaignType: e.target.value as CampaignType }))}>
                        {CAMPAIGN_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="pv-f">
                      <label htmlFor="pv-channel">Canal</label>
                      <select id="pv-channel" value={c.CampaignChannel}
                              onChange={(e) => setC((p) => ({ ...p, CampaignChannel: e.target.value as Channel }))}>
                        {CHANNELS.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {g.sliders.map((s) => (
                  <div className="pv-f" key={s.key}>
                    <label htmlFor={`pv-${s.key}`}>
                      {s.label}<output>{s.fmt(c[s.key])}</output>
                    </label>
                    <input id={`pv-${s.key}`} type="range" min={s.min} max={s.max} step={s.step}
                           value={c[s.key]} onChange={(e) => setNum(s.key, Number(e.target.value))} />
                  </div>
                ))}

                {g.id === "perfil" && (
                  <div className="pv-f">
                    <label htmlFor="pv-gender">Gênero</label>
                    <select id="pv-gender" value={c.Gender}
                            onChange={(e) => setC((p) => ({ ...p, Gender: e.target.value as Customer["Gender"] }))}>
                      <option value="Female">Feminino</option>
                      <option value="Male">Masculino</option>
                    </select>
                  </div>
                )}
              </div>
            </fieldset>
          ))}

          <button type="submit" className="btn-primary pv-submit" disabled={loading}>
            <Sparkles size={18} /> {loading ? "Calculando…" : "Prever conversão"}
          </button>
          <p className="pv-note">
            Enquanto o modelo da Etapa 2 não estiver conectado, a previsão usa uma estimativa provisória baseada no EDA:
            tipo de campanha e engajamento pesam, e o perfil demográfico quase não muda o resultado.
          </p>
        </form>

        {/* ----- Resultado ----- */}
        <section className="card pv-result" aria-live="polite" aria-label="Resultado da previsão">
          {error && <p className="pv-error" role="alert">{error}</p>}

          {!result && !error && (
            <div className="pv-empty">
              <Target size={34} />
              <h2>Nenhuma previsão ainda</h2>
              <p>Ajuste os dados do cliente ao lado, ou escolha um exemplo pronto, e clique em <b>Prever conversão</b>.</p>
            </div>
          )}

          {result && (() => {
            const pNot = result.pred.pNotConvert;
            const pConv = 1 - pNot;
            const L = level(pNot);
            const donut = [
              { name: "Converte", value: pConv, color: "#10D9A0" },
              { name: "Não converte", value: pNot, color: "#A855F7" },
            ];
            return (
              <>
                <div className="card-head"><h2><Lightbulb size={20} /> Resultado</h2>
                  <span className={`pv-tag ${L.css}`}>{L.text}</span>
                </div>

                <div className="pv-donut-row">
                  <div className="pv-donut">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donut} dataKey="value" innerRadius="70%" outerRadius="100%"
                             startAngle={90} endAngle={-270} stroke="none" paddingAngle={2}>
                          {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pv-donut-center">
                      <strong>{pct(pConv)}</strong>
                      <span>chance de converter</span>
                    </div>
                  </div>
                  <ul className="pv-split">
                    <li><UserCheck size={18} className="ok" /><span>Converte</span><b>{pct(pConv)}</b></li>
                    <li><UserX size={18} className="no" /><span>Não converte</span><b>{pct(pNot)}</b></li>
                    <li className="pv-base">Média da base: 12,4% não convertem</li>
                  </ul>
                </div>

                <p className="pv-reco">{L.reco}</p>

                <h3 className="pv-sub">O que mais pesou neste cliente</h3>
                <ul className="pv-factors">
                  {result.pred.factors.length === 0 && <li><span>Nenhum fator se afasta do cliente médio.</span></li>}
                  {result.pred.factors.slice(0, 4).map((f) => (
                    <li key={f.label}>
                      <span>{f.label}</span>
                      <b className={f.delta > 0 ? "up" : "down"}>{f.delta > 0 ? "aumenta o risco" : "reduz o risco"}</b>
                    </li>
                  ))}
                </ul>

                {result.scenarios.length > 0 && (
                  <>
                    <h3 className="pv-sub">E se…? Risco de não converter</h3>
                    <ul className="pv-scen">
                      {result.scenarios.map((s) => {
                        const diff = s.p - pNot;
                        return (
                          <li key={s.label}>
                            <span>{s.label}</span>
                            <span className="pv-from-to">{pct(pNot)} → {pct(s.p)}</span>
                            <b className={diff < 0 ? "down" : "up"}>
                              {diff < 0 ? "−" : "+"}{(Math.abs(diff) * 100).toFixed(1).replace(".", ",")} p.p.
                            </b>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            );
          })()}
        </section>
      </div>
    </div>
  );
}