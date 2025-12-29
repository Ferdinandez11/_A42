import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/core/lib/supabase";
import { logError } from "@/core/lib/logger";

// Types
interface Order {
  id: string;
  order_ref: string;
  custom_name?: string;
  estimated_delivery_date: string;
  status: string;
}

type FilterType = "all" | "ref";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/**
 * Returns the background color for an order status
 */
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    presupuestado: "bg-purple-600",
    en_proceso: "bg-orange-600",
    pedido: "bg-blue-600",
    enviado: "bg-indigo-600",
    entregado: "bg-green-600",
    retrasado: "bg-red-700",
  };
  return colors[status] || "bg-blue-600";
};

/**
 * Client calendar page showing order delivery dates for the logged-in client
 */
export const ClientCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [orders, setOrders] = useState<Order[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  useEffect(() => {
    loadUserAndOrders();
  }, []);

  /**
   * Loads user and their orders from database
   */
  const loadUserAndOrders = async (): Promise<void> => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        navigate('/login');
        return;
      }

      setUserId(user.id);

      // Cargar solo pedidos del cliente actual que están en "Mis Presupuestos" o "Mis Pedidos"
      // Esto excluye archivados, rechazados, cancelados y proyectos eliminados
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_ref, custom_name, estimated_delivery_date, status")
        .eq("user_id", user.id)
        .not("estimated_delivery_date", "is", null)
        .eq("is_archived", false)
        .in("status", [
          'pendiente',
          'presupuestado',
          'pedido',
          'en_proceso',
          'enviado',
          'entregado'
        ]);

      if (error) throw error;

      setOrders((data as Order[]) || []);
    } catch (error) {
      logError('Error loading calendar', error, { context: 'ClientCalendarPage' });
    }
  };

  /**
   * Gets all days in the month including padding
   */
  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Adjust for Monday start (0 = Sunday in JS)
    let startDay = firstDay.getDay() - 1;
    if (startDay === -1) startDay = 6;

    const days: (Date | null)[] = [];

    // Fill previous month gaps
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Fill month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  /**
   * Changes the displayed month
   */
  const changeMonth = (offset: number): void => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  /**
   * Filters orders based on search term and filter type
   */
  const filteredOrders = orders.filter((order) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesRef =
      order.order_ref.toLowerCase().includes(searchLower) ||
      (order.custom_name && order.custom_name.toLowerCase().includes(searchLower));

    if (filterType === "all") return matchesRef;
    if (filterType === "ref") return matchesRef;
    return true;
  });

  /**
   * Gets all events for a specific day
   */
  const getEventsForDay = (day: Date): Order[] => {
    return filteredOrders.filter((order) => {
      const orderDate = new Date(order.estimated_delivery_date);
      return (
        orderDate.getDate() === day.getDate() &&
        orderDate.getMonth() === day.getMonth() &&
        orderDate.getFullYear() === day.getFullYear()
      );
    });
  };

  const calendarDays = getDaysInMonth(currentDate);

  return (
    <div className="p-5 text-zinc-200 h-full flex flex-col">
      {/* Header and controls */}
      <div className="flex justify-between items-center mb-5 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => changeMonth(-1)}
            className="bg-zinc-800 text-white border border-zinc-700 py-2 px-3 rounded-md cursor-pointer hover:bg-zinc-700"
          >
            ◀
          </button>
          <h2 className="m-0 text-white w-52 text-center text-xl font-semibold">
            {currentDate
              .toLocaleString("es-ES", { month: "long", year: "numeric" })
              .toUpperCase()}
          </h2>
          <button
            onClick={() => changeMonth(1)}
            className="bg-zinc-800 text-white border border-zinc-700 py-2 px-3 rounded-md cursor-pointer hover:bg-zinc-700"
          >
            ▶
          </button>
        </div>

        <div className="flex gap-4 items-center">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="bg-zinc-950 border border-zinc-700 text-white py-2 px-3 rounded-md outline-none w-32 cursor-pointer"
          >
            <option value="all">🔍 Todo</option>
            <option value="ref">📦 Pedido/Ref</option>
          </select>
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 text-white py-2 px-3 rounded-md outline-none w-52"
          />
          <button
            onClick={loadUserAndOrders}
            className="bg-green-600 text-white border-none py-2 px-3 rounded-md cursor-pointer hover:bg-green-700"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-2.5 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-purple-600 rounded-sm"></span>
          Presupuestado (Fin Validez)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-orange-600 rounded-sm"></span>
          En Proceso
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-blue-600 rounded-sm"></span>
          Pedido Confirmado
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-green-600 rounded-sm"></span>
          Entregado
        </div>
      </div>

      {/* Calendar */}
      <div className="grid grid-cols-7 gap-px bg-zinc-800 border border-zinc-800 rounded-lg overflow-hidden flex-1">
        {/* Weekday headers */}
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="bg-zinc-900 p-2.5 text-center font-bold text-zinc-600 uppercase text-xs"
          >
            {day}
          </div>
        ))}

        {/* Day cells */}
        {calendarDays.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`empty-${idx}`}
                className="bg-zinc-950 min-h-[100px] p-1"
              ></div>
            );
          }

          const events = getEventsForDay(day);
          const isToday = new Date().toDateString() === day.toDateString();

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[100px] p-1 relative ${
                isToday
                  ? "bg-zinc-900/50 border border-green-600"
                  : "bg-zinc-950"
              }`}
            >
              <span
                className={`absolute top-1 right-2 font-bold text-sm ${
                  isToday ? "text-green-600" : "text-zinc-700"
                }`}
              >
                {day.getDate()}
              </span>

              <div className="mt-6 flex flex-col gap-0.5">
                {events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/portal/order/${event.id}`)}
                    title={`Ref: ${event.order_ref}`}
                    className={`${getStatusColor(
                      event.status
                    )} text-white py-1 px-1.5 rounded text-[11px] cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis border-l-[3px] border-black/20 hover:opacity-90`}
                  >
                    <strong>{event.order_ref}</strong>
                    <div className="text-[9px] opacity-90">
                      {event.custom_name || "Sin nombre"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

