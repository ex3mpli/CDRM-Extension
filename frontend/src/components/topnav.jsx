import { useEffect, useState } from "react";
import hamburgerIcon from "../assets/hamburger.svg";

function TopNav({ onMenuClick }) {
  const [injectionType, setInjectionType] = useState("LICENSE");

  useEffect(() => {
    chrome.storage.local.get("injection_type", (result) => {
      if (result.injection_type) {
        setInjectionType(result.injection_type);
      }
    });
  }, []);

  const handleInjectionTypeChange = (type) => {
    chrome.storage.local.set({ injection_type: type }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error updating injection_type:",
          chrome.runtime.lastError
        );
      } else {
        setInjectionType(type);
        console.log(`Injection type updated to ${type}`);
      }
    });
  };

  return (
    <div className="w-full h-full flex flex-row">
      <img
        src={hamburgerIcon}
        alt="Menu"
        className="h-full w-16 p-2 flex items-center cursor-pointer"
        onClick={onMenuClick}
      />
      <div className="flex flex-row h-full justify-center items-center ml-auto mr-2">
        <p className="text-white text-lg p-2 mr-2 border-r-2 border-r-white text-nowrap">
          Injection Type:
        </p>
        <button
          onClick={() => handleInjectionTypeChange("LICENSE")}
          className={`text-white text-lg p-2 rounded-md m-1 cursor-pointer ${
            injectionType === "LICENSE" ? "bg-sky-500/70" : "bg-black"
          }`}
        >
          License
        </button>
        <button
          onClick={() => handleInjectionTypeChange("EME")}
          className={`text-white text-lg p-2 rounded-md m-1 cursor-pointer ${
            injectionType === "EME" ? "bg-green-500/70" : "bg-black"
          }`}
        >
          EME
        </button>
        <button
          onClick={() => handleInjectionTypeChange("DISABLED")}
          className={`text-white text-lg p-2 rounded-md m-1 cursor-pointer ${
            injectionType === "DISABLED" ? "bg-red-500/70" : "bg-black"
          }`}
        >
          Disabled
        </button>
      </div>
    </div>
  );
}

export default TopNav;
