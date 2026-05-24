import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";

interface CardProps {
  title: string;
  subtitle?: string;
  body?: React.ReactNode;
  footer?: React.ReactNode;
  status?: "default" | "success" | "warning" | "danger";
}

const Card: React.FC<CardProps> = ({ title, subtitle, body, footer, status = "default" }) => {
  const accent =
    status === "success" ? "#198754" : status === "warning" ? "#ffc107" : status === "danger" ? "#dc3545" : "#0d6efd";
  return (
    <article
      dir="rtl"
      style={{
        border: "1px solid #e7e7e7",
        borderRight: `4px solid ${accent}`,
        borderRadius: 10,
        padding: 16,
        maxWidth: 420,
        background: "white",
      }}
    >
      <header>
        <h3 style={{ margin: 0 }}>{title}</h3>
        {subtitle && <div style={{ color: "#666", fontSize: 13, marginTop: 2 }}>{subtitle}</div>}
      </header>
      {body && <div style={{ marginTop: 12 }}>{body}</div>}
      {footer && <footer style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 10 }}>{footer}</footer>}
    </article>
  );
};

const meta: Meta<typeof Card> = { title: "Design System/Cards", component: Card, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof Card>;

export const OrderCard: Story = {
  args: { title: "הזמנה #1042", subtitle: "אירוע: חתונת כהן 15/06", body: "50 סועדים · 8 פריטים · סה\"כ ₪12,500", status: "default" },
};
export const InvoicePaid: Story = {
  args: { title: "חשבונית 2026-0042", subtitle: "שולמה", body: "₪11,800 כולל מע\"מ", status: "success" },
};
export const InvoiceOverdue: Story = {
  args: { title: "חשבונית 2026-0041", subtitle: "חוב פתוח 21 ימים", body: "₪8,200 כולל מע\"מ", status: "danger" },
};
export const DeliveryOnRoute: Story = {
  args: { title: "משלוח DEL-901", subtitle: "בדרך — ETA 18 דקות", body: "נהג: יוסי כהן · רכב פז-12-345", status: "warning" },
};
export const CustomerLead: Story = {
  args: { title: "ליד: רותי לוי", subtitle: "בת מצווה · 80 סועדים · 12/07", status: "default" },
};
export const PlateAlert: Story = {
  args: {
    title: "התראת איכות הגשה",
    subtitle: "מנה: קוסקוס מלכותי",
    body: "ציון 5.5/10 — המנה נראית מועכת בקצוות.",
    status: "danger",
  },
};
