import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  labelHe: string;
  errorHe?: string;
  helperHe?: string;
}

const Input: React.FC<InputProps> = ({ labelHe, errorHe, helperHe, ...rest }) => (
  <label dir="rtl" style={{ display: "block", marginBottom: 8 }}>
    <span style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>{labelHe}</span>
    <input
      {...rest}
      style={{
        width: "100%",
        padding: 8,
        borderRadius: 6,
        border: `1px solid ${errorHe ? "#dc3545" : "#ccc"}`,
        fontSize: 15,
      }}
    />
    {errorHe ? (
      <span style={{ color: "#dc3545", fontSize: 13 }}>{errorHe}</span>
    ) : helperHe ? (
      <span style={{ color: "#666", fontSize: 13 }}>{helperHe}</span>
    ) : null}
  </label>
);

const meta: Meta<typeof Input> = { title: "Design System/Inputs", component: Input, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof Input>;

export const TextDefault: Story = { args: { labelHe: "שם מלא", placeholder: "ישראל ישראלי" } };
export const Email: Story = { args: { labelHe: "אימייל", type: "email", placeholder: "name@example.com" } };
export const Phone: Story = {
  args: { labelHe: "טלפון", type: "tel", placeholder: "050-1234567", helperHe: "פורמט ישראלי" },
};
export const Number: Story = { args: { labelHe: "מספר סועדים", type: "number", min: 1, defaultValue: 50 } };
export const WithError: Story = {
  args: { labelHe: "ת.ז.", defaultValue: "12345", errorHe: "ת.ז. חייבת להיות 9 ספרות" },
};
export const Disabled: Story = { args: { labelHe: "מזהה לקוח", defaultValue: "CUST-001", disabled: true } };
