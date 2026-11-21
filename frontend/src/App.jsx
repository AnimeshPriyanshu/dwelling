import { useState, useEffect, useRef, useCallback } from "react";
import { createGame } from "./world/game";
import {
  EventType,
  requestMapSwitch,
  setUiInputBlocked,
  setWorldContacts,
  subscribe,
} from "./bridge";
import {
  getDefaultMap,
  listDwellingSlots,
  listMaps,
  summarizeMap,
} from "./world/maps";
import { AVATAR_URLS } from "./world/assets";
import { api, setUnauthorizedHandler } from "./api/client";
import { connectSocket, disconnectSocket } from "./api/socket";
import AuthScreen from "./auth/AuthScreen";
import ContactsPanel from "./contacts/ContactsPanel";

// Contact portraits composited from the supplied Sunnyside character pack.
// Paths live in `world/assets.js`; this map only picks the portrait per
// authored dwelling slot.
const CONTACT_AVATARS = {
  "contact-elowen": AVATAR_URLS.curlyhair,
  "contact-rowan": AVATAR_URLS.longhair,
  "contact-kael": AVATAR_URLS.mophair,
  "contact-lyra": AVATAR_URLS.bowlhair,
  "contact-sable": AVATAR_URLS.shorthair,
  "contact-tomas": AVATAR_URLS.spikeyhair,
};
const DEFAULT_AVATAR = AVATAR_URLS.base;

// The drawer's contact shape. Map data and bridge events both provide plain
// dwelling data, so one projection keeps the drawer fields in one place.
const contactFromDwelling = (dwelling) => ({
  id: dwelling.id,
  contactId: dwelling.contactId,
  name: dwelling.name,
  contact: dwelling.contact,
  role: dwelling.role || "Resident",
  contactUserId: dwelling.contactUserId ?? null,
});

// Fallback for an empty registry; the drawer stays closed until an interaction
// names a resident.
const EMPTY_CONTACT = {
  id: "",
  contactId: "",
  name: "",
  contact: "",
  role: "",
  contactUserId: null,
};

/** Formats a server timestamp for the chat feed. */
const formatMessageTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

/** Orders a feed oldest-first, matching the server's createdAt/id ordering. */
const compareMessages = (left, right) => {
  const leftTime = new Date(left.createdAt).getTime();
  const rightTime = new Date(right.createdAt).getTime();

  if (leftTime !== rightTime) return leftTime - rightTime;
  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
};

/** Merges a REST page with live messages without duplicating or overwriting. */
const mergeMessages = (existing, incoming) => {
  const byId = new Map();

  for (const message of [...existing, ...incoming]) {
    if (message && typeof message.id === "string") {
      byId.set(message.id, message);
    }
  }

  return [...byId.values()].sort(compareMessages);
};

/**
 * Assigns the player's contacts to the map's authored dwelling slots.
 *
 * Only the first six mutual contacts get a house, matching the number of
 * existing dwellings; the mapping is positional but keyed by the slot's
 * authored contact id, so it survives map switches.
 */
const assignmentsFor = (contacts) => {
  const slots = listDwellingSlots();
  const sorted = [...contacts].sort((left, right) =>
    left.displayName.localeCompare(right.displayName)
  );

  return sorted.slice(0, slots.length).map((contact, index) => ({
    slotContactId: slots[index].contactId,
    userId: contact.id,
    displayName: contact.displayName,
  }));
};

const App = () => {
  const worldRef = useRef(null);
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const returnFocusRef = useRef(null);
  const conversationRequestRef = useRef(0);
  const sendRequestRef = useRef(0);
  const activeConversationIdRef = useRef(null);
  const hasSessionRef = useRef(false);

  const [session, setSession] = useState({ status: "loading", user: null });
  const [contacts, setContacts] = useState([]);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  // Seed the drawer from map data rather than a copy of it, so map files stay
  // the only place a dwelling is described.
  const [activeContact, setActiveContact] = useState(() => {
    const dwelling = getDefaultMap()?.dwellings?.[0];
    return dwelling ? contactFromDwelling(dwelling) : EMPTY_CONTACT;
  });
  const [activeMap, setActiveMap] = useState(() => {
    const map = getDefaultMap();
    return map ? summarizeMap(map) : { id: "", name: "No map", range: "" };
  });
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  // idle → loading → ready, or unavailable/error for a house we cannot message.
  const [chatStatus, setChatStatus] = useState("idle");
  const [chatError, setChatError] = useState(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  const user = session.user;

  // One cleanup path for logout and an expired/invalid session. It never calls
  // `/auth/logout`: the server already considers the session over.
  const resetSession = useCallback(() => {
    hasSessionRef.current = false;
    disconnectSocket();
    conversationRequestRef.current += 1;
    sendRequestRef.current += 1;
    activeConversationIdRef.current = null;
    setSession({ status: "anonymous", user: null });
    setContacts([]);
    setIsContactsOpen(false);
    setIsChatOpen(false);
    setConversation(null);
    setMessages([]);
    setChatStatus("idle");
    setChatError(null);
    setDraft("");
    setIsSending(false);
  }, []);

  const handleUnauthorized = useCallback(() => {
    if (!hasSessionRef.current) return;
    resetSession();
  }, [resetSession]);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  // Session bootstrap: the cookie is HttpOnly, so `/auth/me` is the only way
  // the client can learn whether it already has a session.
  useEffect(() => {
    let cancelled = false;

    api
      .me()
      .then((result) => {
        if (!cancelled) {
          hasSessionRef.current = true;
          setSession({ status: "ready", user: result.user });
        }
      })
      .catch(() => {
        if (!cancelled) setSession({ status: "anonymous", user: null });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadContacts = useCallback(async () => {
    const result = await api.contacts();
    const next = result.contacts.map((entry) => entry.user);
    setContacts(next);
    return next;
  }, []);

  // Contacts are per-account, so they are fetched on sign-in and after an add.
  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;

    api
      .contacts()
      .then((result) => {
        if (!cancelled) setContacts(result.contacts.map((entry) => entry.user));
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Bind real contacts to the world's authored dwelling slots. The bridge
  // retains the latest assignment, so a scene that boots later still applies it.
  useEffect(() => {
    if (!user) {
      setWorldContacts([]);
      return;
    }

    setWorldContacts(assignmentsFor(contacts));
  }, [contacts, user]);

  // One socket for the signed-in tab. It appends only messages for the
  // conversation currently on screen; history comes from the REST page.
  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return undefined;
    }

    const socket = connectSocket();

    const handleMessage = (message) => {
      if (
        !message ||
        message.conversationId !== activeConversationIdRef.current
      ) {
        return;
      }

      setMessages((previous) => mergeMessages(previous, [message]));
    };

    socket.on("message:created", handleMessage);

    return () => {
      socket.off("message:created", handleMessage);
    };
  }, [user]);

  // Room membership is re-checked server-side; the ack is informational here,
  // because REST remains the source of truth for history. After a reconnect the
  // room is rejoined and history is fetched again so messages sent during the
  // gap are restored.
  useEffect(() => {
    if (!conversation) return undefined;

    const socket = connectSocket();
    const conversationId = conversation.id;
    const joinRoom = () =>
      socket.emit("conversation:subscribe", { conversationId });

    const syncHistory = async () => {
      try {
        const page = await api.messages(conversationId);
        if (activeConversationIdRef.current !== conversationId) return;

        setMessages((previous) =>
          mergeMessages(previous, [...page.messages].reverse()),
        );
      } catch {
        // Keep the existing feed; a 401 is handled by the central session hook.
      }
    };

    const handleConnect = () => {
      joinRoom();
      syncHistory();
    };

    joinRoom();
    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.emit("conversation:unsubscribe", { conversationId });
    };
  }, [conversation]);

  const handleAuthenticated = useCallback((authenticatedUser) => {
    hasSessionRef.current = true;
    setSession({ status: "ready", user: authenticatedUser });
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // The local session is cleared regardless; the cookie may already be gone.
    }

    resetSession();
  }, [resetSession]);

  const handleAddContact = useCallback(
    async (userId) => {
      await api.addContact(userId);
      await loadContacts();
    },
    [loadContacts],
  );

  // Close chat handler. Focus is returned to the world by the drawer's own
  // focus-management effect, so closing by button, Escape, or a map change all
  // follow the same path. Opening is cancelled by bumping the request counter.
  const handleCloseChat = useCallback(() => {
    conversationRequestRef.current += 1;
    sendRequestRef.current += 1;
    activeConversationIdRef.current = null;
    setIsChatOpen(false);
    setConversation(null);
    setMessages([]);
    setChatStatus("idle");
    setChatError(null);
    setDraft("");
    setIsSending(false);
  }, []);

  // React owns DOM panels; the world must not keep the keyboard while the auth
  // gate, contacts panel, or chat drawer is open, or typing in a form would
  // move the player and Phaser would consume the keys. Publishing from state
  // covers every open and close path.
  useEffect(() => {
    setUiInputBlocked(isChatOpen || isContactsOpen || !user);
  }, [isChatOpen, isContactsOpen, user]);

  // Dwelling interactions arrive through the bridge (ADR-0005); the world
  // never reaches into React and React never reaches into the scene.
  const unsubscribeRef = useRef();

  useEffect(() => {
    unsubscribeRef.current = subscribe(EventType.DWELLING_INTERACT, (event) => {
      if (!event || !event.dwelling) return;

      const dwelling = event.dwelling;
      const requestId = conversationRequestRef.current + 1;
      conversationRequestRef.current = requestId;
      sendRequestRef.current += 1;
      activeConversationIdRef.current = null;

      setActiveContact(contactFromDwelling(dwelling));
      setIsChatOpen(true);
      setConversation(null);
      setMessages([]);
      setChatError(null);
      setDraft("");
      setIsSending(false);

      if (!dwelling.contactUserId) {
        setChatStatus("unavailable");
        return;
      }

      setChatStatus("loading");

      (async () => {
        try {
          const { conversation: loaded } = await api.openConversation(
            dwelling.contactUserId,
          );
          if (requestId !== conversationRequestRef.current) return;

          // Set this synchronously so a live message arriving before the
          // history response is not dropped.
          activeConversationIdRef.current = loaded.id;
          setConversation(loaded);

          const page = await api.messages(loaded.id);
          if (requestId !== conversationRequestRef.current) return;

          // The API returns newest first for keyset pagination; the feed reads
          // oldest to newest. Merge rather than replace so live messages are
          // retained.
          setMessages((previous) =>
            mergeMessages(previous, [...page.messages].reverse()),
          );
          setChatStatus("ready");
        } catch (error) {
          if (requestId !== conversationRequestRef.current) return;
          setChatStatus("error");
          setChatError(error.message || "Could not open this conversation.");
        }
      })();
    });

    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  const handleSend = useCallback(
    async (event) => {
      event.preventDefault();
      const text = draft.trim();

      if (!text || !conversation || isSending) return;

      const conversationId = conversation.id;
      const requestId = sendRequestRef.current + 1;
      sendRequestRef.current = requestId;

      setIsSending(true);
      setChatError(null);

      const isCurrent = () =>
        requestId === sendRequestRef.current &&
        activeConversationIdRef.current === conversationId;

      try {
        const { message } = await api.sendMessage(conversationId, text);
        if (!isCurrent()) return;

        setMessages((previous) => mergeMessages(previous, [message]));
        setDraft("");
      } catch (error) {
        if (!isCurrent()) return;
        setChatError(error.message || "Message could not be sent.");
      } finally {
        if (requestId === sendRequestRef.current) setIsSending(false);
      }
    },
    [conversation, draft, isSending],
  );

  // Escape key handling.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        handleCloseChat();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleCloseChat]);

  // Focus management for the drawer. While it is open, focus moves into it and
  // Tab stays inside; when it closes — by button, Escape, or a map change —
  // focus returns to whatever had it before, falling back to the game canvas
  // so player controls respond immediately.
  useEffect(() => {
    if (!isChatOpen) return undefined;

    const container = worldRef.current;
    returnFocusRef.current = document.activeElement;
    closeButtonRef.current?.focus();

    const FOCUSABLE =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (event) => {
      if (event.key !== "Tab") return;
      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusable = [...drawer.querySelectorAll(FOCUSABLE)];
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!drawer.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);

      const target = returnFocusRef.current;
      returnFocusRef.current = null;
      if (target && target !== document.body && document.contains(target)) {
        target.focus();
        return;
      }
      const canvas = container?.querySelector("canvas");
      if (canvas) {
        // Phaser's canvas is not focusable by default. `-1` makes it
        // programmatically focusable without adding a new tab stop.
        if (!canvas.hasAttribute("tabindex")) canvas.tabIndex = -1;
        canvas.focus();
      }
    };
  }, [isChatOpen]);

  // Keep the HUD in sync with the world's active map (Phaser → bridge → React).
  useEffect(() => {
    const unsubscribe = subscribe(EventType.MAP_CHANGED, (event) => {
      if (!event || !event.map) return;
      setActiveMap(event.map);
      // A conversation belongs to the map it was opened on; never leave a
      // stale contact drawer (or its socket room) active after the world has
      // changed underneath it.
      handleCloseChat();
    });

    return unsubscribe;
  }, [handleCloseChat]);

  // Map selection is a UI request; Phaser owns the active map and confirms it
  // back through `map:changed`, which is what updates the HUD.
  const handleMapChange = useCallback(
    (event) => {
      const mapId = event.target.value;
      handleCloseChat();
      requestMapSwitch(mapId);
      event.target.blur();
    },
    [handleCloseChat],
  );

  // Mount Phaser game
  useEffect(() => {
    const container = worldRef.current;
    if (!container) return undefined;

    const game = createGame(container);
    if (import.meta.env.DEV) {
      window.__dwellingGame = game;
    }

    return () => {
      // `noReturn` must stay false: passing `true` destroys Phaser's global
      // core-plugin cache, so the next game created on this page cannot boot
      // (React StrictMode remounts this effect in development).
      game.destroy(true);
      container.replaceChildren();
    };
  }, []);

  const isChatReady = chatStatus === "ready";

  return (
    <div className="app-shell">
      {/* Floating Glass HUD */}
      <header className="floating-hud">
        <h1>Dwelling</h1>
        <div className="hud-map" aria-live="polite">
          <span className="hud-map-name">{activeMap.name}</span>
          <span aria-hidden="true">·</span>
          <span className="hud-map-range">{activeMap.range}</span>
        </div>
        <label className="map-picker">
          <span>Map</span>
          <select
            value={activeMap.id}
            onChange={handleMapChange}
            aria-label="Switch map"
          >
            {listMaps().map((map) => (
              <option key={map.id} value={map.id}>
                {map.name} ({map.range})
              </option>
            ))}
          </select>
        </label>
        {user && (
          <button
            type="button"
            className="hud-contacts-btn"
            onClick={() => setIsContactsOpen((open) => !open)}
            aria-expanded={isContactsOpen}
          >
            Contacts ({contacts.length})
          </button>
        )}
        <span className="hud-hint">• Press E near a house to chat</span>
      </header>

      {/* Fullscreen Game World */}
      <main id="world" ref={worldRef} className="world-mount" />

      {user && isContactsOpen && (
        <ContactsPanel
          user={user}
          contacts={contacts}
          onAddContact={handleAddContact}
          onLogout={handleLogout}
        />
      )}

      {/* Slide-out Chat Drawer */}
      <aside
        ref={drawerRef}
        className={`chat-drawer ${isChatOpen ? "open" : ""}`}
        role="dialog"
        aria-label={`Conversation with ${activeContact.contact}`}
        aria-hidden={!isChatOpen}
        inert={isChatOpen ? undefined : ""}
      >
        <div className="drawer-header">
          <div className="drawer-title-group">
            <img
              className="contact-avatar"
              src={CONTACT_AVATARS[activeContact.contactId] || DEFAULT_AVATAR}
              alt=""
              aria-hidden="true"
            />
            <div className="drawer-heading">
              <h2>{activeContact.name}</h2>
              <div className="contact-sub">
                Resident: {activeContact.contact} (
                {activeContact.role || "Resident"})
              </div>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="drawer-close-btn"
            onClick={handleCloseChat}
            aria-label="Close conversation"
            aria-keyshortcuts="Escape"
          >
            ✕
          </button>
        </div>

        {/* Message Feed */}
        <div className="drawer-messages" aria-live="polite">
          {chatStatus === "unavailable" && (
            <p className="chat-notice">
              This house is not linked to one of your contacts yet. Add the
              resident as a contact and their house will light up.
            </p>
          )}

          {chatStatus === "loading" && (
            <p className="chat-notice">Opening the conversation…</p>
          )}

          {chatStatus === "error" && (
            <p className="chat-error" role="alert">
              {chatError}
            </p>
          )}

          {isChatReady && messages.length === 0 && (
            <p className="chat-empty">No messages yet. Say hello.</p>
          )}

          {messages.map((message) => {
            const outbound = message.senderId === user?.id;

            return (
              <div
                key={message.id}
                className={`chat-bubble ${outbound ? "outbound" : "inbound"}`}
              >
                <div className="bubble-text">{message.body}</div>
                <span className="timestamp">
                  {formatMessageTime(message.createdAt)}
                </span>
              </div>
            );
          })}

          {isChatReady && chatError && (
            <p className="chat-error" role="alert">
              {chatError}
            </p>
          )}
        </div>

        <div className="drawer-footer">
          {activeContact.contactUserId ? (
            <form className="input-container" onSubmit={handleSend}>
              <input
                type="text"
                className="live-input"
                placeholder="Write a message…"
                aria-label="Message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={2000}
                disabled={!isChatReady || isSending}
              />
              <button
                type="submit"
                className="send-btn"
                disabled={!isChatReady || isSending || !draft.trim()}
              >
                {isSending ? "Sending…" : "Send"}
              </button>
            </form>
          ) : (
            <p className="chat-notice">
              Live chat starts once this house has a neighbour.
            </p>
          )}
          <div className="input-disclaimer">
            Enter to send · Esc to return to the world
          </div>
        </div>
      </aside>

      {session.status === "anonymous" && (
        <AuthScreen onAuthenticated={handleAuthenticated} />
      )}
    </div>
  );
};

export default App;
