import { NavLink } from "react-router-dom";
import homeIcon from "../assets/home.svg";
import settingsIcon from "../assets/settings.svg";
import closeIcon from "../assets/close.svg";

function SideNav({ onClose }) {
  return (
    <div className="w-full h-full overflow-y-auto overflow-x-auto flex flex-col bg-black">
      <div className="w-full min-h-16 max-h-16 h-16 shrink-0 flex sticky top-0 z-20 border-b border-b-white bg-black">
        <button
          onClick={onClose}
          className="h-full ml-auto p-3 hover:cursor-pointer"
        >
          <img src={closeIcon} alt="Close" className="h-full" />
        </button>
      </div>

      <div className="w-full h-16 flex items-center justify-center mt-2">
        <NavLink
          to="/results"
          onClick={onClose}
          className="text-white text-2xl font-bold flex flex-row items-center border-l-white hover:border-l-1 w-full hover:bg-black/50 transition duration-300 ease-in-out p-2"
        >
          <img
            src={homeIcon}
            alt="Home"
            className="h-full w-16 p-2 flex items-center cursor-pointer"
          />
          Home
        </NavLink>
      </div>

      <div className="w-full h-16 flex items-center justify-center mt-2">
        <NavLink
          to="/settings"
          onClick={onClose}
          className="text-white text-2xl font-bold flex flex-row items-center hover:border-l-1 border-l-white w-full hover:bg-black/50 transition duration-300 ease-in-out p-2"
        >
          <img
            src={settingsIcon}
            alt="Settings"
            className="h-full w-16 p-2 flex items-center cursor-pointer"
          />
          Settings
        </NavLink>
      </div>
    </div>
  );
}

export default SideNav;
