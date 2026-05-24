import type { Meta, StoryObj } from '@storybook/react';
import { NotFound, ServerError, Unauthorized, Forbidden, FallbackUI } from '../src/errors';

const meta: Meta = {
  title: 'Errors',
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const NotFoundStory: StoryObj = { name: '404', render: () => <NotFound /> };
export const ServerErrorStory: StoryObj = { name: '500', render: () => <ServerError /> };
export const UnauthorizedStory: StoryObj = { name: '401', render: () => <Unauthorized /> };
export const ForbiddenStory: StoryObj = { name: '403', render: () => <Forbidden /> };
export const FallbackStory: StoryObj = {
  name: 'FallbackUI',
  render: () => <FallbackUI error={new Error('משהו השתבש בעיבוד הנתונים')} showDetails />,
};
