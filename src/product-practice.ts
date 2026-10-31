import type { Contract, Problem } from "./model";
import { aiPracticeQuestions } from "./product-practice-ai";
import { deliveryQuestions } from "./product-practice-delivery";
import { foundationQuestions } from "./product-practice-foundations";

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

const truthRule =
  "Use a real project you worked on. Do not invent facts, work or metrics; qualify uncertain numbers and say when an outcome is unknown. Separate your own work from the team's work.";

/** Personal-history asks: bounded to one slice of one real project. */
const narrativeQuestions: Record<string, ProductQuestion> = {
  "PE:X09.1": {
    title: "Real project / one decision",
    prompt: `${truthRule}

In about five sentences, describe one project: the user problem it addressed, your personal role, one decision you made and the trade-off it involved, the actual outcome (or that it is unknown), and one lesson you took from it.`,
    rubric: [
      "Name the user problem, personal role, one decision with its trade-off, the outcome, and a lesson",
      "Use real project facts and personal history, distinguish your contribution from the team's, and qualify uncertain numbers",
    ],
  },
  "PE:X09.2": {
    title: "Real project / follow-up probes",
    prompt: `${truthRule}

Pick one real project and answer these three follow-ups briefly: what did you personally implement, which alternative did you consider and why did you choose differently, and what actually failed or was limited? If there was no known failure, say so rather than inventing one.`,
    rubric: [
      "Answer the implementation, alternative and failure follow-ups consistently with the same project",
      "Use real project facts and personal history without inflating scope or ownership, and qualify uncertain numbers",
    ],
  },
  "PE:X09.3": {
    title: "Real project / product-audience retelling",
    prompt: `${truthRule}

Retell one real project as a 60-second interview answer for a team building a customer-facing product. Lead with the user problem, then your decisions and the outcome for users. Keep the facts and ownership exactly as they happened; only the emphasis changes.`,
    rubric: [
      "Adapt the story to a product audience, emphasizing users, decisions and outcome within about 60 seconds",
      "Use real project facts and personal history, keep ownership accurate, and qualify uncertain numbers",
    ],
  },
};

/**
 * Depth-1 code-reading overrides: the bank's D2+ asks for X08.2/X08.3 are full
 * implementations. At D1 the learner reads and traces a supplied snippet and
 * describes a fix in words; nothing must be written or built.
 */
const depthOneQuestions: Record<string, ProductQuestion> = {
  "PE:X08.2": {
    title: "Debounce snippet / timer, this and cancel trace",
    prompt: `This debounce runs in an ES module (strict mode):

\`\`\`js
function debounce(fn, waitMs) {
  let timer;
  const debounced = function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
  debounced.cancel = () => {};
  return debounced;
}
const field = { value: "", log(n) { console.log(this.value, n); } };
const onInput = debounce(field.log, 300);
field.value = "c";  onInput.call(field, 1); // t = 0 ms
field.value = "ca"; onInput.call(field, 2); // t = 100 ms
onInput.cancel();                           // t = 200 ms
\`\`\`

Trace what happens: how many times log runs, at about what time, with which argument, and what \`this\` is inside it. Explain why cancel() does not stop the call. Then describe in words (no implementation needed) the two changes that would keep the caller's \`this\` and make cancel drop the pending call.`,
    rubric: [
      "Trace that only the second call survives: log is scheduled once for about t = 400 ms with argument 2",
      "Explain that fn(...args) loses this (undefined in strict mode, so this.value throws a TypeError) and that cancel is a no-op that never clears the timer",
      "Describe capturing the call's this and arguments for fn.apply, and clearing the stored timer in cancel",
    ],
  },
  "PE:X08.3": {
    title: "Tabs snippet / stale response and keyboard diagnosis",
    prompt: `Read this React tabs component. loadPanel(id) returns a promise for the panel text after 100-1,000 ms.

\`\`\`jsx
function Tabs({ tabs, loadPanel }) {
  const [selected, setSelected] = useState(tabs[0].id);
  const [panel, setPanel] = useState("");
  useEffect(() => {
    loadPanel(selected).then(setPanel);
  }, [selected]);
  return (
    <>
      <div>
        {tabs.map((t) => (
          <div key={t.id} onClick={() => setSelected(t.id)}>{t.label}</div>
        ))}
      </div>
      <div>{panel}</div>
    </>
  );
}
\`\`\`

Starting state: tabs are A, B and C in that order, so A (tabs[0]) is the initially selected tab. A's initial request completed before t = 0 ms and the panel shows A's content; no other requests are outstanding. The user clicks tab B at t = 0 ms (its load takes 900 ms), then tab C at t = 100 ms (its load takes 200 ms). Trace what the panel shows at t = 300 ms and at t = 900 ms, and which tab is selected then. Explain why. Then describe in words one way to stop an older response from overwriting the current panel, and name one reason a keyboard or screen-reader user cannot operate these tabs. No implementation is needed.`,
    rubric: [
      "Trace that C's content appears at about 300 ms and B's late response replaces it at about 900 ms while C stays selected",
      "Explain the missing stale-response guard and describe one fix, such as ignoring results whose id no longer matches the selection or an effect cleanup flag",
      "Name a real keyboard or semantics problem: clickable divs are not focusable and lack tab/tablist roles and aria-selected",
    ],
  },
};

/** At D1 the X08.1 runtime trace may describe its typing instead of writing it. */
function depthOneTrace(question: ProductQuestion): ProductQuestion {
  return {
    title: question.title,
    prompt: question.prompt.replace(
      "Finally, write a TypeScript signature for a helper once(fn) that preserves fn's parameter and return types.",
      "Finally, describe in words what a TypeScript type for a helper once(fn) must preserve about fn; writing the signature is optional.",
    ),
    rubric: question.rubric.map((item) =>
      item.replace(
        "give a correctly typed once signature",
        "describe what a type for once must preserve",
      ),
    ),
  };
}

/** Every supported objective maps to exactly one question; no family fallback. */
const banks: Record<string, ProductQuestion>[] = [
  stateQuestions,
  narrativeQuestions,
  foundationQuestions,
  deliveryQuestions,
  aiPracticeQuestions,
];

function own(
  bank: Record<string, ProductQuestion>,
  objectiveId: string,
): ProductQuestion | undefined {
  return Object.hasOwn(bank, objectiveId) ? bank[objectiveId] : undefined;
}

/**
 * Returns a fresh copy of the objective's own question. Rubric arrays are
 * cloned so a caller's edits cannot change the shared bank. Unknown, missing
 * or prototype ids throw instead of inventing a feature.
 */
export function productPractice(contract: Contract): ProductQuestion {
  const objectiveId = contract.objectiveIds[0];
  if (typeof objectiveId !== "string" || !objectiveId)
    throw new Error(
      "Unsupported development question: the contract has no objective id",
    );
  let question =
    contract.depth <= 1 ? own(depthOneQuestions, objectiveId) : undefined;
  for (const bank of banks) question ??= own(bank, objectiveId);
  if (!question)
    throw new Error(
      `Unsupported development question: no product practice question exists for ${objectiveId}`,
    );
  if (contract.depth <= 1 && objectiveId === "PE:X08.1")
    question = depthOneTrace(question);
  return {
    title: question.title,
    prompt: question.prompt,
    rubric: [...question.rubric],
  };
}
