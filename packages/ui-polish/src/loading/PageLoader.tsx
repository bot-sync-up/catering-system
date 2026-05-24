import { Spinner } from './Spinner';
import { cn } from '../utils/cn';

interface PageLoaderProps {
  message?: string;
  fullscreen?: boolean;
  className?: string;
}

/** מסך טעינה מלא לעמוד / אזור. */
export function PageLoader({
  message = 'טוען, אנא המתינו...',
  fullscreen = false,
  className,
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      dir="rtl"
      className={cn(
        'flex flex-col items-center justify-center gap-4 bg-bg/80 backdrop-blur-sm',
        fullscreen ? 'fixed inset-0 z-50' : 'min-h-[40vh] w-full',
        className,
      )}
    >
      <Spinner size="lg" label={message} />
      <p className="text-muted">{message}</p>
    </div>
  );
}
