import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { API_PREFIX } from '@dwelling/shared';
import { env } from './config/env.js';
import { createAuthRouter } from './routes/auth.js';
import { createContactsRouter } from './routes/contacts.js';
import { createMessagesRouter } from './routes/messages.js';
import {
  createOriginCheck,
  normalizeOrigin,
} from './middleware/originCheck.js';
import { authLimiter, globalApiLimiter } from './middleware/rateLimit.js';
import {
  EmailTakenError,
  InvalidCredentialsError,
  ValidationError,
} from './auth/errors.js';
import {
  MessageConversationNotFoundError,
  MessageValidationError,
} from './messages/errors.js';

const allowedClientOrigin = normalizeOrigin(env.clientOrigin);

const corsOptions = {
  // An explicit origin, never `*`: the session cookie requires credentials.
  // Requests without an Origin header are not CORS requests (curl, same-origin
  // navigation), so no CORS header is added for them.
  origin(origin, callback) {
    if (!origin) {
      callback(null, false);
      return;
    }

    callback(null, normalizeOrigin(origin) === allowedClientOrigin);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  maxAge: 600,
};

/**
 * Builds the Express app.
 *
 * The limiters are injectable so tests can create an app with fresh counters.
 * The rate limiters are process-wide singletons by design; reusing them across
 * a test suite would make the stricter auth budget trip on unrelated tests.
 *
 * @param {{
 *   apiLimiter?: import('express').RequestHandler,
 *   credentialLimiter?: import('express').RequestHandler,
 * }} [options]
 */
export function createApp({
  apiLimiter = globalApiLimiter,
  credentialLimiter = authLimiter,
} = {}) {
  const app = express();

  // 0. Security headers — first, so every response (including rejections)
  //    carries them. Helmet defaults are kept; this is a JSON API with no
  //    inline HTML.
  app.use(helmet());

  // 0b. CORS — before the rate limiter and the Content-Type guard so an OPTIONS
  //     preflight is answered without consuming the request budget. CORS is not
  //     a CSRF control; the Origin/Referer guard below is.
  app.use(cors(corsOptions));

  // 0c. Global API rate limiter — after CORS, before body parsing, so rejecting
  //     a flood costs as little as possible. The health check is exempt.
  app.use(API_PREFIX, apiLimiter);

  // 1. Content-Type guard — validate before JSON parsing.
  app.use((_request, _response, next) => {
    const methodAllowlist = ['POST', 'PUT', 'PATCH', 'DELETE'];

    const isApiPath =
      _request.path === API_PREFIX ||
      _request.path.startsWith(`${API_PREFIX}/`);

    if (isApiPath && methodAllowlist.includes(_request.method)) {
      const contentType = _request.headers['content-type'];
      const contentLength = _request.headers['content-length'];

      const hasTransferEncodingChunked =
        _request.headers['transfer-encoding'] &&
        _request.headers['transfer-encoding']
          .toString()
          .toLowerCase()
          .split(',')
          .some((token) => token.trim() === 'chunked');

      const normalizedContentType = contentType
        ? contentType.toLowerCase()
        : null;

      if (contentType) {
        const mediaType = normalizedContentType.split(';')[0].trim();

        if (mediaType !== 'application/json') {
          return _response.status(400).json({
            code: 'BAD_REQUEST',
            message:
              'Content-Type must be application/json for state-changing requests',
          });
        }
      } else {
        const hasBody =
          (contentLength && parseInt(contentLength, 10) > 0) ||
          hasTransferEncodingChunked;

        if (hasBody) {
          return _response.status(400).json({
            code: 'BAD_REQUEST',
            message:
              'Content-Type must be application/json for state-changing requests',
          });
        }
      }
    }

    next();
  });

  // 2. JSON body parser.
  const jsonParser = express.json({ limit: '10kb', strict: true });
  app.use(jsonParser);

  // 2b. Cookie parser — populates `request.cookies` so the auth middleware can
  //     read the HttpOnly session cookie (ADR-0022). It only parses; it does not
  //     authenticate anything by itself.
  app.use(cookieParser());

  // 2c. Origin/Referer guard — rejects state-changing requests whose origin is
  //     not `CLIENT_ORIGIN` with `403 ORIGIN_NOT_ALLOWED`. GET is unaffected.
  app.use(API_PREFIX, createOriginCheck());

  // 2d. Auth router (signup and login carry the stricter rate limiter).
  app.use(API_PREFIX, createAuthRouter({ credentialLimiter }));

  // 2e. Contacts router. GET /api/contacts is read-only and inherits the
  //     global API limiter and the Origin/Referer guard (GET is unaffected).
  app.use(API_PREFIX, createContactsRouter());

  // 2f. Messages router. POST /api/conversations/:id/messages stores a message;
  //     the sender is the session user and participation is checked by the
  //     service. A state-changing route, so the Origin guard applies.
  app.use(API_PREFIX, createMessagesRouter());

  // 3. Health check — independent route, registered before the 404 catch-all
  //    so it never falls through to the unknown-route handler.
  app.get(`${API_PREFIX}/health`, (_request, response) => {
    response.json({ status: 'ok' });
  });

  // 5. Unknown-route catch-all.
  app.use((_request, _response) => {
    _response.status(404).json({
      code: 'NOT_FOUND',
      message: 'The requested resource could not be found.',
    });
  });

  // Register error handler last.
  app.use(errorHandler);

  return app;
}

// 4. Centralized error handler.
export function errorHandler(err, _request, _response, next) {
  if (err.type === 'entity.parse.failed') {
    if (_response.headersSent) {
      return next(err);
    }

    _response.status(400).json({
      code: 'BAD_REQUEST',
      message: 'Malformed JSON request body',
    });
    return;
  }

  if (err instanceof ValidationError) {
    return _response.status(400).json({
      code: 'VALIDATION_FAILED',
      message: 'Invalid input',
    });
  }

  if (err instanceof EmailTakenError) {
    return _response.status(409).json({
      code: 'EMAIL_TAKEN',
      message: err.message,
    });
  }

  if (err instanceof InvalidCredentialsError) {
    return _response.status(401).json({
      code: 'INVALID_CREDENTIALS',
      message: err.message,
    });
  }

  if (err instanceof MessageValidationError) {
    return _response.status(400).json({
      code: 'VALIDATION_FAILED',
      message: 'Invalid input',
    });
  }

  if (err instanceof MessageConversationNotFoundError) {
    return _response.status(404).json({
      code: 'CONVERSATION_NOT_FOUND',
      message: err.message,
    });
  }

  // Always 500 with INTERNAL code; never forward err.message, stack, or err.code.
  const status = 500;
  const code = 'INTERNAL';
  const message = 'Internal server error';

  // Log the full error server-side only (development only).
  if (!env.isProduction) {
    console.error('Unhandled error:', err);
  }

  if (_response.headersSent) {
    return next(err);
  }

  _response.status(status).json({ code, message });
}

const app = createApp();

export default app;
