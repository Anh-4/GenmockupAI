import { useState } from "react";
import App from "./App";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { hasApiKey, setApiKey, getApiKey } from "flow-sdk";

/**
 * Wraps the app with API-key management: prompts for a key on first run,
 * and exposes a small ⚙️ button to change it later. The key lives only in
 * the user's localStorage — nothing is embedded in the build.
 */
export default function Root() {
  const [keySet, setKeySet] = useState(hasApiKey());
  const [open, setOpen] = useState(!keySet);

  return (
    <>
      <App />

      {/* Settings button — change/clear the API key anytime. */}
      <button
        onClick={() => setOpen(true)}
        title="Đổi API key"
        className="fixed top-2.5 right-2.5 z-[150] w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">key</span>
      </button>

      <ApiKeyModal
        open={open}
        hasExisting={keySet}
        initial={getApiKey()}
        onSave={(k) => {
          setApiKey(k);
          setKeySet(true);
          setOpen(false);
        }}
        onClose={() => keySet && setOpen(false)}
      />
    </>
  );
}
