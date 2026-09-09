import { useNavigate } from "react-router-dom";

export default function QuitButton({ confirmMessage = "Quit this round? Your progress won't be saved." }) {
  const navigate = useNavigate();

  function handleClick() {
    if (window.confirm(confirmMessage)) {
      navigate("/arena");
    }
  }

  return (
    <button className="quit-btn" onClick={handleClick} type="button">
      Quit
    </button>
  );
}
