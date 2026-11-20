import { API_PREFIX } from '@dwelling/shared';
import { env } from './config/env.js';
import { createAuthRouter } from './routes/auth.js';
import { createContactsRouter } from './routes/contacts.js';
import { createConversationsRouter } from './routes/conversations.js';
import { createMessagesRouter } from './routes/messages.js';
import {
  InvalidCredentialsError,
  ValidationError,
  MessageConversationNotFoundError,
  MessageValidationError,
} from './messages/errors.js';

const allowedClientOrigin = normalizeOrigin(env.clientOrigin);

export function createApp() {
  const app = express();

  // 1. Auth router.
  app.use(API_PREFIX, createAuthRouter());

  // 2a. Contacts router.
  app.use(API_PREFIX, createContactsRouter());

  // 2b. Messages router. POST /api/conversations/:id/messages stores a message;
  //     the sender is the session user and participation is checked by the
  //     service. A state-changing route, so the Origin guard applies.
  app.use(API_PREFIX, createMessagesRouter());

  // 2f. Conversations router.
  app.use(API_PREFIX, createConversationsRouter());

  // 3. Health check — independent route, registered before the 404 catch-all
  //    so it never falls through to the unknown-route handler.
  app.get(`${API_PREFIX}/health`, (_request, response) => {
    response.status(200).json({ code: 'OK', message: 'healthy' });
  });

  // 4. Origin/Referer guard — wraps state-changing routes only.
  app.use(API_PREFIX, originGuard());

  // 5. Unknown route — 404 handler, must stay last.
  app.use(API_PREFIX, notFoundHandler());

  // 6. Error handler — must stay last. Catches MessageValidationError → 400
  //    and MessageConversationNotFoundError → 404 instead of passing to
  //    next(error) which caused 500 errors.
  app.use(errorHandler);

  return app;
}

function errorHandler(err, _request, _response, next) {
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
  _response.status(status).json({ code, message: 'Internal server error' });
  next();
}
