import { Btn } from "./primitives";
import { Mic } from "./icons";
import type { Theme } from "./tokens";

/**
 * Persistent chrome control labelled Hey Papership (PRD-E.13).
 * Opens the assistant via callback. Never invents assistant text.
 */
export function HeyEngineButton({
  T,
  onOpenAssistant,
}: {
  T: Theme;
  onOpenAssistant: () => void;
}) {
  return (
    <Btn T={T} variant="rainbow" onClick={onOpenAssistant} style={{ minHeight: 36 }}>
      <Mic size={16} aria-hidden />
      Hey Papership
    </Btn>
  );
}
