import type { ReactNode } from "react";
import {
  BarChart3, ChevronDown, Home, Lightbulb, MessageSquare, Search, Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "./Dashboard.css";

/** Telas já implementadas. Para criar uma nova, adicione o nome aqui e um item em NAV. */
export type Page = "inicio" | "previsao" | "agente" | "analises";

interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Sem `page` = tela ainda não criada (item aparece desativado). */
  page?: Page;
}

const NAV: NavItem[] = [
  { label: "Início", icon: Home, page: "inicio" },
  { label: "Previsão de Conversão", icon: Target, page: "previsao" },
  { label: "Agente de IA", icon: MessageSquare, page: "agente" },
  { label: "Análises e Insights", icon: Lightbulb, page: "analises" },
];

interface ShellProps {
  page: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

export default function Shell({ page, onNavigate, children }: ShellProps) {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <BarChart3 size={30} className="logo-mark" />
          <div>
            <strong>Converta <span>AI</span></strong>
            <small>Marketing Intelligence</small>
          </div>
        </div>

        <nav aria-label="Navegação principal">
          {NAV.map(({ label, icon: Icon, page: target }) => {
            const active = target === page;
            return (
              <button
                key={label}
                type="button"
                className={`nav-item${active ? " active" : ""}${target ? "" : " soon"}`}
                aria-current={active ? "page" : undefined}
                disabled={!target}
                title={target ? undefined : "Em breve"}
                onClick={() => target && onNavigate(target)}
              >
                <Icon size={20} />
                {label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="center">
        <header className="topbar">
          <label className="search">
            <Search size={18} />
            <input type="search" placeholder="Busque algo... (ex.: campanhas, clientes, insights)" />
          </label>
          <div className="topbar-right">
            <button type="button" className="user">
              <span className="avatar">TK</span>
              Olá, Thaís
              <ChevronDown size={16} />
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}