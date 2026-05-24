import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * קומפוננטת Button פנימית לדמו — שיקוף ה-Design System.
 */
const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
  }
> = ({ variant = "primary", size = "md", loading, children, ...rest }) => {
  const bg =
    variant === "primary"
      ? "#0d6efd"
      : variant === "secondary"
        ? "#e9ecef"
        : variant === "danger"
          ? "#dc3545"
          : "transparent";
  const color = variant === "secondary" || variant === "ghost" ? "#222" : "#fff";
  const pad = size === "sm" ? "6px 10px" : size === "lg" ? "12px 22px" : "10px 16px";
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      style={{
        background: bg,
        color,
        border: variant === "ghost" ? "1px solid #ccc" : 0,
        padding: pad,
        borderRadius: 6,
        fontSize: size === "sm" ? 13 : size === "lg" ? 18 : 15,
        cursor: rest.disabled || loading ? "not-allowed" : "pointer",
        opacity: rest.disabled || loading ? 0.6 : 1,
      }}
    >
      {loading ? "טוען..." : children}
    </button>
  );
};

const meta: Meta<typeof Button> = {
  title: "Design System/Buttons",
  component: Button,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: "primary", children: "שמירה" } };
export const Secondary: Story = { args: { variant: "secondary", children: "ביטול" } };
export const Danger: Story = { args: { variant: "danger", children: "מחיקה" } };
export const Ghost: Story = { args: { variant: "ghost", children: "ערוך" } };
export const Loading: Story = { args: { variant: "primary", loading: true, children: "שולח" } };
export const Disabled: Story = { args: { variant: "primary", disabled: true, children: "אין הרשאה" } };
