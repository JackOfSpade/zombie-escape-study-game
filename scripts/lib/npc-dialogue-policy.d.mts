export interface DialogueFact {
  id: string;
  kind: string;
  text: string;
  key: string;
  expiresAt?: number;
}
export interface DialogueContext {
  requestId: string;
  actorId: string;
  runId: string;
  capturedAt: number;
  conversation?: {
    id: string;
    replyTo: string;
    sourceActorId: string;
    turn: number;
    maxTurns: number;
    expiresAt: number;
    heard?: {
      addressed: "self" | "other" | "none";
      act: "question" | "request" | "warning" | "statement";
      distance: number;
    };
  };
  recentLines?: {
    id?: string;
    actorId: string;
    text: string;
    at: number;
    conversationId?: string;
    turn?: number;
  }[];
  dialogue?: {
    version: 1;
    facts: DialogueFact[];
    feedback?: { previousText: string; issues: string[]; note: string };
  };
}
export type DialogueDelivery = "calm" | "urgent" | "whisper" | "relieved";
export interface DialogueSpeech {
  requestId: string;
  actorId: string;
  decision: "speak";
  text: string;
  purpose: string;
  evidence: string[];
  delivery?: DialogueDelivery;
  conversation?: {
    intent: "invite" | "continue" | "close";
    replyTo?: string;
  };
}
export interface DialogueSilence {
  requestId: string;
  actorId: string;
  decision: "silent";
  reason: string;
}
export type DialogueDraft = DialogueSpeech | DialogueSilence;
export type DialogueIssue =
  | "off-topic"
  | "unsupported-claim"
  | "contradiction"
  | "wrong-urgency"
  | "repetition"
  | "unnatural"
  | "unearned-history"
  | "study-answer";
export interface DialogueReviewRequest<
  T extends DialogueContext = DialogueContext,
> {
  version: 1;
  requestId: string;
  runId: string;
  actorId: string;
  capturedAt: number;
  context: T;
  candidate: DialogueSpeech;
  candidateFingerprint: string;
  attempt: 0 | 1;
}
export interface DialogueReview {
  requestId: string;
  actorId: string;
  candidateFingerprint: string;
  verdict: "accept" | "revise" | "silence";
  issues: DialogueIssue[];
  note: string;
}
export const NPC_DIALOGUE_GENERATION_INSTRUCTION: string;
export const NPC_DIALOGUE_REVIEW_INSTRUCTION: string;
export const NPC_DIALOGUE_ISSUES: readonly DialogueIssue[];
export function isNpcDialogueContext(value: unknown): value is DialogueContext;
export function parseNpcDialogueDraft(
  request: DialogueContext,
  value: unknown,
): DialogueDraft;
export function npcDialogueCandidateSource(candidate: DialogueSpeech): string;
export function buildNpcDialogueReview<T extends DialogueContext>(
  context: T,
  candidate: DialogueSpeech,
  attempt: 0 | 1,
): Promise<DialogueReviewRequest<T>>;
export function isNpcDialogueReviewRequest(
  value: unknown,
): value is DialogueReviewRequest;
export function parseNpcDialogueReview(
  request: DialogueReviewRequest,
  value: unknown,
): DialogueReview;
