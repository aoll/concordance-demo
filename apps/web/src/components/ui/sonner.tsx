import { CircleAlert } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Variante shadcn sans next-themes : le thème suit le système, comme le reste de l'app.
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
