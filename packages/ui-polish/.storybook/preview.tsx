import type { Preview } from '@storybook/react';
import { useEffect } from 'react';
import '../src/styles/index.css';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0b1220' },
      ],
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile (RTL)', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet (RTL)', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop (RTL)', styles: { width: '1440px', height: '900px' } },
      },
    },
    a11y: {
      element: '#storybook-root',
      manual: false,
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'בהיר' },
          { value: 'dark', title: 'כהה' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      const theme = (ctx.globals.theme as string) ?? 'light';
      useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('dir', 'rtl');
        root.setAttribute('lang', 'he');
        root.classList.toggle('dark', theme === 'dark');
      }, [theme]);
      return (
        <div dir="rtl" lang="he" className="font-hebrew p-6 bg-bg text-text min-h-screen">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
