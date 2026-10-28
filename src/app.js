import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

export const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Dynamic CORS configuration supporting localhost and local network IPs (e.g. 10.x.x.x, 192.168.x.x)
const allowedOrigins = [
  config.frontendOrigin,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

const isOriginAllowed = (origin) => {
  if (!origin) return true; // allow curl, mobile apps, same-origin
  if (allowedOrigins.includes(origin)) return true;

  try {
    const url = new URL(origin);
    // Allow any localhost port or private LAN IP in development
    if (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname.startsWith('10.') ||
      url.hostname.startsWith('192.168.') ||
      url.hostname.startsWith('172.')
    ) {
      return true;
    }
  } catch {
    // Malformed origin URL
  }

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Payload size limits to protect server resources
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global rate limiting
app.use('/api', apiLimiter);

// Mount API routes
app.use('/api', routes);

// 404 & Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);
