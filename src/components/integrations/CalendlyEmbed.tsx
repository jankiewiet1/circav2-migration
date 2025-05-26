import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CalendlyEmbedProps {
  url: string;
  prefill?: {
    name?: string;
    email?: string;
    customAnswers?: Record<string, string>;
  };
  utm?: {
    utmCampaign?: string;
    utmSource?: string;
    utmMedium?: string;
    utmContent?: string;
    utmTerm?: string;
  };
  className?: string;
  title?: string;
  description?: string;
}

export default function CalendlyEmbed({
  url,
  prefill,
  utm,
  className = '',
  title,
  description
}: CalendlyEmbedProps) {
  const { t } = useTranslation();
  const calendlyEmbedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only load Calendly script if it doesn't exist yet
    if (!window.Calendly) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.body.appendChild(script);
    }

    // Clean up on component unmount
    return () => {
      // If this is the only Calendly component, remove the script
      if (document.querySelectorAll('[data-calendly-embed]').length <= 1) {
        const scripts = document.querySelectorAll('script[src*="calendly.com/assets/external/widget.js"]');
        scripts.forEach(script => script.remove());
      }
    };
  }, []);

  useEffect(() => {
    if (!calendlyEmbedRef.current || !window.Calendly) return;

    // Clear any existing Calendly widget
    calendlyEmbedRef.current.innerHTML = '';

    // Initialize Calendly inline widget
    window.Calendly.initInlineWidget({
      url,
      parentElement: calendlyEmbedRef.current,
      prefill,
      utm
    });
  }, [url, prefill, utm]);

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="px-0 pb-0">
        <div 
          ref={calendlyEmbedRef} 
          data-calendly-embed 
          style={{ minHeight: '650px', width: '100%' }} 
        />
      </CardContent>
    </Card>
  );
}

// Add TypeScript interface for the Calendly global object
declare global {
  interface Window {
    Calendly: {
      initInlineWidget: (options: {
        url: string;
        parentElement: HTMLElement;
        prefill?: {
          name?: string;
          email?: string;
          customAnswers?: Record<string, string>;
        };
        utm?: {
          utmCampaign?: string;
          utmSource?: string;
          utmMedium?: string;
          utmContent?: string;
          utmTerm?: string;
        };
      }) => void;
    };
  }
} 