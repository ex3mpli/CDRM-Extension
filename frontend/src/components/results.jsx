import React, { useEffect, useState } from "react";

function Results() {
  const [drmType, setDrmType] = useState("");
  const [pssh, setPssh] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [keys, setKeys] = useState("");

  useEffect(() => {
    chrome.storage.local.get(
      ["drmType", "latestPSSH", "latestLicenseRequest", "latestKeys"],
      (result) => {
        if (result.drmType) setDrmType(result.drmType);
        if (result.latestPSSH) setPssh(result.latestPSSH);
        if (result.latestLicenseRequest?.url)
          setLicenseUrl(result.latestLicenseRequest.url);
        if (result.latestKeys) {
          try {
            const parsed = Array.isArray(result.latestKeys)
              ? result.latestKeys
              : JSON.parse(result.latestKeys);
            setKeys(parsed);
          } catch (e) {
            console.error("Failed to parse keys:", e);
            setKeys([]);
          }
        }
      }
    );

    const handleChange = (changes, area) => {
      if (area === "local") {
        if (changes.drmType) {
          setDrmType(changes.drmType.newValue);
        }
        if (changes.latestPSSH) {
          setPssh(changes.latestPSSH.newValue);
        }
        if (changes.latestLicenseRequest) {
          setLicenseUrl(changes.latestLicenseRequest.newValue.url);
        }
        if (changes.latestKeys) {
          setKeys(changes.latestKeys.newValue);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  const handleCapture = () => {
    // Reset stored values
    chrome.storage.local.set({
      drmType: "None",
      latestPSSH: "None",
      latestLicenseRequest: { url: "None" },
      latestKeys: [],
    });

    // Get all normal windows to exclude your popup
    chrome.windows.getAll(
      { populate: true, windowTypes: ["normal"] },
      (windows) => {
        if (!windows || windows.length === 0) {
          console.warn("No normal Chrome windows found");
          return;
        }

        // Find the last focused normal window
        const lastFocusedWindow = windows.find((w) => w.focused) || windows[0];

        if (!lastFocusedWindow) {
          console.warn("No focused normal window found");
          return;
        }

        // Find the active tab in that window (that is a regular webpage)
        const activeTab = lastFocusedWindow.tabs.find(
          (tab) => tab.active && tab.url && /^https?:\/\//.test(tab.url)
        );

        if (activeTab?.id) {
          chrome.tabs.reload(activeTab.id, () => {
            if (chrome.runtime.lastError) {
              console.error("Failed to reload tab:", chrome.runtime.lastError);
            }
          });
        } else {
          console.warn("No active tab found in the last focused normal window");
        }
      }
    );
  };

  return (
    <div className="w-full grow flex h-full overflow-y-auto overflow-x-auto flex-col text-white p-4">
      <button
        onClick={handleCapture}
        className="w-full h-10 bg-sky-500 rounded-md p-2 mt-2 text-white cursor-pointer hover:bg-sky-600"
      >
        Capture current tab
      </button>
      <p className="text-2xl mt-5">DRM Type</p>
      <input
        type="text"
        value={drmType}
        className="w-full h-10 bg-slate-800/50 rounded-md p-2 mt-2 text-white"
        placeholder="None"
        disabled
      />
      <p className="text-2xl mt-5">PSSH</p>
      <input
        type="text"
        value={pssh}
        className="w-full h-10 bg-slate-800/50 rounded-md p-2 mt-2 text-white"
        placeholder="None"
        disabled
      />
      <p className="text-2xl mt-5">License URL</p>
      <input
        type="text"
        value={licenseUrl}
        className="w-full h-10 bg-slate-800/50 rounded-md p-2 mt-2 text-white"
        placeholder="None"
        disabled
      />
      <p className="text-2xl mt-5">Keys</p>
      <div className="w-full min-h-64 h-64 flex items-center justify-center text-center overflow-y-auto bg-slate-800/50 rounded-md p-2 mt-2 text-white whitespace-pre-line">
        {Array.isArray(keys) &&
        keys.filter((k) => k.type !== "SIGNING").length > 0 ? (
          keys
            .filter((k) => k.type !== "SIGNING")
            .map((k) => `${k.key_id || k.keyId}:${k.key}`)
            .join("\n")
        ) : (
          <span className="text-gray-400">None</span>
        )}
      </div>
    </div>
  );
}

export default Results;
