import { useAuth } from "./lib/AuthContext";
import "./App.css";

export default function App() {
  const { user, loading, signInWithGoogle, logout } = useAuth();

  if (loading) {
    return (
      <main className="shell">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          △
        </span>
        <h1>AlphaBrilliant</h1>
      </div>
      <p className="tagline">
        Learn the Pythagorean Theorem by doing — not watching.
      </p>

      {user ? (
        <div className="card">
          <p>
            Signed in as <strong>{user.displayName ?? user.email}</strong>
          </p>
          <button type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      ) : (
        <div className="card">
          <p>Sign in to start learning.</p>
          <button type="button" onClick={() => void signInWithGoogle()}>
            Continue with Google
          </button>
        </div>
      )}

      <p className="status">Scaffold ready · Firebase wired · lessons coming next</p>
    </main>
  );
}
