import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  type?: string;
  url?: string;
}

export function SEO({
  title = 'Stride',
  description = 'We help teams securely collaborate, organize tasks, and communicate in real-time globally. Without the clutter and noise.',
  type = 'website',
  url = 'https://stride.workspace.app/'
}: SEOProps) {
  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      
      {/* Twitter */}
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      
      <link rel="canonical" href={url} />
    </Helmet>
  );
}
