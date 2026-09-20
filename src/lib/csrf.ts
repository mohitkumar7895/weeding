export function getAllowedOrigins(requestUrl: string): string[] {
  const origins = new Set<string>();
  try {
    origins.add(new URL(requestUrl).origin);
  } catch {
    /* ignore */
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      origins.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
    } catch {
      /* ignore */
    }
  }
  const extra = process.env.ALLOWED_ORIGINS || '';
  extra.split(',').forEach((item) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    try {
      origins.add(new URL(trimmed).origin);
    } catch {
      origins.add(trimmed.replace(/\/$/, ''));
    }
  });
  origins.add('http://localhost:3000');
  origins.add('http://127.0.0.1:3000');
  return Array.from(origins);
}

export function isCsrfExemptPath(pathname: string): boolean {
  return (
    pathname === '/api/payments/webhook' ||
    pathname.startsWith('/api/payments/webhook/')
  );
}

export function isMutatingMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

export function originAllowed(requestUrl: string, origin: string | null, referer: string | null): boolean {
  const allowed = getAllowedOrigins(requestUrl);
  const candidates: string[] = [];
  if (origin) candidates.push(origin);
  if (referer) {
    try {
      candidates.push(new URL(referer).origin);
    } catch {
      /* ignore */
    }
  }
  if (candidates.length === 0) {
    try {
      const host = new URL(requestUrl).host;
      return allowed.some((item) => {
        try {
          return new URL(item).host === host;
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }
  if (candidates.some((candidate) => allowed.includes(candidate))) return true;
  try {
    const reqHost = new URL(requestUrl).host;
    return candidates.some((candidate) => {
      try {
        return new URL(candidate).host === reqHost;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
