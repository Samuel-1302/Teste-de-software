import { useState } from "react";
import Shell, { type Page } from "./Shell";
import Dashboard from "./Dashboard";
import PrevisaoConversao from "./PrevisaoConversao";
import AgenteIA from "./AgenteIA";
import Analise from "./Analise";

export default function App() {
  const [page, setPage] = useState<Page>("inicio");

  return (
    <Shell page={page} onNavigate={setPage}>
      {page === "inicio" && <Dashboard />}
      {page === "previsao" && <PrevisaoConversao />}
      {page === "agente" && <AgenteIA />}
      {page === "analises" && <Analise />}
    </Shell>
  );
}