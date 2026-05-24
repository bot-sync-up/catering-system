import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CommandPalette, buildDefaultCommands } from '../src/command-palette';

const meta: Meta = { title: 'CommandPalette' };
export default meta;

export const Default: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(true);
    const cmds = buildDefaultCommands({
      home: () => alert('בית'),
      customers: () => alert('לקוחות'),
    });
    return (
      <div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-primary px-4 py-2 text-primary-fg"
        >
          פתח לוח פקודות
        </button>
        <CommandPalette open={open} onClose={() => setOpen(false)} commands={cmds} />
      </div>
    );
  },
};
