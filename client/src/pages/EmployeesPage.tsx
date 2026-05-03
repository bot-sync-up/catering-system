import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../services/api";

interface Emp {
  id: string;
  firstName: string;
  lastName: string;
  hebrewName?: string;
  phone?: string;
  email: string;
  role: string;
  startDate: string;
  photoUrl?: string;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "מנהל מערכת", HR: "משאבי אנוש", MANAGER: "מנהל", EMPLOYEE: "עובד",
};

export default function EmployeesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await api.get<Emp[]>("/employees")).data,
  });

  return (
    <>
      <h2 className="page-title">עובדים</h2>
      <div className="card">
        {isLoading ? "טוען..." : (
          <table>
            <thead>
              <tr>
                <th>תמונה</th>
                <th>שם</th>
                <th>אימייל</th>
                <th>טלפון</th>
                <th>תפקיד</th>
                <th>תחילת עבודה</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.map(e => (
                <tr key={e.id}>
                  <td>
                    {e.photoUrl
                      ? <img src={e.photoUrl} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                      : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e5e7eb" }} />}
                  </td>
                  <td>{e.hebrewName || `${e.firstName} ${e.lastName}`}</td>
                  <td>{e.email}</td>
                  <td>{e.phone || "—"}</td>
                  <td><span className="badge info">{ROLE_LABEL[e.role]}</span></td>
                  <td>{new Date(e.startDate).toLocaleDateString("he-IL")}</td>
                  <td><Link to={`/employee/${e.id}`} className="btn secondary">פתח תיק</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
