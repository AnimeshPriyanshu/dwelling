import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import {
  getConversationForUser,
  getOrCreateConversation,
} from '../conversations/service.js';
import { validateCreateConversationInput } from '../conversations/validation.js';

/**
 * Builds the conversations router.
 *
 * `POST /conversations` resolves the single canonical conversation for the
 * caller and a peer, creating it on first use. `GET /conversations/:id` loads
 * one conversation for a participant. Identity always comes from
 * `request.auth.userId`; the caller is never read from the body or the path.
 */
export function createConversationsRouter() {
  const conversationsRouter = Router();

  conversationsRouter.post(
    '/conversations',
    requireAuth,
    async (request, response, next) => {
      try {
        const { userId } = validateCreateConversationInput(request.body);
        const { conversation, created } = await getOrCreateConversation(
          request.auth.userId,
          userId
        );

        response.status(created ? 201 : 200).json({ conversation });
      } catch (error) {
        next(error);
      }
    }
  );

  conversationsRouter.get(
    '/conversations/:id',
    requireAuth,
    async (request, response, next) => {
      try {
        const conversation = await getConversationForUser(
          request.auth.userId,
          request.params.id
        );

        response.status(200).json({ conversation });
      } catch (error) {
        next(error);
      }
    }
  );

  return conversationsRouter;
}
