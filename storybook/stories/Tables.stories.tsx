import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";

interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  width?: string;
}
interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  emptyHe?: string;
}

function DataTable<T>({ rows, columns, emptyHe = "אין נתונים להצגה" }: DataTableProps<T>) {
  return (
    <div dir="rtl" style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead style={{ background: "#f7f7f7" }}>
          <tr>
            {columns.map((c, i) => (
              <th key={i} style={{ padding: 10, textAlign: "start", width: c.width, fontWeight: 600 }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ padding: 24, textAlign: "center", color: "#888" }}>
                {emptyHe}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop: "1px solid #eee" }}>
              {columns.map((c, j) => (
                <td key={j} style={{ padding: 10 }}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const meta: Meta<typeof DataTable> = { title: "Design System/Tables", component: DataTable, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof DataTable>;

const orders = [
  { id: "1042", customer: "כהן", date: "2026-06-15", total: 12500, status: "מאושר" },
  { id: "1043", customer: "לוי", date: "2026-06-18", total: 8200, status: "בטיוטה" },
  { id: "1044", customer: "מזרחי", date: "2026-06-20", total: 17800, status: "בוצע" },
];

const orderColumns: Column<(typeof orders)[number]>[] = [
  { header: "מס׳", cell: (r) => `#${r.id}` },
  { header: "לקוח", cell: (r) => r.customer },
  { header: "תאריך", cell: (r) => r.date },
  { header: "סה\"כ", cell: (r) => `₪${r.total.toLocaleString("he-IL")}` },
  { header: "סטטוס", cell: (r) => r.status },
];

export const Orders: Story = {
  render: () => <DataTable rows={orders} columns={orderColumns} />,
};

export const Empty: Story = {
  render: () => <DataTable rows={[]} columns={orderColumns} />,
};

export const SingleRow: Story = {
  render: () => <DataTable rows={[orders[0]]} columns={orderColumns} />,
};

export const Many: Story = {
  render: () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: `20${i.toString().padStart(2, "0")}`,
      customer: ["כהן", "לוי", "מזרחי", "אבן"][i % 4],
      date: `2026-06-${(10 + (i % 20)).toString().padStart(2, "0")}`,
      total: 5000 + i * 250,
      status: i % 3 === 0 ? "בוצע" : i % 3 === 1 ? "מאושר" : "בטיוטה",
    }));
    return <DataTable rows={many} columns={orderColumns} />;
  },
};

export const InvoiceTable: Story = {
  render: () => {
    const rows = [
      { num: "2026-0042", date: "2026-05-24", total: 11800, status: "שולמה" },
      { num: "2026-0041", date: "2026-05-03", total: 8200, status: "חוב פתוח" },
    ];
    const cols: Column<(typeof rows)[number]>[] = [
      { header: "חשבונית", cell: (r) => r.num },
      { header: "תאריך", cell: (r) => r.date },
      { header: "סכום", cell: (r) => `₪${r.total.toLocaleString("he-IL")}` },
      { header: "סטטוס", cell: (r) => r.status },
    ];
    return <DataTable rows={rows} columns={cols} />;
  },
};

export const EmployeeTable: Story = {
  render: () => {
    const rows = [
      { name: "מאיה", role: "שפית", phone: "050-1112233" },
      { name: "אבי", role: "מלצר", phone: "052-3344556" },
    ];
    const cols: Column<(typeof rows)[number]>[] = [
      { header: "שם", cell: (r) => r.name },
      { header: "תפקיד", cell: (r) => r.role },
      { header: "טלפון", cell: (r) => r.phone },
    ];
    return <DataTable rows={rows} columns={cols} />;
  },
};
