import type { Meta, StoryObj } from '@storybook/react';
import {
  Skeleton,
  Spinner,
  ProgressBar,
  PageLoader,
  TableSkeleton,
  CardSkeleton,
  FormSkeleton,
} from '../src/loading';

const meta: Meta = {
  title: 'Loading',
  parameters: { layout: 'padded' },
};
export default meta;

export const SkeletonStory: StoryObj = {
  name: 'Skeleton',
  render: () => (
    <div className="space-y-2 max-w-md">
      <Skeleton height="1rem" />
      <Skeleton height="1rem" width="80%" />
      <Skeleton height="1rem" width="60%" />
    </div>
  ),
};
export const SpinnerStory: StoryObj = {
  name: 'Spinner',
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
};
export const ProgressBarStory: StoryObj = {
  name: 'ProgressBar',
  render: () => (
    <div className="space-y-3 max-w-md">
      <ProgressBar value={30} label="טעינת קובץ" showPercentage />
      <ProgressBar value={70} variant="success" label="סנכרון" showPercentage />
      <ProgressBar value={50} indeterminate label="ממתין..." />
    </div>
  ),
};
export const PageLoaderStory: StoryObj = { name: 'PageLoader', render: () => <PageLoader /> };
export const TableSkeletonStory: StoryObj = {
  name: 'TableSkeleton',
  render: () => <TableSkeleton rows={5} columns={4} />,
};
export const CardSkeletonStory: StoryObj = {
  name: 'CardSkeleton',
  render: () => <CardSkeleton count={3} withAvatar />,
};
export const FormSkeletonStory: StoryObj = { name: 'FormSkeleton', render: () => <FormSkeleton /> };
