import type { StorybookConfig } from "@storybook/react-vite";

/**
 * תצורה ראשית של Storybook עבור Sync Up Catering.
 *
 * אנו טוענים stories גם מתוך `storybook/stories` וגם מתוך כל חבילות
 * ה-UI (`packages/ui`, `packages/ui-mobile`, `packages/innovation`).
 */
const config: StorybookConfig = {
  stories: [
    "./stories/**/*.mdx",
    "./stories/**/*.stories.@(ts|tsx)",
    "../packages/ui/src/**/*.stories.@(ts|tsx)",
    "../packages/ui-mobile/src/**/*.stories.@(ts|tsx)",
    "../packages/innovation/src/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-interactions",
    "@storybook/addon-rtl-direction",
    "@chromatic-com/storybook",
  ],
  framework: { name: "@storybook/react-vite", options: {} },
  docs: { autodocs: "tag" },
  typescript: { reactDocgen: "react-docgen-typescript" },
  staticDirs: ["./static"],
};

export default config;
