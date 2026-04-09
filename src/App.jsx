import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import ClaudeMigrationGuide from "../ClaudeMigrationGuide.jsx";

export default function App() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

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
