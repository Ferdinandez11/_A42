import React from "react";
import { Link, Outlet } from "react-router-dom";
import { performLogout } from "@/App/utils/authHelpers";

export const ClientPortalLayout: React.FC = () => (
  <div className="h-screen flex flex-col bg-zinc-950 text-zinc-200 font-sans overflow-hidden">
    <header className="bg-zinc-900 border-b border-zinc-800 py-4 px-10 flex justify-between items-center flex-shrink-0">
      <h3 className="m-0 text-white text-lg font-semibold">
        Portal del Cliente 👋
      </h3>

      <nav className="flex gap-5 items-center">
        <Link to="/portal?tab=projects" className="text-white hover:text-zinc-300">
          Mis Proyectos
        </Link>
        <Link to="/portal?tab=budgets" className="text-zinc-400 hover:text-white">
          Mis Presupuestos
        </Link>
        <Link to="/portal?tab=orders" className="text-zinc-400 hover:text-white">
          Mis Pedidos
        </Link>
        <Link to="/portal/calendar" className="text-zinc-400 hover:text-white">
          📅 Calendario
        </Link>
        <Link to="/portal/profile" className="text-zinc-400 hover:text-white">
          Mi Perfil 👤
        </Link>

        <Link
          to="/"
          className="bg-zinc-800 text-white py-1.5 px-3 rounded-full no-underline text-xs font-bold flex items-center gap-2 shadow-lg border border-zinc-700 hover:bg-zinc-700 transition-all"
        >
          + Nuevo Proyecto 3D
        </Link>

        <button
          onClick={performLogout}
          className="bg-transparent border-none text-zinc-600 cursor-pointer hover:text-zinc-500"
        >
          Salir
        </button>
      </nav>
    </header>

    <main className="flex-1 overflow-y-auto p-10">
      <div className="max-w-6xl mx-auto">
        <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800">
          <Outlet />
        </div>
      </div>
    </main>
  </div>
);