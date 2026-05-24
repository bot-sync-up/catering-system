import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";

interface BadgeProps {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
}

const Badge: React.FC<BadgeProps> = ({ children, tone = "neutral", size = "md" }) => {
  const palette = {
    neutral: { bg: "#e9ecef", fg: "#495057" },
    success: { bg: "#d1e7dd", fg: "#0f5132" },
    warning: { bg: "#fff3cd", fg: "#664d03" },
    danger: { bg: "#f8d7da", fg: "#842029" },
    info: { bg: "#cfe2ff", fg: "#084298" },
  }[tone];
  return (
    <span
      dir="rtl"
      style={{
        display: "inline-block",
        padding: size === "sm" ? "2px 8px" : "4px 12px",
        borderRadius: 999,
        background: palette.bg,
        color: palette.fg,
        fontSize: size === "sm" ? 11 : 13,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
};

const meta: Meta<typeof Badge> = { title: "Design System/Badges", component: Badge, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof Badge>;

export const Neutral: Story = { args: { children: "טיוטה" } };
export const Success: Story = { args: { children: "שולם", tone: "success" } };
export const Warning: Story = { args: { children: "בהכנה", tone: "warning" } };
export const Danger: Story = { args: { children: "בוטל", tone: "danger" } };
export const Info: Story = { args: { children: "חדש", tone: "info" } };
export const Small: Story = { args: { children: "מנוי PRO", tone: "info", size: "sm" } };
