// Thin fetch wrapper around the Dwelling API.
//
// Every request sends the HttpOnly session cookie (`credentials: "include"`).
// The token is never readable from JavaScript, so the client cannot attach it
// to a header and cannot leak it into storage (ADR-0022). Errors keep the
// server's `{ code, message }` shape so callers can branch on the code rather
// than parse prose.

const API_PREFIX = "/api";

let unauthorizedHandler = null;

/**
 * Registers the callback used when an authenticated request returns `401`.
 * A `null` handler (or unmount) disables the callback.
 *
 * @param {(() => void) | null} handler
 */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
}

/** Notifies the app that the session is no longer valid. */
export function notifyUnauthorized() {
  if (unauthorizedHandler) unauthorizedHandler();
}

export class ApiError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {string} code stable server error code, if any
   * @param {string} message human-readable message
   */
  constructor(status, code, message) {
    super(message || "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.code = code || "REQUEST_FAILED";
  }
}

async function request(path, { method = "GET", body } = {}) {
  const options = {
    method,
    credentials: "include",
    headers: {},
  };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_PREFIX}${path}`, options);
  const payload =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized();

    throw new ApiError(
      response.status,
      payload && payload.code,
      payload && payload.message,
    );
  }

  return payload;
}

export const api = {
  /** @returns {Promise<{ user: { id: string, displayName: string } }>} */
  me: () => request("/auth/me"),

  /** @param {string} email @param {string} password */
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),

  /** @param {string} email @param {string} password @param {string} displayName */
  signup: (email, password, displayName) =>
    request("/signup", {
      method: "POST",
      body: { email, password, displayName },
    }),

  logout: () => request("/auth/logout", { method: "POST" }),

  /** @returns {Promise<{ contacts: Array<{ user: { id: string, displayName: string } }> }>} */
  contacts: () => request("/contacts"),

  /** @param {string} userId peer's User.id */
  addContact: (userId) =>
    request("/contacts", { method: "POST", body: { userId } }),

  /** @param {string} userId peer's User.id */
  openConversation: (userId) =>
    request("/conversations", { method: "POST", body: { userId } }),

  /** @param {string} conversationId */
  getConversation: (conversationId) =>
    request(`/conversations/${encodeURIComponent(conversationId)}`),

  /** @param {string} conversationId */
  messages: (conversationId) =>
    request(`/conversations/${encodeURIComponent(conversationId)}/messages`),

  /** @param {string} conversationId @param {string} body */
  sendMessage: (conversationId, body) =>
    request(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      body: { body },
    }),
};
