declare module '@/components/ui/toast' {
  import * as React from 'react';

  export type ToastActionElement = React.ReactNode;
  export interface ToastProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: ToastActionElement;
  }
}
