import { describe, expect, it } from 'vitest';
import { MenuBuilder, DEFAULT_MAIN_MENU } from '../src/ivr/MenuBuilder.js';

describe('MenuBuilder', () => {
  const builder = new MenuBuilder('https://example.com/api');

  it('בונה TwiML עם <Gather>', () => {
    const xml = builder.toTwiML(DEFAULT_MAIN_MENU, 'main');
    expect(xml).toContain('<Gather');
    expect(xml).toContain('he-IL');
    expect(xml).toContain('להזמנה חדשה הקש 1');
  });

  it('מטפל בבחירה תקפה', () => {
    const xml = builder.handleSelection(DEFAULT_MAIN_MENU, '9');
    expect(xml).toContain('+972500000000');
  });

  it('מטפל בבחירה לא תקפה', () => {
    const xml = builder.handleSelection(DEFAULT_MAIN_MENU, '7');
    expect(xml).toMatch(/לא תקפה/);
  });
});
