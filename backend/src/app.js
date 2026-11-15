import express from 'express';
import { API_PREFIX } from '@dwelling/shared';

const app = express();

// 1. Content-Type guard — validate before JSON parsing.
//    Must be the very first middleware so the raw header is still available.
//    Rejects non-JSON bodies for state-changing requests with documented 400 JSON error.
//    Only applies to explicit state-changing methods.
//    Normalizes media types to lowercase for case-insensitive comparison.
//    Accept: application/json, application/json; charset=utf-8 (and uppercase variants).
//    Reject: text/plain, application/jsonp, application/xml, and any other non-JSON media type.
//    Bodyless requests without Content-Type are always allowed through.
//    Chunked transfer-encoding without Content-Type is treated as having a body.
//    The API path check uses an exact prefix boundary so that `/apix` does not match `/api`.
app.use((_request, _response, next) => {
  // Only apply to paths under the API prefix and explicit state-changing methods.
  // Allowlist: POST, PUT, PATCH, DELETE. OPTIONS (preflight), GET, HEAD are excluded.
  const methodAllowlist = ['POST', 'PUT', 'PATCH', 'DELETE'];
  // Exact prefix boundary: match `/api` exactly or paths starting with `/api/`
  // so that `/apix` does not incorrectly match the guard.
  const isApiPath =
    _request.path === API_PREFIX || _request.path.startsWith(`${API_PREFIX}/`);
  if (isApiPath && methodAllowlist.includes(_request.method)) {
    const contentType = _request.headers['content-type'];
    const contentLength = _request.headers['content-length'];
    const hasTransferEncodingChunked =
      _request.headers['transfer-encoding'] &&
      // Normalize to lowercase and check for exact 'chunked' token (comma-separated list support)
      _request.headers['transfer-encoding']
        .toString()
        .toLowerCase()
        .split(',')
        .some((token) => token.trim() === 'chunked');
    // Normalize Content-Type to lowercase for case-insensitive comparison.
    const normalizedContentType = contentType
      ? contentType.toLowerCase()
      : null;
    if (contentType) {
      // Content-Type header is present: validate the media type.
      // Extract the media type, ignoring parameters like charset, and normalize.
      const mediaType = normalizedContentType.split(';')[0].trim();
      if (mediaType !== 'application/json') {
        return _response.status(400).json({
          code: 'BAD_REQUEST',
          message:
            'Content-Type must be application/json for state-changing requests',
        });
      }
    } else {
      // No Content-Type header: distinguish bodyless from body-present.
      // A request with a body but no Content-Type must be rejected.
      // Check content-length > 0 or Transfer-Encoding: chunked.
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
      // Bodyless (no Content-Type, no body) — allow through
    }
  }
  next();
});

// 2. JSON body parser — defined once and registered globally.
//    Express will forward parse errors to the centralized error handler.
const jsonParser = express.json({ limit: '10kb', strict: true });
app.use(jsonParser);

// 3. Health check — independent route, registered before the 404 catch-all
//    so it never falls through to the unknown-route handler.
app.get(`${API_PREFIX}/health`, (_request, response) => {
  response.json({ status: 'ok' });
});

// 4. Centralized error handler middleware, exported for use in isolated tests.
//    This module exports the error handler so it can be used in a test environment
//    without the production test-only endpoint.
export function errorHandler(err, _request, _response, next) {
  // Malformed JSON from express.json() parser
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

  // Always 500 with INTERNAL code; never forward err.message, stack, or err.code.
  const status = 500;
  const code = 'INTERNAL';
  const message = 'Internal server error';

  // Log the full error server‑side only (development only).
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unhandled error:', err);
  }

  if (_response.headersSent) {
    return next(err);
  }

  _response.status(status).json({ code, message });
}

// 4. Unknown‑route catch‑all — return JSON 404, never HTML.
//    Must come after the health check.
app.use((_request, _response) => {
  _response.status(404).json({
    code: 'NOT_FOUND',
    message: 'The requested resource could not be found.',
  });
});

// Register the exported error handler as the last middleware.
app.use(errorHandler);

export default app;
