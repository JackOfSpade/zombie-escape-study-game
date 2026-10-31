export type RunRoomType =
  "break" | "cubicles" | "meeting" | "storage" | "reception" | "manager";
export type RunPower = "lit" | "dim" | "outage";
export interface RunStory {
  title: string;
  lines: string[];
}
export interface RunFloorDesign {
  /** Required for version 2 designs; absent from historical version 1 data. */
  scene?: SceneFloorDesign;
  name: string;
  family: "stack" | "columns" | "serpentine";
  roomOrder: number[];
  layoutSeed: number;
  roomTypes: RunRoomType[];
  subroomKinds: ("office" | "meeting" | "storage" | "break")[];
  furnitureDensity: number;
  fieldQuotas: number[];
  power: RunPower[];
  stories: RunStory[];
  brokenGuard: { segment: 3 | 4; bay: 1 | 2 };
}
export interface RunExteriorDesign {
  buildingName: string;
  buildingSubtitle: string;
  quarantineTitle: string;
  quarantineSubtitle: string;
  streetLabels: string[];
  skyline: { minHeight: number; maxHeight: number; damageRate: number };
}
export interface RunDesign {
  version: 1 | 2;
  title: string;
  premise: string;
  opening: string;
  footprint: {
    shape: "rectangle" | "chamfered" | "stepped" | "waisted";
    width: 36 | 38 | 40;
    top: number;
    inset: number;
    mirrored: boolean;
    shoulder: number;
  };
  floors: RunFloorDesign[];
  roofName: string;
  roster: {
    name: string;
    role: "builder" | "analyst" | "rusher" | "medic" | "skeptic";
    skill: number;
    risk: number;
    social: number;
  }[];
  city: {
    roadWidth: number;
    boulevardOffset: number;
    districtSize: number;
    buildingHeightMin: number;
    buildingHeightMax: number;
    damageRate: number;
    palette: string[];
  };
  exterior: RunExteriorDesign;
  pacing: {
    swarmInterval: number;
    swarmBatch: number;
    swarmCap: number;
    npcThinkingScale: number;
    firstHelicopter: number;
    helicopterInterval: number;
  };
}
export interface SavedRunDesign {
  version: 1;
  source: "chatgpt-handoff" | "fixture";
  requestId: string;
  generationId: string;
  fingerprint: string;
  design: RunDesign;
}
export interface RunDesignSummary {
  title: string;
  premise: string;
  spatial: string;
  atmosphere: string;
  cast: string;
  tempo: string;
}
export interface RunDesignRequest {
  version: 1;
  /** Absent on retained version 1 requests; never inserted during retry. */
  designVersion?: 2;
  requestId: string;
  generationId: string;
  seed: number;
  recent: RunDesignSummary[];
  repair?: { candidate: RunDesign; errors: string[] };
}
export interface RunDesignReply {
  requestId: string;
  design: RunDesign;
}
export const RUN_DESIGN_GUIDANCE: string;
export function parseRunDesign(value: unknown): RunDesign;
export function parseRunDesignRequest(value: unknown): RunDesignRequest;
export function parseRunDesignReply(
  value: unknown,
  request: RunDesignRequest,
): RunDesignReply;
export function summarizeRunDesign(design: RunDesign): RunDesignSummary;
export function runDesignNoveltyErrors(
  design: RunDesign,
  recent: RunDesignSummary[],
): string[];
export function runDesignFingerprint(design: RunDesign): string;
export function parseSavedRunDesign(value: unknown): SavedRunDesign;
import type { SceneFloorDesign } from "./scene-catalog.mjs";
