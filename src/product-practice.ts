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

/** A fixed feature in the shared product world, supplied as facts. */
type FeatureCase = {
  title: string;
  facts: (dailyUsers: number) => string;
};

const shareLinkRevocation: FeatureCase = {
  title: "Share link revocation",
  facts: (dailyUsers) =>
    `A web-based creative tool is used by about ${dailyUsers} people a day. Owners can already create read-only share links for a project. The team has been asked to let an owner revoke a share link from the project's Share dialog. After revocation, opening the link shows a "This link is no longer active" page, and the owner's dialog marks that link as revoked.

The existing system: a React single-page app calls a JSON REST API. Each link is a row in a share_links table with the columns id, project_id, token, created_by and created_at; there is no revocation field yet. On every shared-project request, the server checks the link's token against that table. Only the project's owner may create or manage its links. The codebase has unit tests, API integration tests and one end-to-end smoke test. Deploys go through a pipeline, and a feature-flag service can enable a feature for targeted accounts. Product events are sent to an analytics tool. There is no email, push or real-time channel, and no separate permissions service.`,
};

const projectList: FeatureCase = {
  title: "Project list",
  facts: (dailyUsers) =>
    `A web-based creative tool is used by about ${dailyUsers} people a day. Its project list page shows the signed-in user's projects in the current workspace. The page has a search box, a status filter (active or archived), a sort control (name or newest), and cursor pagination that loads 20 projects per page. Each row offers inline rename and archive actions. Each row shows a thumbnail loaded from a CDN; thumbnails are typically 400×300 JPEG images of about 80 KB.

A typical user has about 200 projects. The GET /projects API responds in about 150 ms at the median and 900 ms at the 95th percentile. The page is a React single-page app, and about 30% of sessions come from mid-range laptops on home Wi-Fi.`,
};

const inviteForm: FeatureCase = {
  title: "Invite collaborator form",
  facts: (dailyUsers) =>
    `A web-based creative tool is used by about ${dailyUsers} people a day. Project owners invite collaborators through a modal form with an email field, a role choice (viewer or editor) and an optional message. The server validates the email format, rejects people who are already members, and enforces a limit of 10 invites per hour per owner. A submit can take up to 2 seconds to respond.

Below the form, a pending-invites list shows each invited address, its role and the date it was sent. The dialog must be fully usable by keyboard and with a screen reader. The product is offered in English, German and Japanese; dates in the pending-invites list and all strings are translated for the user's locale.`,
};

const proPlan: FeatureCase = {
  title: "Pro plan and integrations",
  facts: (dailyUsers) =>
    `A web-based creative tool is used by about ${dailyUsers} people a day. A paid Pro plan is billed through an external payment provider. The provider sends webhook events about payments and subscription changes; the same event can arrive more than once, and events can arrive out of order. Free projects allow at most 3 collaborators; Pro unlocks more than 3 collaborators per project.

Pro also unlocks a cloud-storage integration for importing and exporting project files. The user connects their cloud-storage account through OAuth. The user can disconnect it from settings, and the storage provider can also revoke the app's access at any time.`,
};

/** Each fallback topic family uses exactly one supplied case. */
const casesByFamily: Record<string, FeatureCase> = {
  "PE:T02": shareLinkRevocation,
  "PE:T03": shareLinkRevocation,
  "PE:T04": projectList,
  "PE:T05": projectList,
  "PE:T06": inviteForm,
  "PE:T08": inviteForm,
  "PE:T09": projectList,
  "PE:T10": projectList,
  "PE:T11": shareLinkRevocation,
  "PE:T12": proPlan,
  "PE:T13": shareLinkRevocation,
  "PE:T14": shareLinkRevocation,
  "PE:T15": shareLinkRevocation,
  "PE:T16": shareLinkRevocation,
  "PE:T17": shareLinkRevocation,
  "PE:T18": inviteForm,
  "PE:T19": shareLinkRevocation,
  "PE:T20": shareLinkRevocation,
};

/** Supplied artifacts for scopes that work from given evidence. */
const addendaByFamily: Record<string, string> = {
  "PE:T15": `A pull request for share link revocation makes these changes:
- Adds a nullable revoked_at column to share_links.
- Adds a POST /links/:id/revoke endpoint that sets revoked_at for the given link id; it requires a signed-in user but does not look up who owns the link's project.
- Leaves the token check on shared-project requests unchanged.
- Adds a red Revoke button to each link row in the Share dialog; the button shows only a trash icon and has no text or label.
- Adds one snapshot test of the Share dialog.
- Renames the class ShareModal to ShareDialog across 23 files.
- Names a new local variable "x2" in the endpoint handler.`,
  "PE:T17": `Evidence: the revocation feature flag was raised to 50% of owners two hours ago. Since then the 5xx rate of the revoke endpoint has risen from 0 to about 4%. The failures are concentrated in projects created more than two years ago. A typical error log line reads: "TypeError: cannot read property 'id' of null (column workspace_id) in revokeLink". The endpoint receives about 300 revocation attempts per hour. Dashboards for page loads, sign-ins and shared-project requests are unchanged.`,
  "PE:T14": `Defect report, a week after revocation shipped: after an owner revokes a link, some collaborators who had it open can still load the project for a short time, while others are blocked immediately. The behavior has been reproduced in production intermittently and never locally. API logs show requests with the revoked token returning 410 within a second of the revocation.`,
  "PE:T20": `An AI assistant proposed this design for the feature:
- Add a revoked boolean to share_links.
- Create a new link-revocation microservice with its own message queue.
- In the React app, filter revoked links out of the Share dialog so they are hidden.
- It states that the existing token check "already handles revoked links", without citing code or a test.`,
};

const addendaByObjective: Record<string, string> = {
  "PE:T02.3": `A draft event list for the feature:
- link_revoke_clicked, sent from the browser on every click of Revoke, including repeated clicks while the request is pending.
- link_revoked, with the property owner_display_name used as the user key.
- revoked_link_viewer, with the property collaborator_email.
- share_dialog_opened.`,
  "PE:T02.5": `Experiment summary: arm A (current Share dialog) had 4,812 owners; arm B (dialog with revocation) had 4,790 owners. The share-creation rate was 18.2% in A and 18.9% in B, a difference of +0.7 percentage points with a 95% confidence interval of −0.4 to +1.8. Support tickets about broken links per 1,000 owners went from 3.1 in A to 2.4 in B. Median Share dialog load time went from 210 ms in A to 260 ms in B.`,
  "PE:T08.5": `The invite form component under review:
- The email field shows the placeholder "Email" and has no visible or programmatic label.
- The role choice is two clickable div elements styled as buttons; they cannot receive keyboard focus.
- When the dialog opens, focus stays on the page behind it.
- Server errors appear as red text below the form with no announcement to assistive technology.
- The dialog has a fixed width of 560 px.
- Pending-invite dates are formatted with the hard-coded pattern "MM/DD/YYYY", and the sentence "Invited by " + name + " on " + date is built by string concatenation.
- The submit button uses the product's standard primary color and rounded corners.
- The optional message field accepts up to 500 characters and shows a character counter.`,
  "PE:T09.1": `Slow-experience report: users say the project list takes several seconds to become usable after a filter change. A trace from a mid-range laptop shows the GET /projects request completing in 160 ms and thumbnails finishing within 400 ms. After the response arrives, the main thread is busy for 2.3 seconds in one task, mostly in re-rendering the 180 rows the user has already scrolled through and recomputing search matches on each of them. Clicks and typing during that time are not handled until it ends.`,
  "PE:T13.4": `A flaky end-to-end test: it opens a seeded project, clicks the third button in the Share dialog by position, waits a fixed 500 ms, and then asserts that the text "This link is no longer active" appears for the link. The seeded project is shared with other tests that run in parallel. The test fails in about 1 of 15 CI runs and passes when rerun.`,
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
  const family = objectiveId.slice(0, 6);
  const featureCase = casesByFamily[family] ?? shareLinkRevocation;
  const addendum = addendaByObjective[objectiveId] ?? addendaByFamily[family];
  const evidence = addendum ? `\n\n${addendum}` : "";
  return {
    title: `${featureCase.title} / applied design`,
    prompt: `${featureCase.facts(dailyUsers)}${evidence}\n\nYour task: ${scope}\n\nIf you need an assumption beyond these facts, state it explicitly. Several answers can be valid. No code is needed.`,
    rubric: [
      `Apply the task to the supplied ${featureCase.title.toLowerCase()} facts: ${scope}`,
      "Ground each choice in the stated facts and name any assumption added beyond them",
    ],
  };
}
