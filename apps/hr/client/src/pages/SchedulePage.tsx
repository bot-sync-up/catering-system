// לוח משמרות שבועי – שיבוץ Drag & Drop
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, useDraggable, useDroppable, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { addDays, startOfWeek, format } from "date-fns";
import { he } from "date-fns/locale";
import { api } from "../services/api";
import { useAuthStore } from "../services/auth";

const HE_DAYS = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  role?: string;
  employeeId: string | null;
  employee?: { id: string; firstName: string; lastName: string; photoUrl?: string };
}

interface Emp {
  id: string;
  firstName: string;
  lastName: string;
}

export default function SchedulePage() {
  const { user } = useAuthStore();
  const isManager = user && user.role !== "EMPLOYEE";
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const weekEnd = addDays(weekStart, 6);

  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts", weekStart.toISOString()],
    queryFn: async () => (await api.get<Shift[]>("/shifts/week", {
      params: { from: weekStart.toISOString(), to: weekEnd.toISOString() },
    })).data,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-light"],
    queryFn: async () => isManager
      ? (await api.get<Emp[]>("/employees")).data
      : [],
    enabled: !!isManager,
  });

  const assignMut = useMutation({
    mutationFn: async ({ shiftId, employeeId }: { shiftId: string; employeeId: string | null }) =>
      (await api.patch(`/shifts/${shiftId}/assign`, { employeeId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });

  const createShift = useMutation({
    mutationFn: async (b: any) => (await api.post("/shifts", b)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shifts"] }),
  });

  // ארגון משמרות לפי יום
  const byDay = useMemo(() => {
    const map: Record<string, Shift[]> = {};
    for (let i = 0; i < 7; i++) map[format(addDays(weekStart, i), "yyyy-MM-dd")] = [];
    shifts.forEach(s => {
      const k = format(new Date(s.date), "yyyy-MM-dd");
      if (map[k]) map[k].push(s);
    });
    return map;
  }, [shifts, weekStart]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const shiftId = String(e.active.id);
    const target = String(e.over.id);   // "emp:<id>" או "unassigned"
    const employeeId = target.startsWith("emp:") ? target.slice(4) : null;
    assignMut.mutate({ shiftId, employeeId });
  };

  const addShiftFor = (date: Date) => {
    const start = prompt("שעת התחלה (HH:MM)", "08:00");
    const end   = prompt("שעת סיום (HH:MM)", "16:00");
    const role  = prompt("תפקיד (אופציונלי)", "");
    if (!start || !end) return;
    createShift.mutate({
      date: date.toISOString(),
      startTime: start, endTime: end,
      role: role || undefined,
    });
  };

  return (
    <>
      <h2 className="page-title">לוח משמרות שבועי</h2>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="btn secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>◀ שבוע קודם</button>
        <strong>{format(weekStart, "d MMM", { locale: he })} – {format(weekEnd, "d MMM yyyy", { locale: he })}</strong>
        <button className="btn secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>שבוע הבא ▶</button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="schedule-grid">
          {/* כותרת ימים */}
          <div className="cell head">עובד / משמרת</div>
          {Array.from({ length: 7 }).map((_, i) => {
            const d = addDays(weekStart, i);
            return (
              <div key={i} className="cell head">
                {HE_DAYS[d.getDay()]}<br />
                <small>{format(d, "d/M")}</small>
              </div>
            );
          })}

          {/* שורת לא משובצים */}
          <UnassignedRow
            byDay={byDay}
            weekStart={weekStart}
            isManager={!!isManager}
            onAddShift={addShiftFor}
          />

          {/* שורות עובדים */}
          {employees.map(e => (
            <EmployeeRow key={e.id} emp={e} byDay={byDay} weekStart={weekStart} />
          ))}
        </div>
      </DndContext>

      {!isManager && (
        <p style={{ marginTop: 14, color: "var(--muted)" }}>
          רק מנהלים יכולים לגרור ולשבץ משמרות. את המשמרות המשובצות לך תוכל לראות ולבצע כניסה/יציאה בעמוד "כניסה / יציאה".
        </p>
      )}
    </>
  );
}

function UnassignedRow({ byDay, weekStart, isManager, onAddShift }: any) {
  return (
    <>
      <div className="cell" style={{ background: "#fffbeb" }}>
        <strong>לא משובצים</strong>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>גרור עובד או צור משמרת</div>
      </div>
      {Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(weekStart, i);
        const key = format(d, "yyyy-MM-dd");
        const list: Shift[] = (byDay[key] || []).filter((s: Shift) => !s.employeeId);
        return (
          <DropCell key={i} dropId="unassigned">
            {list.map(s => <ShiftDraggable key={s.id} shift={s} unassigned />)}
            {isManager && (
              <button className="btn secondary" style={{ fontSize: 11, padding: "4px 8px", marginTop: 4 }}
                onClick={() => onAddShift(d)}>+ צור משמרת</button>
            )}
          </DropCell>
        );
      })}
    </>
  );
}

function EmployeeRow({ emp, byDay, weekStart }: { emp: Emp; byDay: Record<string, Shift[]>; weekStart: Date }) {
  return (
    <>
      <div className="cell" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e5e7eb" }} />
        <strong>{emp.firstName} {emp.lastName}</strong>
      </div>
      {Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(weekStart, i);
        const key = format(d, "yyyy-MM-dd");
        const list = (byDay[key] || []).filter(s => s.employeeId === emp.id);
        return (
          <DropCell key={i} dropId={`emp:${emp.id}`}>
            {list.map(s => <ShiftDraggable key={s.id} shift={s} />)}
          </DropCell>
        );
      })}
    </>
  );
}

function DropCell({ dropId, children }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  return (
    <div ref={setNodeRef} className={`cell ${isOver ? "dropzone-active" : ""}`}>
      {children}
    </div>
  );
}

function ShiftDraggable({ shift, unassigned }: { shift: Shift; unassigned?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: shift.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`shift-card ${unassigned ? "unassigned" : ""} ${isDragging ? "dragging" : ""}`}
    >
      <strong>{shift.startTime}–{shift.endTime}</strong>
      {shift.role && <div>{shift.role}</div>}
    </div>
  );
}
