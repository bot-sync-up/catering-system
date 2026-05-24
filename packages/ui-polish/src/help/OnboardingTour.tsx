import { lazy, Suspense, useMemo } from 'react';
import type { Step, CallBackProps } from 'react-joyride';

const Joyride = lazy(() => import('react-joyride'));

export interface TourStep {
  target: string;
  title?: string;
  content: string;
}

interface Props {
  run: boolean;
  steps: TourStep[];
  onFinish?: () => void;
}

/** סיור הכרות באפליקציה — מבוסס react-joyride עם טקסטים בעברית. */
export function OnboardingTour({ run, steps, onFinish }: Props) {
  const mapped: Step[] = useMemo(
    () =>
      steps.map((s) => ({
        target: s.target,
        title: s.title,
        content: s.content,
        disableBeacon: true,
      })),
    [steps],
  );

  const handle = (data: CallBackProps): void => {
    if (data.status === 'finished' || data.status === 'skipped') onFinish?.();
  };

  return (
    <Suspense fallback={null}>
      <Joyride
        steps={mapped}
        run={run}
        continuous
        showProgress
        showSkipButton
        callback={handle}
        locale={{
          back: 'הקודם',
          close: 'סגירה',
          last: 'סיום',
          next: 'הבא',
          open: 'פתיחה',
          skip: 'דלג',
        }}
        styles={{
          options: {
            primaryColor: 'var(--color-primary)',
            backgroundColor: 'var(--color-bg)',
            textColor: 'var(--color-text)',
            arrowColor: 'var(--color-bg)',
            zIndex: 200,
          },
        }}
      />
    </Suspense>
  );
}
