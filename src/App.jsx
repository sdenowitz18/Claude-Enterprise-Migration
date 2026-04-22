import { useEffect, useRef, useState } from "react";
import { Moon, Sun, Lock, Eye, EyeOff } from "lucide-react";
import ClaudeMigrationGuide from "../ClaudeMigrationGuide.jsx";

const AUTH_EXPIRY_KEY = "transcend_auth_expiry";
const AUTH_SESSION_KEY = "transcend_auth_session";
const CORRECT_PASSWORD = "transcend@123";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function isAuthValid() {
  const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
  const hasSession = sessionStorage.getItem(AUTH_SESSION_KEY) === "1";
  return hasSession && expiry && Date.now() < Number(expiry);
}

function setAuth() {
  localStorage.setItem(AUTH_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS));
  sessionStorage.setItem(AUTH_SESSION_KEY, "1");
}

function PasswordGate({ onUnlock }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [show, setShow] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (value === CORRECT_PASSWORD) {
      setAuth();
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setValue("");
      setTimeout(() => setShake(false), 600);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div
        className={`w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-800 dark:bg-gray-900 ${shake ? "animate-shake" : ""}`}
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/30">
            <Lock className="h-6 w-6 text-orange-500" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Transcend Internal
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter the password to continue
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                ref={inputRef}
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(false); }}
                placeholder="Password"
                className={`w-full rounded-lg border px-4 py-2.5 pr-10 text-sm outline-none transition focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                  error
                    ? "border-red-400 focus:ring-red-200 dark:focus:ring-red-900"
                    : "border-gray-300 focus:border-orange-400 focus:ring-orange-100 dark:border-gray-700 dark:focus:border-orange-500 dark:focus:ring-orange-900/40"
                }`}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-red-500">Incorrect password. Try again.</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 active:bg-orange-700"
          >
            Unlock
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [unlocked, setUnlocked] = useState(() => isAuthValid());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen">
      <div className="flex justify-end border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-950">
        <button
          type="button"
          onClick={() => setDark((d) => !d)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-stone-50 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          aria-pressed={dark}
        >
          {dark ? (
            <>
              <Sun className="h-4 w-4" aria-hidden />
              Light
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" aria-hidden />
              Dark
            </>
          )}
        </button>
      </div>
      <ClaudeMigrationGuide />
    </div>
  );
}
