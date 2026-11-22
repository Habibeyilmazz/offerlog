import { STAGE_LABELS, type Stage } from "@/lib/stages.ts";

export function StagePill({ stage }: { stage: Stage }) {
  return (
    <span className="stage-pill" style={{ "--stage": `var(--st-${stage})` } as React.CSSProperties}>
      <span className="stage-dot" />
      {STAGE_LABELS[stage]}
    </span>
  );
}
