'use client';

import { useEffect } from 'react';

export default function ApiDocsPage() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
    script.onload = () => {
      (window as any).SwaggerUIBundle({
        url: '/api/openapi',
        dom_id: '#swagger-ui',
      });
    };
    document.body.appendChild(script);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
    document.head.appendChild(link);
  }, []);

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <div id="swagger-ui" />
    </div>
  );
}
