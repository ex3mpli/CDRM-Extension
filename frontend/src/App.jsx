import { useState, useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import TopNav from "./components/topnav";
import SideNav from "./components/sidenav";
import Results from "./components/results";
import Settings from "./components/settings";

function App() {
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [validConfig, setValidConfig] = useState(null); // null = loading

  useEffect(() => {
    chrome.storage.local.get("valid_config", (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error reading valid_config:", chrome.runtime.lastError);
        setValidConfig(false); // fallback
      } else {
        setValidConfig(result.valid_config === true);
      }
    });
  }, []);

  if (validConfig === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <div className="min-w-full min-h-full w-full h-full flex flex-grow bg-black/95 flex-col relative">
        <div className="w-full min-h-16 max-h-16 h-16 shrink-0 flex sticky top-0 z-20 border-b border-b-white bg-black">
          <TopNav onMenuClick={() => setIsSideNavOpen(true)} />
        </div>

        <div id="currentpagecontainer" className="w-full grow overflow-y-auto">
          <Routes>
            {!validConfig ? (
              <>
                <Route
                  path="/settings"
                  element={
                    <Settings onConfigSaved={() => setValidConfig(true)} />
                  }
                />
                <Route path="*" element={<Navigate to="/settings" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Navigate to="/results" replace />} />
                <Route path="/results" element={<Results />} />
                <Route path="/settings" element={<Settings />} />
              </>
            )}
          </Routes>
        </div>

        <div
          className={`fixed top-0 left-0 w-full h-full z-50 bg-black transform transition-transform duration-300 ease-in-out ${
            isSideNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SideNav onClose={() => setIsSideNavOpen(false)} />
        </div>
      </div>
    </Router>
  );
}

export default App;
