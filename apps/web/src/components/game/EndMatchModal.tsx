import { Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useGame } from "@/store/game";

export function EndMatchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const endGame = useGame((state) => state.endGame);

  const finishMatch = (winner: "hunters" | "runners") => {
    endGame(winner);
    onClose();
    navigate("/results");
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="Host controls" title="End match early">
      <p className="text-sm leading-relaxed text-muted">
        This ends the match immediately. Choose which side wins to open the final report.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="hunter" onClick={() => finishMatch("hunters")}>
          <Flag className="size-4" /> Hunters win
        </Button>
        <Button variant="runner" onClick={() => finishMatch("runners")}>
          <Flag className="size-4" /> Runners win
        </Button>
      </div>
      <Button className="mt-3" variant="secondary" full onClick={onClose}>
        Keep playing
      </Button>
    </Modal>
  );
}
