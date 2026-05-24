import * as React from "react";
import type { Preview } from "@storybook/react";

/**
 * Preview גלובלי — מגדיר RTL, פונט עברי, ו-theme switcher.
 */

const withRtl = (Story: React.ComponentType, { globals }: { globals: { theme?: "light" | "dark"; direction?: "rtl" | "ltr" } }) => {
  const dir = globals.direction ?? "rtl";
  const theme = globals.theme ?? "light";
  React.useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.fontFamily =
      "'Heebo', 'Rubik', 'Open Sans Hebrew', system-ui, sans-serif";
  }, [dir, theme]);
  return (
    <div
      dir={dir}
      style={{
        padding: 16,
        background: theme === "dark" ? "#111" : "#fff",
        color: theme === "dark" ? "#eee" : "#222",
        minHeight: "100vh",
      }}
    >
      <Story />
    </div>
  );
};

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#fff" },
        { name: "dark", value: "#111" },
      ],
    },
    a11y: { element: "#storybook-root", manual: false },
    chromatic: { viewports: [375, 768, 1280] },
  },
  globalTypes: {
    direction: {
      name: "Direction",
      defaultValue: "rtl",
      toolbar: {
        icon: "transfer",
        items: [
          { value: "rtl", title: "RTL (עברית)" },
          { value: "ltr", title: "LTR (English)" },
        ],
      },
    },
    theme: {
      name: "Theme",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
      },
    },
  },
  decorators: [withRtl],
};

export default preview;
