import type { HandoffProgress } from "./bridge-client";

export type RunDesignStage = "design" | "details" | "review";

/** Activity reflects an exact request's transport state or real local checks. */
export interface RunDesignActivity {
  stage: RunDesignStage;
  state: HandoffProgress | "checking";
  detail: string;
}
