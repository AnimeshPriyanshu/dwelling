import { useState } from "react";
import { api } from "../api/client";

/**
 * Sign-in and sign-up gate.
 *
 * Both endpoints set the HttpOnly session cookie in the response, so a
 * successful submit hands the returned user straight to the app and the world
 * bootstraps with `/api/auth/me` on the next load.
 *
 * @param {{ onAuthenticated: (user: { id: string, displayName: string }) => void }} props
 */
export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isSignup = mode === "signup";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = isSignup
        ? await api.signup(email.trim(), password, displayName.trim())
        : await api.login(email.trim(), password);

      onAuthenticated(result.user);
    } catch (submitError) {
      setError(submitError.message || "Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(isSignup ? "login" : "signup");
    setError(null);
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Dwelling</h1>
        <p className="auth-subtitle">
          {isSignup
            ? "Create an account to move in."
            : "Sign in to visit your neighbours."}
        </p>

        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        {isSignup && (
          <label className="auth-field">
            <span>Display name</span>
            <input
              type="text"
              autoComplete="nickname"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={40}
              required
            />
          </label>
        )}

        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Please wait…"
            : isSignup
              ? "Create account"
              : "Sign in"}
        </button>

        <button type="button" className="auth-switch" onClick={switchMode}>
          {isSignup
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </form>
    </div>
  );
}
