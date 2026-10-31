export type SurfaceRole =
  | "wall-poster"
  | "wall-whiteboard"
  | "desk-papers"
  | "desk-photo"
  | "desk-note"
  | "furniture-whiteboard"
  | "furniture-label"
  | "prop-face"
  | "room-plaque"
  | "building-sign"
  | "quarantine-sign"
  | "storefront-sign"
  | "street-sign"
  | "graffiti";
/** Game x/y horizontal coordinates, z elevation; yaw/pitch are radians. */
export interface SurfacePose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  width: number;
  height: number;
}
export type SurfaceBinding = SurfacePose &
  (
    | { kind: "fixed" }
    | { kind: "furniture"; furnitureId: string }
    | { kind: "prop"; furnitureId: string; propId: string }
  );
export interface SurfaceSlot {
  id: string;
  floor: number;
  scope: "interior" | "exterior";
  role: SurfaceRole;
  room: number | null;
  owner: string | null;
  binding: SurfaceBinding;
  context: string;
  maxTitle: number;
  maxBody: number;
  allowsArt: boolean;
}
export type TextPart = { text: string } | { fragmentId: string };
export type EnvironmentFact =
  | "rooftop-extraction"
  | "no-street-extraction"
  | "stairs-require-floor-clearance";
export type RepeatFragment = {
  id: string;
  reason: string;
  surfaces: string[];
} & (
  | { kind: "branding" | "clue"; text: string }
  | { kind: "direction"; fact: EnvironmentFact }
);
export interface DrawingPoint {
  x: number;
  y: number;
}
export type DrawingPrimitive =
  | {
      kind: "stroke";
      points: DrawingPoint[];
      width: number;
      color: string;
      opacity: number;
    }
  | {
      kind: "rect" | "ellipse";
      x: number;
      y: number;
      w: number;
      h: number;
      rotation: number;
      fill: string | null;
      stroke: string | null;
      width: number;
      opacity: number;
    }
  | {
      kind: "polygon";
      points: DrawingPoint[];
      fill: string | null;
      stroke: string | null;
      width: number;
      opacity: number;
    };
export interface Drawing {
  version: 1;
  background: string;
  primitives: DrawingPrimitive[];
}
export interface SurfaceContent {
  surfaceId: string;
  layout: "text" | "art" | "mixed";
  title: TextPart[];
  body: TextPart[];
  description: string;
  drawing: Drawing | null;
}
export interface EnvironmentContent {
  version: 1;
  surfaceFingerprint: string;
  fragments: RepeatFragment[];
  entries: SurfaceContent[];
}
export interface EnvironmentManifest extends EnvironmentContent {
  surfaces: SurfaceSlot[];
}
export interface EnvironmentSummary {
  fingerprint: string;
  phrases: string[];
  art: string[];
  /** Absent only in retained histories; new summaries always include it. */
  artDescriptions?: string[];
}
export const ENVIRONMENT_FACTS: Readonly<Record<EnvironmentFact, string>>;
export const ENVIRONMENT_LIMITS: Readonly<{
  contentBytes: 512000;
  manifestBytes: 750000;
  surfaces: 1024;
  surfaceBytes: 220000;
  fragments: 16;
  drawingPrimitives: 2048;
  drawingPoints: 8192;
}>;
export function environmentSurfaceFingerprint(
  surfaces: readonly SurfaceSlot[],
): string;
export function parseEnvironmentSurfaces(
  value: unknown,
  rosterNames?: readonly string[],
): SurfaceSlot[];
export function parseEnvironmentContent(
  value: unknown,
  structure: { roster: { name: string }[] },
  surfaces: readonly SurfaceSlot[],
): EnvironmentContent;
export function parseEnvironmentManifest(
  value: unknown,
  structure: { roster: { name: string }[] },
): EnvironmentManifest;
export function expandContentText(
  parts: readonly TextPart[],
  fragments: readonly RepeatFragment[],
): string;
export function normalizeEnvironmentText(value: string): string;
export function environmentDuplicateErrors(
  content: EnvironmentContent,
): string[];
export function environmentMechanicsErrors(
  content: EnvironmentContent,
): string[];
export function summarizeEnvironment(
  environment: EnvironmentContent,
): EnvironmentSummary;
export function parseEnvironmentSummaries(value: unknown): EnvironmentSummary[];
export const ENVIRONMENT_GUIDANCE: string;

export function parseEnvironmentRepairCandidate(
  value: unknown,
  structure: { roster: { name: string }[] },
  surfaces: readonly SurfaceSlot[],
): EnvironmentContent;
