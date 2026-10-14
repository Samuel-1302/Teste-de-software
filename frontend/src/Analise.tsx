import { useState, type ReactNode } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Database, Info, Lightbulb, Mail, Target, TrendingUp, Users } from "lucide-react";
import "./Analise.css";

/* ===================== Tipos ===================== */
type Tone = "finding" | "action" | "warn";
interface Insight { tone: Tone; icon: ReactNode; title: string; text: string }

/** Matriz de confusão do modelo da Etapa 2. A classe positiva é "NÃO converte". */
export interface Confusion {
  tp: number; // não converte e o modelo previu "não converte" (acerto)
  fn: number; // não converte e o modelo previu "converte" (cliente de risco que passou)
  fp: number; // converte e o modelo previu "não converte" (alarme falso)
  tn: number; // converte e o modelo previu "converte" (acerto)
}

/* ===================== Conteúdo (achados do EDA) ===================== */
const STATS = [
  { value: "8.000", label: "clientes analisados" },
  { value: "87,6%", label: "convertem", tone: "ok" },
  { value: "12,4%", label: "não convertem", tone: "no" },
  { value: "2", label: "colunas removidas (valor único)" },
];

const FINDINGS: Insight[] = [
  { tone: "finding", icon: <Database size={20} />, title: "Base íntegra",
    text: "Sem dados ausentes, duplicatas ou outliers. Só removemos AdvertisingPlatform e AdvertisingTool, que tinham o mesmo valor em todas as linhas." },
  { tone: "finding", icon: <Target size={20} />, title: "Alvo desbalanceado",
    text: "87,6% convertem e 12,4% não convertem. O grupo menor é justamente o que o negócio mais precisa recuperar." },
  { tone: "finding", icon: <TrendingUp size={20} />, title: "O que a empresa faz pesa mais",
    text: "Campanhas do tipo Conversion convertem bem mais do que as demais." },
  { tone: "finding", icon: <Mail size={20} />, title: "Engajamento separa os grupos",
    text: "Tempo no site, cliques e aberturas de e-mail ficam mais altos em quem converte." },
  { tone: "finding", icon: <Users size={20} />, title: "Quem o cliente é pesa pouco",
    text: "Idade, renda, gênero e canal da campanha quase não influenciam a conversão." },
  { tone: "warn", icon: <Info size={20} />, title: "Cuidado com a base sintética",
    text: "Os dados foram criados para fins educacionais, então os resultados tendem a ser mais limpos do que em dados reais. As relações encontradas são associações, não prova de causa." },
];

const ACTIONS: Insight[] = [
  { tone: "action", icon: <TrendingUp size={20} />, title: "Priorizar campanhas do tipo Conversion",
    text: "É o fator de maior peso e o que a empresa controla diretamente." },
  { tone: "action", icon: <Mail size={20} />, title: "Reengajar por e-mail",
    text: "Estimular cliques, aberturas e retorno ao site de clientes com baixo engajamento." },
  { tone: "action", icon: <Users size={20} />, title: "Segmentar por comportamento, não por perfil",
    text: "Como idade, renda e gênero pesam pouco, o comportamento do cliente é um critério melhor para dividir públicos." },
  { tone: "action", icon: <Target size={20} />, title: "Usar o modelo para direcionar orçamento",
    text: "Com a chance de não converter por cliente, dá para ajustar o investimento em anúncios (AdSpend) e reduzir o custo de aquisição." },
];

/* Importância relativa exibida no dashboard. Troque pelos valores reais do seu modelo. */
const FACTORS = [
  { name: "Tipo de campanha", value: 32.7, color: "#10D9A0" },
  { name: "Tempo no site", value: 24.1, color: "#3B82F6" },
  { name: "Cliques em e-mail", value: 18.6, color: "#A855F7" },
  { name: "Aberturas de e-mail", value: 12.3, color: "#FDBA5A" },
  { name: "Outros fatores", value: 8.3, color: "#7C8AA5" },
];

/* Valores ilustrativos, só para pré-visualizar o layout (conjunto de teste hipotético de 1.600 clientes). */
const DEMO_CONFUSION: Confusion = { tp: 150, fn: 48, fp: 120, tn: 1282 };

/* ===================== Utilidades ===================== */
const div = (a: number, b: number) => (b === 0 ? 0 : a / b);
const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;
const int = (v: number) => v.toLocaleString("pt-BR");

function metricsOf(c: Confusion) {
  const precision = div(c.tp, c.tp + c.fp);
  const recall = div(c.tp, c.tp + c.fn);
  return {
    recall,
    precision,
    f1: div(2 * precision * recall, precision + recall),
    accuracy: div(c.tp + c.tn, c.tp + c.fn + c.fp + c.tn),
    total: c.tp + c.fn + c.fp + c.tn,
  };
}

function InsightCard({ i }: { i: Insight }) {
  return (
    <article className={`an-insight ${i.tone}`}>
      <div className="an-icon">{i.icon}</div>
      <h3>{i.title}</h3>
      <p>{i.text}</p>
    </article>
  );
}

/* ===================== Tela ===================== */
export default function Analises({ confusion }: { confusion?: Confusion }) {
  const [preview, setPreview] = useState(false);
  const conf = confusion ?? (preview ? DEMO_CONFUSION : null);
  const m = conf ? metricsOf(conf) : null;

  return (
    <div className="an-page">
      <div className="an-head">
        <h1>Análises e Insights</h1>
        <p>O que a análise dos 8.000 clientes revela sobre a conversão e o que a empresa pode fazer com isso.</p>
      </div>

      <div className="an-stats">
        {STATS.map((s) => (
          <div key={s.label} className={`an-stat ${s.tone ?? ""}`}>
            <b>{s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <section aria-labelledby="an-achados">
        <h2 id="an-achados" className="an-title">Principais achados</h2>
        <div className="an-grid3">
          {FINDINGS.map((f) => <InsightCard key={f.title} i={f} />)}
        </div>
      </section>

      <div className="an-grid2">
        <section className="card" aria-labelledby="an-fatores">
          <div className="card-head"><h2 id="an-fatores"><Lightbulb size={20} /> O que mais influencia a conversão</h2></div>
          <div className="an-chart" style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FACTORS} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
                <XAxis type="number" hide domain={[0, 40]} />
                <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} stroke="var(--text)" />
                <Bar dataKey="value" radius={4} barSize={16}>
                  {FACTORS.map((f) => <Cell key={f.name} fill={f.color} />)}
                  <LabelList dataKey="value" position="right" fill="var(--text)"
                             formatter={(v: unknown) => `${Number(v).toFixed(1).replace(".", ",")}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="an-note">Importância relativa mostrada no painel. Atualize com a importância das variáveis do modelo da Etapa 2.</p>
        </section>

        <section className="card" aria-labelledby="an-balanco">
          <div className="card-head"><h2 id="an-balanco"><Target size={20} /> Balanço da classe-alvo</h2></div>
          <div className="an-balance" role="img" aria-label="87,6% convertem e 12,4% não convertem">
            <div className="an-seg ok" style={{ width: "87.6%" }}>87,6%</div>
            <div className="an-seg no" style={{ width: "12.4%" }} />
          </div>
          <ul className="an-balance-legend">
            <li><i className="ok" />Converteram <b>7.008</b></li>
            <li><i className="no" />Não converteram <b>992</b> <span>(12,4%)</span></li>
          </ul>
          <div className="an-callout">
            <strong>Por que não basta olhar a acurácia</strong>
            <p>Um modelo que sempre prevê "converte" acerta 87,6% e não encontra nenhum cliente que não converte. Por isso a Etapa 2 deve ser avaliada por recall e F1 da classe que não converte.</p>
          </div>
        </section>
      </div>

      <section className="card" aria-labelledby="an-modelo">
        <div className="card-head">
          <h2 id="an-modelo"><TrendingUp size={20} /> Desempenho do modelo (Etapa 2)</h2>
          {!confusion && (
            <button type="button" className="chip" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
              {preview ? "Ocultar exemplo" : "Pré-visualizar com valores de exemplo"}
            </button>
          )}
        </div>

        {!conf || !m ? (
          <div className="an-empty">
            <TrendingUp size={30} />
            <h3>Aguardando o modelo da Etapa 2</h3>
            <p>Quando o modelo estiver treinado, passe a matriz de confusão para este componente e as métricas aparecem aqui.</p>
          </div>
        ) : (
          <>
            {!confusion && <p className="an-badge">Valores ilustrativos, não são resultados reais</p>}
            <div className="an-metrics">
              <div className="an-metric main"><b>{pct(m.recall)}</b><span>Recall de quem não converte</span><small>dos que não convertem, quantos o modelo achou</small></div>
              <div className="an-metric main"><b>{pct(m.f1)}</b><span>F1 de quem não converte</span><small>equilíbrio entre recall e precisão</small></div>
              <div className="an-metric"><b>{pct(m.precision)}</b><span>Precisão</span><small>dos alertas, quantos eram certos</small></div>
              <div className="an-metric"><b>{pct(m.accuracy)}</b><span>Acurácia</span><small>engana em base desbalanceada</small></div>
            </div>

            <div className="an-matrix" role="table" aria-label="Matriz de confusão">
              <div className="corner" role="presentation" />
              <div className="colh" role="columnheader">Previsto: não converte</div>
              <div className="colh" role="columnheader">Previsto: converte</div>
              <div className="rowh" role="rowheader">Real: não converte</div>
              <div className="cell good" role="cell"><b>{int(conf.tp)}</b><span>acertos</span></div>
              <div className="cell bad" role="cell"><b>{int(conf.fn)}</b><span>clientes de risco que passaram</span></div>
              <div className="rowh" role="rowheader">Real: converte</div>
              <div className="cell warn" role="cell"><b>{int(conf.fp)}</b><span>alarmes falsos</span></div>
              <div className="cell good" role="cell"><b>{int(conf.tn)}</b><span>acertos</span></div>
            </div>
            <p className="an-note">Conjunto de teste com {int(m.total)} clientes. A classe positiva é "não converte".</p>
          </>
        )}
      </section>

      <section aria-labelledby="an-acoes">
        <h2 id="an-acoes" className="an-title">O que a empresa pode fazer</h2>
        <div className="an-grid4">
          {ACTIONS.map((a) => <InsightCard key={a.title} i={a} />)}
        </div>
      </section>
    </div>
  );
}