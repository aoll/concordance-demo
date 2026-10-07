import { CircleAlert } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// shadcn variant without next-themes: the theme follows the system, like the rest of the app.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      icons={{ error: <CircleAlert className="size-4" /> }}
      style={
        {
          '--normal-bg': 'var(--color-popover)',
          '--normal-text': 'var(--color-popover-foreground)',
          '--normal-border': 'var(--color-border)',
          '--border-radius': 'var(--radius-md)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
