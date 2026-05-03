// בקשות החלפת משמרת + זרימת אישור (peer ואז מנהל)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuthStore } from "../services/auth";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  PENDING:          { text: "מחכה לאישור עובד", cls: "warning" },
  ACCEPTED_BY_PEER: { text: "אושר ע״י עובד יעד, מחכה למנהל", cls: "info" },
  APPROVED:         { text: "אושר", cls: "success" },
  REJECTED:         { text: "נדחה", cls: "danger" },
  CANCELLED:        { text: "בוטל", cls: "danger" },
};

export default function SwapsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isManager = user && user.role !== "EMPLOYEE";

  const { data: swaps = [] } = useQuery({
    queryKey: ["swaps"],
    queryFn: async () => (await api.get("/shifts/swaps")).data,
  });

  const peerRespond = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) =>
      (await api.post(`/shifts/swaps/${id}/peer-respond`, { accept })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swaps"] }),
  });

  const managerApprove = useMutation({
    mutationFn: async ({ id, approve, note }: { id: string; approve: boolean; note?: string }) =>
      (await api.post(`/shifts/swaps/${id}/manager-approve`, { approve, note })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swaps"] }),
  });

  return (
    <>
      <h2 className="page-title">בקשות החלפת משמרת</h2>
      {swaps.length === 0 && <div className="card">אין בקשות</div>}
      {swaps.map((s: any) => {
        const isToMe   = s.toEmployeeId === user?.employeeId && s.status === "PENDING";
        const canMgr   = isManager && s.status === "ACCEPTED_BY_PEER";
        const stat = STATUS_LABEL[s.status] || { text: s.status, cls: "info" };
        return (
          <div key={s.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <strong>{s.fromEmployee.firstName} {s.fromEmployee.lastName}</strong>
                {" → "}
                {s.toEmployee ? `${s.toEmployee.firstName} ${s.toEmployee.lastName}` : <em>(כל אחד)</em>}
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                  משמרת {new Date(s.shift.date).toLocaleDateString("he-IL")} · {s.shift.startTime}–{s.shift.endTime}
                </div>
                {s.reason && <div style={{ marginTop: 4 }}>סיבה: {s.reason}</div>}
              </div>
              <span className={`badge ${stat.cls}`}>{stat.text}</span>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              {isToMe && <>
                <button className="btn success" onClick={() => peerRespond.mutate({ id: s.id, accept: true })}>אני מסכים להחליף</button>
                <button className="btn danger"  onClick={() => peerRespond.mutate({ id: s.id, accept: false })}>דחיה</button>
              </>}
              {canMgr && <>
                <button className="btn success" onClick={() => managerApprove.mutate({ id: s.id, approve: true })}>אישור מנהל</button>
                <button className="btn danger"  onClick={() => {
                  const note = prompt("סיבת דחייה?") || "";
                  managerApprove.mutate({ id: s.id, approve: false, note });
                }}>דחיה</button>
              </>}
            </div>
          </div>
        );
      })}
    </>
  );
}
