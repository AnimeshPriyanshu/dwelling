import { io } from "socket.io-client";

import { notifyUnauthorized } from "./client";

// One connection per tab. The session cookie authenticates the handshake, so
// there is no token argument here and nothing to refresh (ADR-0022). Vite
// proxies `/socket.io` to the API server in development, so the default
// same-origin URL works in both dev and production.
let socket = null;

/** @returns {import("socket.io-client").Socket} the shared connection */
export function connectSocket() {
  if (!socket) {
    socket = io({ withCredentials: true, autoConnect: true });
    socket.on("connect_error", (error) => {
      if (
        error?.message === "AUTH_REQUIRED" ||
        error?.data?.code === "AUTH_REQUIRED"
      ) {
        notifyUnauthorized();
      }
    });
  }

  return socket;
}

/** Closes the shared connection; the next call reconnects. */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
