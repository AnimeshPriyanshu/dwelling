import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { getOrCreateConversation, assertParticipant } from '../conversations/service.js';
import { listMessages } from '../messages/service.js';

/** Builds the conversations router.
 *
 * Implements the Defined endpoints from docs/api/README.md:
 *   GET    /api/conversations
 *   POST   /api/conversations
 *   GET    /api/conversations/:conversationId
 *   GET    /api/conversations/:conversationId/messages
 *
 * Caller identity comes only from `request.auth.userId`, which `requireAuth`
 * sets from the verified session cookie.
 */

export function createConversationsRouter() {
  const conversationsRouter = Router();

  // 1a. GET /api/conversations — list the caller's conversations (Defined)
  conversationsRouter.get(
    '/',
    requireAuth,
    async (request, response, next) => {
      try {
        const callerId = request.auth.userId;
        const prisma = request.prisma || (await import('../db/prisma.js')).prisma;

        // Find all conversations where the caller is a participant
        const conversations = await prisma.conversation.findMany({
          where: {
            OR: [
              { userOneId: callerId },
              { userTwoId: callerId },
            ],
          },
          select: {
            id: true,
            userOneId: true,
            userTwoId: true,
            createdAt: true,
            userOne: { select: { id: true, displayName: true } },
            userTwo: { select: { id: true, displayName: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        response.status(200).json({ conversations });
      } catch (error) {
        next(error);
      }
    }
  );

  // 1b. POST /api/conversations — get or create conversation for a pair (Defined)
  conversationsRouter.post(
    '/',
    requireAuth,
    async (request, response, next) => {
      try {
        const callerId = request.auth.userId;
        const { peerId } = request.body;

        if (!peerId || typeof peerId !== 'string' || peerId.trim() === '') {
          return response.status(400).json({
            code: 'VALIDATION_FAILED',
            message: "'peerId' is required and must be a non-empty string.",
          });
        }

        const result = await getOrCreateConversation(callerId, peerId);

        // Map to the documented response shape.
        response.status(result.created ? 201 : 200).json({
          conversation: {
            id: result.conversation.id,
            participants: result.conversation.participants,
            createdAt: result.conversation.createdAt,
          },
        });
      } catch (error) {
        if (error.name === 'SelfConversationError') {
          return response.status(400).json({
            code: 'SELF_CONVERSATION',
            message: error.message,
          });
        }

        if (error.name === 'ConversationUserNotFoundError') {
          return response.status(404).json({
            code: 'USER_NOT_FOUND',
            message: error.message,
          });
        }

        if (error.name === 'ConversationNotContactsError') {
          return response.status(403).json({
            code: 'NOT_CONTACTS',
            message: error.message,
          });
        }

        // Unexpected error — sanitized 500; no stack trace or DB details leaked
        response.status(500).json({
          code: 'INTERNAL',
          message: 'Internal server error',
        });
      }
    }
  );

  // 1c. GET /api/conversations/:conversationId — fetch one conversation (Defined)
  conversationsRouter.get(
    '/:conversationId',
    requireAuth,
    async (request, response, next) => {
      try {
        const callerId = request.auth.userId;
        const { conversationId } = request.params;

        const conversation = await assertParticipant(callerId, conversationId);

        // Load the full conversation with participant details
        const prisma = request.prisma || (await import('../db/prisma.js')).prisma;
        const row = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: {
            id: true,
            createdAt: true,
            userOne: { select: { id: true, displayName: true } },
            userTwo: { select: { id: true, displayName: true } },
          },
        });

        if (!row) {
          return response.status(404).json({
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
          });
        }

        response.status(200).json({ conversation: row });
      } catch (error) {
        if (error.name === 'MessageConversationNotFoundError') {
          return response.status(404).json({
            code: 'CONVERSATION_NOT_FOUND',
            message: error.message,
          });
        }

        next(error);
      }
    }
  );

  // 1d. GET /api/conversations/:conversationId/messages — read message history (Defined)
  conversationsRouter.get(
    '/:conversationId/messages',
    requireAuth,
    async (request, response, next) => {
      try {
        const callerId = request.auth.userId;
        const { conversationId } = request.params;
        const { cursor, limit } = request.query;

        const result = await listMessages(callerId, conversationId, {
          cursor: cursor ? String(cursor) : undefined,
          limit: limit ? parseInt(String(limit), 10) : undefined,
        });

        response.status(200).json({
          messages: result.messages,
          nextCursor: result.nextCursor,
        });
      } catch (error) {
        if (error.name === 'InvalidMessageCursorError') {
          return response.status(400).json({
            code: 'INVALID_CURSOR',
            message: error.message,
          });
        }

        if (error.name === 'InvalidMessageLimitError') {
          return response.status(400).json({
            code: 'INVALID_LIMIT',
            message: error.message,
          });
        }

        if (error.name === 'MessageConversationNotFoundError') {
          return response.status(404).json({
            code: 'CONVERSATION_NOT_FOUND',
            message: error.message,
          });
        }

        next(error);
      }
    }
  );

  // 1e. POST /api/conversations/:conversationId/messages — send a message (Defined)
  conversationsRouter.post(
    '/:conversationId/messages',
    requireAuth,
    async (request, response, next) => {
      try {
        const callerId = request.auth.userId;
        const { conversationId } = request.params;
        const { body: content } = request.body;

        if (!content || typeof content !== 'string' || content.trim() === '') {
          return response.status(400).json({
            code: 'VALIDATION_FAILED',
            message: "'body' is required and must be a non-empty string.",
          });
        }

        // First verify the caller is a participant in the conversation
        await assertParticipant(callerId, conversationId);

        const prisma = request.prisma || (await import('../db/prisma.js')).prisma;

        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: callerId,
            content,
          },
          select: {
            id: true,
            conversationId: true,
            senderId: true,
            content: true,
            createdAt: true,
          },
        });

        response.status(201).json({
          message: {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            body: message.content,
            createdAt: message.createdAt,
          },
        });
      } catch (error) {
        if (error.name === 'SelfConversationError') {
          return response.status(400).json({
            code: 'SELF_CONVERSATION',
            message: error.message,
          });
        }

        if (error.name === 'MessageConversationNotFoundError') {
          return response.status(404).json({
            code: 'CONVERSATION_NOT_FOUND',
            message: error.message,
          });
        }

        if (error.name === 'TypeError') {
          return response.status(400).json({
            code: 'VALIDATION_FAILED',
            message: error.message,
          });
        }

        // Unexpected error — sanitized 500; no stack trace or DB details leaked
        response.status(500).json({
          code: 'INTERNAL',
          message: 'Internal server error',
        });
      }
    }
  );

  return conversationsRouter;
}