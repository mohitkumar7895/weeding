const fs = require('fs');
const path = require('path');

function loadEnvFile(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const express = require('express');
const next = require('next');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = parseInt(process.env.PORT || '3000', 10);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

// Rate Limiting Config
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes by default
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10); // 100 requests per IP

app.prepare().then(() => {
  const server = express();

  // Trust proxy if we are behind a reverse proxy (e.g., Nginx, Heroku, AWS ELB)
  server.set('trust proxy', 1);

  // 1. Security Headers (Helmet)
  // Disable contentSecurityPolicy in development if it interferes with Next.js HMR or inline scripts, 
  // but keep it on in production if possible (or customize it to allow Next.js assets).
  server.use(helmet({
    contentSecurityPolicy: false, // Often requires careful tuning with Next.js inline scripts
    crossOriginEmbedderPolicy: false, // Prevents loading external images/media if set to true strictly
  }));

  // 2. CORS handling for API routes
  server.use('/api', cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests) if desired, 
      // or strictly enforce origin. Currently allowing no origin for server-to-server.
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  // 3. Rate Limiting for API routes
  const apiLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    max: (req) => (req.method === 'GET' ? Math.max(RATE_LIMIT_MAX_REQUESTS, 2000) : RATE_LIMIT_MAX_REQUESTS),
    skip: (req) => {
      if (dev) return true;
      const url = req.originalUrl || req.url || '';
      return url.startsWith('/api/auth/me') || url.startsWith('/api/auth/session');
    },
    message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  });
  server.use('/api', apiLimiter);

  // 4. Structured Logging Middleware
  server.use((req, res, nextFn) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
      };
      
      // Do not log static assets to reduce noise in production
      if (!req.originalUrl.startsWith('/_next') && !req.originalUrl.startsWith('/images')) {
        console.log(JSON.stringify(logData));
      }
    });
    nextFn();
  });

  // 5. Catch-all Next.js request handler
  server.use((req, res) => {
    return handle(req, res);
  });

  // Start HTTP server
  const httpServer = http.createServer(server);
  
  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT} in ${dev ? 'development' : 'production'} mode`);
  });

  // Graceful Shutdown implementation
  const shutdown = () => {
    console.log('SIGTERM/SIGINT signal received: closing HTTP server');
    httpServer.close(() => {
      console.log('HTTP server closed');
      // If you had a standalone database pool in this file, you would close it here.
      // Next.js API routes will naturally terminate when the server closes.
      process.exit(0);
    });
    
    // Force close after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('Forcing shutdown after 10s timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

}).catch((err) => {
  console.error('Error starting Next.js server:', err);
  process.exit(1);
});
