import express from 'express';
import cookieParser from 'cookie-parser';
import { API_PREFIX } from '@dwelling/shared';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.js';
import {
  EmailTakenError,
  InvalidCredentialsError,
  ValidationError,
} from './auth/errors.js';

const app = express();

// 1. Content-Type guard — validate before JSON parsing.
app.use((_request, _response, next) => {
  const methodAllowlist = ['POST', 'PUT', 'PATCH', 'DELETE'];

  const isApiPath =
    _request.path === API_PREFIX || _request.path.startsWith(`${API_PREFIX}/`);

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

app.use(API_PREFIX, authRouter);

// 3. Health check — independent route, registered before the 404 catch-all
//    so it never falls through to the unknown-route handler.
app.get(`${API_PREFIX}/health`, (_request, response) => {
  response.json({ status: 'ok' });
});

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

// 5. Unknown-route catch-all.
app.use((_request, _response) => {
  _response.status(404).json({
    code: 'NOT_FOUND',
    message: 'The requested resource could not be found.',
  });
});

// Register error handler last.
app.use(errorHandler);

export default app;
