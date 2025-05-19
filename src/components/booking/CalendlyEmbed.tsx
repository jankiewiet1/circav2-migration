import { useEffect, useRef } from 'react';

interface CalendlyEmbedProps {
  url: string;
  prefill?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  };
}

export function CalendlyEmbed({ url, prefill }: CalendlyEmbedProps) {
  // Construct the URL with prefill parameters
  const constructUrl = () => {
    const baseUrl = url;
    const params = new URLSearchParams();
    
    if (prefill?.email) params.append('email', prefill.email);
    if (prefill?.firstName) params.append('first_name', prefill.firstName);
    if (prefill?.lastName) params.append('last_name', prefill.lastName);
    if (prefill?.name) params.append('name', prefill.name);
    
    const queryString = params.toString();
    return `${baseUrl}${queryString ? '?' + queryString : ''}`;
  };

  return (
    <iframe
      src={constructUrl()}
      width="100%"
      height="700px"
      frameBorder="0"
      title="Select a time for your onboarding call"
      style={{ minWidth: '320px', border: 'none' }}
    />
  );
} 