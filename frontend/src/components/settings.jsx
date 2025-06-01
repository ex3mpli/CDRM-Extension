import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Settings({ onConfigSaved }) {
  const [instanceUrl, setInstanceUrl] = useState("");
  const [storedUrl, setStoredUrl] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    chrome.storage.local.get("cdrm_instance", (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error fetching CDRM instance:",
          chrome.runtime.lastError
        );
      } else if (result.cdrm_instance) {
        setStoredUrl(result.cdrm_instance);
      }
    });
  }, []);

  const handleSave = async () => {
    const trimmedUrl = instanceUrl.trim().replace(/\/+$/, "");
    if (!trimmedUrl) {
      setMessage("Please enter a valid URL.");
      setMessageType("error");
      return;
    }

    const endpoint = trimmedUrl + "/api/extension";
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.status === true) {
        setMessage("Successfully connected to CDRM Instance.");
        setMessageType("success");

        const widevineRes = await fetch(
          `${trimmedUrl}/remotecdm/widevine/deviceinfo`
        );
        if (!widevineRes.ok)
          throw new Error("Failed to fetch Widevine device info");
        const widevineData = await widevineRes.json();

        const playreadyRes = await fetch(
          `${trimmedUrl}/remotecdm/playready/deviceinfo`
        );
        if (!playreadyRes.ok)
          throw new Error("Failed to fetch PlayReady device info");
        const playreadyData = await playreadyRes.json();

        chrome.storage.local.set(
          {
            valid_config: true,
            cdrm_instance: trimmedUrl,
            widevine_device: {
              device_type: widevineData.device_type,
              system_id: widevineData.system_id,
              security_level: widevineData.security_level,
              secret: widevineData.secret,
              device_name: widevineData.device_name,
              host: trimmedUrl,
            },
            playready_device: {
              security_level: playreadyData.security_level,
              secret: playreadyData.secret,
              device_name: playreadyData.device_name,
              host: trimmedUrl,
            },
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error saving to chrome.storage:",
                chrome.runtime.lastError
              );
              setMessage("Error saving configuration.");
              setMessageType("error");
            } else {
              console.log("Configuration saved.");
              setStoredUrl(trimmedUrl);
              setInstanceUrl("");
              if (onConfigSaved) onConfigSaved();
              navigate("/results"); // Automatically redirect after success
            }
          }
        );
      } else {
        throw new Error("Invalid response from endpoint.");
      }
    } catch (err) {
      console.error("Connection error:", err);
      setMessage("Invalid endpoint or device info could not be retrieved.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto overflow-x-auto flex flex-col p-4">
      <input
        type="text"
        value={instanceUrl}
        onChange={(e) => setInstanceUrl(e.target.value)}
        placeholder={
          storedUrl
            ? `Current CDRM Instance: ${storedUrl}`
            : "CDRM Instance URL (e.g., https://cdrm-project.com/, http://127.0.0.1:5000/)"
        }
        className="w-full p-4 text-lg bg-gray-800 text-white border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-4"
      />
      <button
        onClick={handleSave}
        disabled={loading}
        className={`mt-4 p-2 ${
          loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
        } text-white rounded-md transition duration-300`}
      >
        {loading ? "Connecting..." : "Save Settings"}
      </button>

      {message && (
        <p
          className={`mt-2 text-sm text-center ${
            messageType === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export default Settings;
