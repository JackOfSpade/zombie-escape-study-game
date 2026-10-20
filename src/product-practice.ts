import type { Contract, Problem } from "./model";

type ProductQuestion = Pick<Problem, "title" | "prompt" | "rubric">;

/** Concrete setups for state questions; facts stay separate from the answer. */
const stateQuestions: Record<string, ProductQuestion> = {
  "PE:T07.1": {
    title: "Sharing screen / state classification",
    prompt: `An owner opens a project's Share dialog and revokes a collaborator's link. This implementation has three items:

A. shareDialogOpen: a browser variable set when the dialog opens. It clears when the dialog closes, resets on page reload, and is never sent to the server or saved.
B. The sharing record on the server: it persists after browsers close or reload. The server checks this record on every project-data request. After revocation, the record no longer grants that link access.
C. projectSnapshot: the collaborator's browser holds the project and sharing details returned by its last successful fetch. Revoking the link in the owner's browser leaves this copy unchanged until another fetch succeeds. A new fetch using the revoked link is denied.

Classify only the three listed items as ephemeral UI state, durable server state, or client-side cached representations of server state. Explain each classification using the stated behavior. Then explain whether the old projectSnapshot can remain visible after revocation and whether displaying it permits a new server read. No code is needed.`,
    rubric: [
      "Classify A, B, and C using their stated lifetime and source of truth",
      "Explain why an old projectSnapshot can remain visible while current server authorization denies a new read",
    ],
  },
  "PE:T07.2": {
    title: "Member list / freshness strategy",
    prompt: `A project members screen displays its last fetched member list. Owners can revoke access in another browser. There are no push updates. Fetching the list costs one 50 KB request; the budget allows at most one request per second per open screen. While the screen is visible and online, member labels should be no more than 30 seconds out of date. A fetch takes at most one second. The server independently checks access on every protected action. The owner who revokes a member should see the change immediately after the server confirms it.

Choose a freshness, refetch, or invalidation strategy for this screen. Specify what happens while it stays visible, when it regains focus, and after its own successful revocation. Explain how your timing meets the staleness and request-budget constraints. State what the screen displays if a refresh fails; do not use the displayed member list as authorization. No code is needed.`,
    rubric: [
      "Specify refresh or invalidation behavior while visible, on focus, and after a successful local revocation",
      "Explain how the strategy meets the 30-second freshness and request-budget constraints and displays refresh failure",
      "Keep displayed membership separate from the server's access check",
    ],
  },
  "PE:T07.3": {
    title: "Rename project / optimistic mutation",
    prompt: `A project is named "Draft". Its settings screen shows that name from a successful server fetch. The owner enters " Launch " and clicks Save. The rename request takes two seconds. The server may accept the entered text, reject it with a validation error, or return "Launch" after trimming whitespace. The task requires showing the proposed name immediately while the request is pending. Only one rename can be in flight; another Save is disabled until it finishes.

Design the screen behavior for this optimistic rename. Describe the displayed name and pending indicator before the response, how you preserve enough information to undo the optimistic change, what happens on rejection, and how you reconcile the display with the accepted server response. Include the feedback shown to the owner. No code is needed.`,
    rubric: [
      "Describe the immediate optimistic display and a visible pending indicator",
      "Preserve the previous value and explain rollback plus feedback on rejection",
      "Reconcile the displayed name with the accepted server response and finish the pending state",
    ],
  },
  "PE:T07.4": {
    title: "Project list / cache identity",
    prompt: `GET /projects returns a page of projects. Its result depends on the signed-in account, workspaceId, status filter (active or archived), sort order (name or newest), and page cursor (null for the first page). The same browser can switch accounts and workspaces, change filters and sorting, and fetch several pages. Requests for different combinations can finish in any order.

Define a cache key for one response so different server results cannot overwrite each other. Show example keys for an active first page, an archived first page, a later page, and the same query in another workspace or account. Explain which keys may safely reuse a response and which must remain distinct. No code is needed.`,
    rubric: [
      "Define cache identity using every stated input that can change the response",
      "Give the requested example keys and explain safe reuse versus distinct results",
    ],
  },
  "PE:T07.5": {
    title: "Search results / overlapping requests",
    prompt: `A project search screen sends request A for "cat". Before A finishes, the user changes the search field to "cats", sending request B. B returns first with results for "cats"; A then returns with results for "cat". Responses contain the query they answered. The user expects the results to match the current search field. The network may ignore cancellation, and either request may fail.

Choose a reconciliation strategy for these overlapping requests. Walk through what the user sees when B succeeds and A then succeeds, and when B fails while A succeeds. Explain how you prevent an old response from replacing results for the current query and how you show loading or failure without presenting mismatched results as current. No code is needed.`,
    rubric: [
      "Prevent an older request from replacing results for the current query even if cancellation fails",
      "Trace the requested success and failure orders with explicit user-visible results, loading, and error behavior",
    ],
  },
};

export function productPractice(
  contract: Contract,
  dailyUsers: number,
): ProductQuestion {
  const objectiveId = contract.objectiveIds[0] ?? "";
  const stateQuestion = stateQuestions[objectiveId];
  if (stateQuestion)
    return { ...stateQuestion, rubric: [...stateQuestion.rubric] };
  const scope = contract.scopes.join("\n");
  if (objectiveId.startsWith("PE:X09.")) {
    const followup =
      objectiveId === "PE:X09.2"
        ? "\n\nAnswer these follow-ups using that project: what did you personally implement, which alternative did you consider and why did you choose differently, and what actually failed or was limited? If there was no known failure, say so."
        : objectiveId === "PE:X09.3"
          ? "\n\nUse a 60-second interview explanation for a team building a customer-facing product. Emphasize the user problem, your decisions, and the outcome while keeping the facts and ownership accurate."
          : "";
    return {
      title: "Real project / narrative",
      prompt: `Use a real project you worked on. Briefly state the user problem, your personal role, and one actual decision. Separate your own work from the team's work. Do not invent facts or metrics; qualify uncertain numbers and say when an outcome is unknown.${followup}\n\nWhat to cover: ${scope}`,
      rubric: [
        `Address the requested narrative task: ${scope}`,
        "Use real project facts and personal history, distinguish your contribution from the team's, and qualify uncertain numbers",
      ],
    };
  }
  if (objectiveId.startsWith("PE:T01.")) {
    return {
      title: "Product decision / critique",
      prompt: `A creative tool lets a signed-in owner share a project with a read-only collaborator through a link the owner can revoke at any time. About ${dailyUsers} people use it each day. Support reports that collaborators are confused when a link suddenly stops working, and a product manager proposes: "Email the collaborator every time a link is revoked."\n\nYour task: ${scope}\n\nName one assumption you are making and one failure or edge case. No code is needed, and several answers can be right.`,
      rubric: [
        `Address the product-framing task: ${scope}`,
        "Name one assumption and one relevant failure or edge case",
      ],
    };
  }
  return {
    title: "Product design / chosen example",
    prompt: `This is an open-ended design exercise. First, choose a small, concrete product example that fits the task below. State the concrete facts needed to answer it, including any relevant behavior or constraints you choose. Treat these as your proposed example, not as facts about an unspecified existing implementation.\n\nYour task: ${scope}\n\nApply the task to the example you stated and explain your reasoning. Several designs may be valid; only the stated task and the facts you supply are being assessed.`,
    rubric: [
      "State a concrete product example and the relevant facts or chosen constraints needed for the task",
      `Apply the stated task to that example with supporting reasoning: ${scope}`,
    ],
  };
}
