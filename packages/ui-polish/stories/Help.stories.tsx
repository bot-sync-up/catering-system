import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, HelpPopover } from '../src/help';

const meta: Meta = { title: 'Help' };
export default meta;

export const TooltipStory: StoryObj = {
  name: 'Tooltip',
  render: () => (
    <div className="flex gap-4 p-12">
      <Tooltip content="זהו טוּלטיפּ למעלה" side="top">
        <button className="rounded bg-primary px-3 py-1.5 text-primary-fg">למעלה</button>
      </Tooltip>
      <Tooltip content="למטה" side="bottom">
        <button className="rounded bg-primary px-3 py-1.5 text-primary-fg">למטה</button>
      </Tooltip>
    </div>
  ),
};

export const HelpPopoverStory: StoryObj = {
  name: 'HelpPopover',
  render: () => (
    <div className="flex items-center gap-2 p-8">
      <span>סכום בשקלים</span>
      <HelpPopover title="מה זה סכום?">
        הסכום הכולל כולל מע"מ. אם ברצונכם להפריד בין סכום למע"מ — היכנסו להגדרות החשבון.
      </HelpPopover>
    </div>
  ),
};
