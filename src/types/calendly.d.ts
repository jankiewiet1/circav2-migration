interface CalendlyWidgetOptions {
  url: string;
  prefill?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  };
  parentElement: HTMLElement | null;
  styles?: {
    height?: string;
    minHeight?: string;
  };
}

interface Calendly {
  initInlineWidget: (options: CalendlyWidgetOptions) => void;
  initPopupWidget: (options: CalendlyWidgetOptions) => void;
}

declare global {
  interface Window {
    Calendly: Calendly;
  }
} 