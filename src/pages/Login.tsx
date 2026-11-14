import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { isValidEmail, normalizeEmail, openAccount } from "../lib/storage";
import { IconWarning, LogoMark } from "../components/Icons";
import { Wordmark } from "../components/Layout";
import { useDB } from "../state/DBContext";

export default function Login() {
  const { update, db } = useDB();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const known = Object.keys(db.accounts);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const key = normalizeEmail(email);
    if (!isValidEmail(key)) {
      setError("Enter an email address like name@example.com.");
      return;
    }
    update((d) => openAccount(d, key));
    navigate("/practice", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <LogoMark className="mx-auto mb-4 h-12 w-12" />
          <h1><Wordmark className="text-4xl" /></h1>
          <p className="bn mt-1 text-xl text-text-secondary" lang="bn">শব্দ</p>
          <p className="mt-4 text-text-secondary">Practice spelling for the words you are learning.</p>
        </div>
        <form className="panel max-w-none" onSubmit={submit} noValidate>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email" type="email" inputMode="email" autoComplete="email" autoFocus
            className="input" placeholder="name@example.com" value={email}
            aria-invalid={!!error || undefined} aria-describedby={error ? "email-error" : "email-note"}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            list="known-accounts"
          />
          <datalist id="known-accounts">{known.map((k) => <option key={k} value={k} />)}</datalist>
          {error && <p id="email-error" className="field-error"><IconWarning className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
          <button type="submit" className="btn-primary mt-5 w-full">Continue</button>
          <p id="email-note" className="hint mt-4">
            Your words are stored only in this browser. There's no password – anyone using this browser can open any account.
          </p>
        </form>
      </div>
    </div>
  );
}
