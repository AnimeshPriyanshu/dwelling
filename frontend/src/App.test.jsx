import {
  render,
  cleanup,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";

const { apiMock, socketListeners, socketEmit, unauthorized } = vi.hoisted(
  () => {
    const listeners = new Map();

    return {
      unauthorized: { handler: null },
      apiMock: {
        me: vi.fn(),
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        contacts: vi.fn(),
        addContact: vi.fn(),
        openConversation: vi.fn(),
        getConversation: vi.fn(),
        messages: vi.fn(),
        sendMessage: vi.fn(),
      },
      socketListeners: listeners,
      socketEmit: vi.fn(),
    };
  },
);

vi.mock("./api/client", () => ({
  api: apiMock,
  ApiError: class ApiError extends Error {},
  setUnauthorizedHandler: vi.fn((handler) => {
    unauthorized.handler = handler;
  }),
}));

vi.mock("./api/socket", () => ({
  connectSocket: vi.fn(() => ({
    connected: true,
    on: vi.fn((event, handler) => {
      const current = socketListeners.get(event) || [];
      socketListeners.set(event, [...current, handler]);
    }),
    off: vi.fn((event, handler) => {
      const current = socketListeners.get(event) || [];
      socketListeners.set(
        event,
        current.filter((entry) => entry !== handler),
      );
    }),
    emit: socketEmit,
  })),
  disconnectSocket: vi.fn(),
}));

vi.mock("./world/game", () => ({
  createGame: vi.fn(() => ({ destroy: vi.fn() })),
}));

vi.mock("./bridge", () => {
  const handlers = new Map();
  let worldContacts = [];

  const publishToSubscribers = (topic, payload) => {
    (handlers.get(topic) || []).forEach((handler) => handler(payload));
  };

  return {
    EventType: {
      DWELLING_INTERACT: "dwelling:interact",
      MAP_CHANGED: "map:changed",
      UI_STATE: "ui:state",
      SYNC_CONTACTS: "contacts:sync",
    },
    requestMapSwitch: vi.fn(),
    setUiInputBlocked: vi.fn(),
    setWorldContacts: vi.fn((assignments) => {
      worldContacts = assignments;
      publishToSubscribers("contacts:sync", { assignments });
    }),
    getWorldContacts: vi.fn(() => worldContacts),
    subscribe: vi.fn((topic, handler) => {
      handlers.set(topic, [...(handlers.get(topic) || []), handler]);
      return () => {
        handlers.set(
          topic,
          (handlers.get(topic) || []).filter((entry) => entry !== handler),
        );
      };
    }),
    publishToSubscribers,
    unsubscribeAll: vi.fn(),
  };
});

import App from "./App";
import {
  publishToSubscribers,
  requestMapSwitch,
  setUiInputBlocked,
  EventType,
} from "./bridge";
import { setWorldContacts } from "./bridge";

const USER = { id: "user_alice", displayName: "Alice" };
const PEER = { id: "user_bob", displayName: "Bo" };
const CONVERSATION = {
  id: "conversation_1",
  participants: [USER, PEER],
  createdAt: "2026-11-20T09:00:00.000Z",
};
const CONVERSATION_B = {
  id: "conversation_2",
  participants: [USER, { id: "user_cara", displayName: "Cara" }],
  createdAt: "2026-11-20T09:05:00.000Z",
};

const interact = (dwelling = {}) => {
  act(() => {
    publishToSubscribers(EventType.DWELLING_INTERACT, {
      type: EventType.DWELLING_INTERACT,
      dwelling: {
        id: "dwelling-redwood",
        contactId: "contact-elowen",
        name: "Redwood Cottage",
        contact: "Bo",
        role: "Carpenter",
        contactUserId: PEER.id,
        ...dwelling,
      },
    });
  });
};

beforeEach(() => {
  socketListeners.clear();
  unauthorized.handler = null;
  Object.values(apiMock).forEach((fn) => fn.mockReset());
  socketEmit.mockReset();
  requestMapSwitch.mockReset();
  setUiInputBlocked.mockReset();

  apiMock.me.mockResolvedValue({ user: USER });
  apiMock.contacts.mockResolvedValue({
    contacts: [
      { user: PEER },
      { user: { id: "user_cara", displayName: "Cara" } },
    ],
  });
  apiMock.openConversation.mockResolvedValue({ conversation: CONVERSATION });
  apiMock.messages.mockResolvedValue({ messages: [], nextCursor: null });
});

afterEach(() => {
  cleanup();
});

describe("App session", () => {
  it("shows the auth screen when there is no session", async () => {
    apiMock.me.mockRejectedValue(new Error("AUTH_REQUIRED"));

    render(<App />);

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeTruthy();
    await waitFor(() =>
      expect(setUiInputBlocked).toHaveBeenLastCalledWith(true),
    );
    expect(apiMock.contacts).not.toHaveBeenCalled();
    expect(setWorldContacts).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ userId: PEER.id })]),
    );
  });

  it("returns to sign-in when the session becomes invalid", async () => {
    render(<App />);
    await screen.findByRole("button", { name: "Contacts (2)" });
    interact();
    await screen.findByText(/no messages yet/i);

    act(() => {
      unauthorized.handler();
    });

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(apiMock.logout).not.toHaveBeenCalled();
    expect(socketEmit).toHaveBeenCalledWith("conversation:unsubscribe", {
      conversationId: CONVERSATION.id,
    });
  });

  it("loads contacts and binds them to dwelling slots after sign-in", async () => {
    render(<App />);

    expect(
      await screen.findByRole("button", { name: "Contacts (2)" }),
    ).toBeTruthy();

    await waitFor(() =>
      expect(setUiInputBlocked).toHaveBeenLastCalledWith(false),
    );

    await waitFor(() => {
      const assignments = setWorldContacts.mock.calls.at(-1)[0];
      expect(assignments[0]).toEqual({
        slotContactId: "contact-elowen",
        userId: PEER.id,
        displayName: "Bo",
      });
      expect(assignments[1]).toEqual({
        slotContactId: "contact-rowan",
        userId: "user_cara",
        displayName: "Cara",
      });
    });
  });
});

describe("App conversation drawer", () => {
  it("opens a contact's conversation and shows persisted history", async () => {
    apiMock.messages.mockResolvedValue({
      messages: [
        {
          id: "message_2",
          conversationId: CONVERSATION.id,
          senderId: PEER.id,
          body: "The kettle is on.",
          createdAt: "2026-11-20T09:30:00.000Z",
        },
        {
          id: "message_1",
          conversationId: CONVERSATION.id,
          senderId: USER.id,
          body: "Hello neighbour.",
          createdAt: "2026-11-20T09:29:00.000Z",
        },
      ],
      nextCursor: null,
    });

    render(<App />);
    await screen.findByRole("button", { name: "Contacts (2)" });

    interact();

    expect(await screen.findByText("The kettle is on.")).toBeTruthy();
    expect(screen.getByText("Hello neighbour.")).toBeTruthy();
    expect(apiMock.openConversation).toHaveBeenCalledWith(PEER.id);
    expect(apiMock.messages).toHaveBeenCalledWith(CONVERSATION.id);
    expect(socketEmit).toHaveBeenCalledWith("conversation:subscribe", {
      conversationId: CONVERSATION.id,
    });
  });

  it("does not open a live conversation for an unlinked house", async () => {
    render(<App />);
    await screen.findByRole("button", { name: "Contacts (2)" });

    interact({ contactUserId: null });

    expect(
      await screen.findByText(/not linked to one of your contacts/i),
    ).toBeTruthy();
    expect(apiMock.openConversation).not.toHaveBeenCalled();
  });

  it("sends a message and appends it to the feed", async () => {
    apiMock.sendMessage.mockResolvedValue({
      message: {
        id: "message_3",
        conversationId: CONVERSATION.id,
        senderId: USER.id,
        body: "On my way!",
        createdAt: "2026-11-20T09:31:00.000Z",
      },
    });

    render(<App />);
    await screen.findByRole("button", { name: "Contacts (2)" });
    interact();

    const input = await screen.findByLabelText("Message");
    await waitFor(() => expect(input.disabled).toBe(false));

    fireEvent.change(input, { target: { value: "On my way!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("On my way!")).toBeTruthy();
    expect(apiMock.sendMessage).toHaveBeenCalledWith(
      CONVERSATION.id,
      "On my way!",
    );
    expect(input.value).toBe("");
  });

  it("appends a live message delivered over the socket", async () => {
    render(<App />);
    await screen.findByRole("button", { name: "Contacts (2)" });
    interact();
    await screen.findByText(/no messages yet/i);

    act(() => {
      (socketListeners.get("message:created") || []).forEach((handler) =>
        handler({
          id: "message_live",
          conversationId: CONVERSATION.id,
          senderId: PEER.id,
          body: "Are you there?",
          createdAt: "2026-11-20T09:32:00.000Z",
        }),
      );
    });

    expect(await screen.findByText("Are you there?")).toBeTruthy();
  });

  it("ignores a send response from a conversation that is no longer open", async () => {
    let resolveSend;
    apiMock.sendMessage.mockReturnValue(
      new Promise((resolve) => {
        resolveSend = resolve;
      }),
    );
    apiMock.openConversation
      .mockResolvedValueOnce({ conversation: CONVERSATION })
      .mockResolvedValueOnce({ conversation: CONVERSATION_B });

    render(<App />);
    await screen.findByRole("button", { name: "Contacts (2)" });
    interact();

    const input = await screen.findByLabelText("Message");
    await waitFor(() => expect(input.disabled).toBe(false));
    fireEvent.change(input, { target: { value: "From conversation A" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(apiMock.sendMessage).toHaveBeenCalled());

    fireEvent.keyDown(window, { key: "Escape" });
    interact();
    await screen.findByText(/no messages yet/i);

    await act(async () => {
      resolveSend({
        message: {
          id: "message_stale",
          conversationId: CONVERSATION.id,
          senderId: USER.id,
          body: "From conversation A",
          createdAt: "2026-11-20T09:33:00.000Z",
        },
      });
    });

    expect(screen.queryByText("From conversation A")).toBeNull();
  });

  it("keeps a live message that arrives while history is loading", async () => {
    let resolveHistory;
    apiMock.messages.mockReturnValue(
      new Promise((resolve) => {
        resolveHistory = resolve;
      }),
    );

    render(<App />);
    await screen.findByRole("button", { name: "Contacts (2)" });
    interact();
    await waitFor(() =>
      expect(apiMock.messages).toHaveBeenCalledWith(CONVERSATION.id),
    );

    act(() => {
      (socketListeners.get("message:created") || []).forEach((handler) =>
        handler({
          id: "message_live",
          conversationId: CONVERSATION.id,
          senderId: PEER.id,
          body: "Live while loading",
          createdAt: "2026-11-20T09:34:00.000Z",
        }),
      );
    });

    await act(async () => {
      resolveHistory({
        messages: [
          {
            id: "message_history",
            conversationId: CONVERSATION.id,
            senderId: USER.id,
            body: "From history",
            createdAt: "2026-11-20T09:30:00.000Z",
          },
        ],
        nextCursor: null,
      });
    });

    expect(await screen.findByText("From history")).toBeTruthy();
    expect(screen.getByText("Live while loading")).toBeTruthy();
  });

  it("refetches history after reconnect and merges without duplicates", async () => {
    const first = {
      id: "message_1",
      conversationId: CONVERSATION.id,
      senderId: PEER.id,
      body: "First",
      createdAt: "2026-11-20T09:30:00.000Z",
    };
    const second = {
      id: "message_2",
      conversationId: CONVERSATION.id,
      senderId: PEER.id,
      body: "Second",
      createdAt: "2026-11-20T09:31:00.000Z",
    };
    apiMock.messages
      .mockResolvedValueOnce({ messages: [first], nextCursor: null })
      .mockResolvedValue({ messages: [second, first], nextCursor: null });

    render(<App />);
    await screen.findByRole("button", { name: "Contacts (2)" });
    interact();
    await screen.findByText("First");

    const connectHandlers = socketListeners.get("connect") || [];
    expect(connectHandlers.length).toBeGreaterThan(0);

    await act(async () => {
      connectHandlers.forEach((handler) => handler());
    });

    await waitFor(() => expect(apiMock.messages).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Second")).toBeTruthy();
    expect(screen.getAllByText("First")).toHaveLength(1);
  });

  it("closes and cleans up chat when the active map is selected", async () => {
    render(<App />);
    await screen.findByRole("button", { name: "Contacts (2)" });
    interact();
    await screen.findByText(/no messages yet/i);

    const select = screen.getByLabelText("Switch map");
    fireEvent.change(select, { target: { value: select.value } });

    await waitFor(() =>
      expect(requestMapSwitch).toHaveBeenCalledWith(select.value),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(socketEmit).toHaveBeenCalledWith("conversation:unsubscribe", {
      conversationId: CONVERSATION.id,
    });
  });
});
