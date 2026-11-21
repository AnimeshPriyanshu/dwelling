import { useState } from "react";

/**
 * Contacts drawer for the HUD.
 *
 * Dwelling has no contact search yet: adding a neighbour uses their `User.id`,
 * which the panel shows for the signed-in user so two people can connect by
 * sharing ids. The list is the same set the world binds to its houses.
 *
 * @param {{
 *   user: { id: string, displayName: string },
 *   contacts: Array<{ id: string, displayName: string }>,
 *   onAddContact: (userId: string) => Promise<void>,
 *   onLogout: () => void,
 * }} props
 */
export default function ContactsPanel({
  user,
  contacts,
  onAddContact,
  onLogout,
}) {
  const [peerId, setPeerId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = peerId.trim();
    if (!trimmed || isAdding) return;

    setIsAdding(true);
    setError(null);

    try {
      await onAddContact(trimmed);
      setPeerId("");
    } catch (addError) {
      setError(addError.message || "Could not add that contact.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section className="contacts-panel" aria-label="Contacts">
      <div className="contacts-heading">
        <h2>Neighbours</h2>
        <button type="button" className="auth-switch" onClick={onLogout}>
          Sign out
        </button>
      </div>

      <p className="contacts-you">
        You are <strong>{user.displayName}</strong>
      </p>

      <label className="contacts-id">
        <span>Your user id — share it to be added</span>
        <input
          type="text"
          value={user.id}
          readOnly
          onFocus={(event) => event.target.select()}
        />
      </label>

      {contacts.length === 0 ? (
        <p className="contacts-empty">
          No neighbours yet. Add one with their user id.
        </p>
      ) : (
        <ul className="contacts-list">
          {contacts.map((contact) => (
            <li key={contact.id}>{contact.displayName}</li>
          ))}
        </ul>
      )}

      <form className="contacts-add" onSubmit={handleSubmit}>
        <label>
          <span>Add contact by user id</span>
          <input
            type="text"
            value={peerId}
            onChange={(event) => setPeerId(event.target.value)}
            placeholder="user_…"
          />
        </label>
        <button type="submit" disabled={isAdding || !peerId.trim()}>
          {isAdding ? "Adding…" : "Add"}
        </button>
      </form>

      {error && (
        <p className="contacts-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
