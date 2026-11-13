import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { isValidEmail, normalizeEmail, openAccount } from "../lib/storage";
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
      setError("Enter a valid email address, like you@example.com.");
      return;
    }
    update((d) => openAccount(d, key));
    navigate("/practice", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-teal-50 to-slate-50 px-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="bn mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-teal-700 text-3xl text-white" aria-hidden>শ</div>
          <h1 className="text-2xl font-bold text-slate-900">ShobdoPractice</h1>
          <p className="mt-1 text-sm text-slate-600">English spelling practice with <span className="bn">বাংলা</span> pronunciation</p>
        </div>
        <form onSubmit={submit} noValidate>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email" type="email" inputMode="email" autoComplete="email" autoFocus
            className="input" placeholder="you@example.com" value={email}
            aria-invalid={!!error} aria-describedby={error ? "email-error" : "email-note"}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            list="known-accounts"
          />
          <datalist id="known-accounts">{known.map((k) => <option key={k} value={k} />)}</datalist>
          {error && <p id="email-error" className="mt-2 text-sm text-rose-700">{error}</p>}
          <button type="submit" className="btn-primary mt-4 w-full">Open my words</button>
        </form>
        <p id="email-note" className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          No password — anyone on this device can open any account.
        </p>
      </div>
    </div>
  );
}
