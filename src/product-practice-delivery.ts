/**
 * Objective-specific delivery questions for PE T11-T19, X03, X07 and X08.
 * Each entry is one small diagnostic with its own supplied artifact; it is a
 * practice example, not a certification of the whole objective.
 */
type DeliveryQuestion = { title: string; prompt: string; rubric: string[] };

const accessQuestions: Record<string, DeliveryQuestion> = {
  "PE:T11.1": {
    title: "Export flow / identity layers",
    prompt: `A synthetic flow: Mia clicks "Export PDF" on project P in workspace W. The server performs these checks in order:

1. A valid session cookie maps to user u_17.
2. The session was created 3 hours ago; idle timeout is 8 hours.
3. u_17 has a membership row in W.
4. u_17's role on P is "viewer"; export needs "viewer" or higher.
5. W's subscription plan includes the export_pdf feature.

The response is 403 with body {"reason":"feature_not_in_plan"}.

Name which concept each check represents: authentication, session state, tenant membership, authorization, or commercial entitlement. Say which check failed and what the UI should tell Mia, and who could resolve it.`,
    rubric: [
      "Map each of the five checks to the correct concept with a reason drawn from its described behavior",
      "Identify the failing check from the response and propose UI messaging and a resolver consistent with that layer",
    ],
  },
  "PE:T11.2": {
    title: "Delete comment / role rule enforcement",
    prompt: `Rule: a comment may be deleted by its author or by a project "admin". A pull request implements it like this:

\`\`\`tsx
// CommentRow.tsx
{(me.id === comment.authorId || me.role === "admin") && (
  <button onClick={() => api.delete(\`/comments/\${comment.id}\`)}>Delete</button>
)}
\`\`\`

\`\`\`ts
// server: DELETE /comments/:id
const c = await db.comments.find(req.params.id);
await db.comments.remove(c.id);
res.status(204).end();
\`\`\`

Explain whether the rule is enforced. Describe the server check that should exist and which data it needs. Then say what a viewer who is not the author should see in the UI, and what the UI should do if the server still returns 403 (for example, because the role changed after the page loaded).`,
    rubric: [
      "Explain that hiding the button does not enforce the rule and the handler performs no ownership or role check",
      "Specify a server-side check using the requester, comment author, and project role",
      "Describe a coherent UI affordance plus handling for a 403 after a role change",
    ],
  },
  "PE:T11.3": {
    title: "Invoice lookup / tenant scoping",
    prompt: `A synthetic multi-tenant app stores invoices for many organizations. Every request has req.user.orgId, set from the session. Review this handler:

\`\`\`ts
// GET /api/invoices/:invoiceId
const invoice = await db.query(
  "SELECT * FROM invoices WHERE id = $1",
  [req.params.invoiceId],
);
if (!invoice) return res.status(404).end();
return res.json(invoice);
\`\`\`

Invoice ids are sequential integers. The invoices table has columns id, org_id, amount, customer_email.

Identify the scoping problem and describe concretely what a signed-in user of org 12 could do with it. Propose a corrected query or check, and say whether the response for another org's invoice should be 403 or 404 and why.`,
    rubric: [
      "Identify that the query lacks an org_id constraint tied to the session's organization",
      "Describe the cross-tenant exposure, including enumeration of sequential ids and leaked fields",
      "Propose a scoped query or check and justify the chosen status code",
    ],
  },
  "PE:T11.4": {
    title: "Long form / session expiry mid-edit",
    prompt: `In a synthetic app, a user has spent 20 minutes writing a long project description in an unsaved form. Facts:

- Sessions expire after 30 minutes of inactivity; typing does not refresh the session, only server requests do.
- When the user clicks Save, the server may return 401 {"reason":"session_expired"} or 403 {"reason":"access_revoked"} (an owner removed them from the project).
- Reauthentication opens a sign-in page that currently replaces the whole tab.

Design the user-visible behavior for both responses. Explain how the draft text is protected in each case, what the user is told, and what happens after a successful sign-in. Say what must not happen after access_revoked even if the user signs in again.`,
    rubric: [
      "Distinguish expired-session handling from revoked-access handling with different user messages and paths",
      "Preserve the unsaved draft across reauthentication without a full-tab redirect losing it",
      "State that reauthentication must not resubmit or reveal project data after revocation",
    ],
  },
  "PE:T11.5": {
    title: "Transfer ownership / least privilege",
    prompt: `A synthetic app is adding "Transfer workspace ownership". The current owner chooses another member, who becomes owner; the old owner becomes an admin. Ownership controls billing and deleting the workspace. Available building blocks:

- Roles: owner, admin, member.
- A recent-authentication check ("password or SSO re-entered within 5 minutes").
- An audit_log table with columns actor_id, action, target_id, workspace_id, created_at, metadata.
- Email delivery to members.

Design the flow. State who may start it, what confirmation and reauthentication it requires, and what the recipient must do. List what is written to the audit log and what both people are told. Name one thing you deliberately keep out of the audit metadata.`,
    rubric: [
      "Restrict initiation to the current owner and require recent authentication plus explicit confirmation",
      "Specify audit fields that let someone reconstruct who transferred what to whom and when",
      "Describe feedback to both parties and justify excluding sensitive data from audit metadata",
    ],
  },
};

const commercialQuestions: Record<string, DeliveryQuestion> = {
  "PE:T12.1": {
    title: "Pro access / entitlement lifecycle",
    prompt: `The users table has one column is_pro (boolean). It is set true on checkout and false on a "subscription deleted" webhook. The payment provider reports subscription status as one of: trialing, active, past_due (payment failed, retrying for 7 days), canceled (with current_period_end), or unpaid.

Support reports: a customer who canceled on March 3 lost Pro immediately although they paid through March 31; another whose card failed kept Pro for two months.

Explain how the single boolean produces both reports. Propose a small model of subscription, plan, and entitlement that derives access from the provider's status and dates. State which statuses grant Pro and how past_due is treated.`,
    rubric: [
      "Explain how the boolean loses period-end and payment-retry information, causing both reported cases",
      "Propose separate subscription, plan, and entitlement records with access derived from authoritative status and dates",
      "Assign access for each listed status, including a justified past_due policy",
    ],
  },
  "PE:T12.2": {
    title: "Billing webhooks / duplicates and ordering",
    prompt: `Each payment-provider webhook has an id, a type, a created timestamp, and the full subscription object. The current handler:

\`\`\`ts
async function onWebhook(e) {
  if (e.type === "subscription.updated")
    await db.subs.update(e.data.id, { status: e.data.status });
  if (e.type === "invoice.paid")
    await db.credits.increment(e.data.customer, 100);
}
\`\`\`

Before these events the customer's stored status is "trialing" and stored credits are 0. subscription.updated means "the subscription now has this status"; invoice.paid means "one invoice was paid", which this product rewards with 100 credits.

Log for one customer, in arrival order:
1. evt_9 subscription.updated status=active, created 10:02
2. evt_8 subscription.updated status=past_due, created 10:01
3. evt_7 invoice.paid, created 10:00
4. evt_7 invoice.paid, created 10:00 (redelivery)

Trace the final stored status and credits. Describe the processing changes that make the result correct. Then say what the billing page should show while a checkout's webhook has not yet arrived.`,
    rubric: [
      "Trace the stored past_due status and the doubled 200 credits from the given order",
      "Propose event-id deduplication and ordering protection, such as comparing created times or refetching provider state",
      "Describe a pending or reconciling UI state instead of claiming success or failure prematurely",
    ],
  },
  "PE:T12.3": {
    title: "Workspace invitation / lifecycle states",
    prompt: `An owner invites alex@example.com to a workspace. Facts:

- The invite email contains a link with a token that expires after 7 days.
- Alex may already have an account or may need to sign up first.
- Sign-up can be abandoned at the email-verification step.
- The owner sees a members page listing invites.
- The owner can resend, which issues a new token.

Define the invitation's states and the transitions between them, including completion, abandonment, and expiry. For each state, say what the owner sees on the members page and what Alex sees when opening the link. Explain what happens to the old token when the owner resends.`,
    rubric: [
      "Define explicit states covering sent, accepted, abandoned or incomplete, expired, and resent or revoked invitations",
      "Describe what both the owner and the invitee see in each state",
      "Explain that a resend invalidates the old token or otherwise handles both tokens safely",
    ],
  },
  "PE:T12.4": {
    title: "CSV contact import / partial failure",
    prompt: `Users import contacts from a CSV file of up to 50,000 rows. Each row needs a valid email; duplicates of existing contacts are allowed but should not create a second contact. Processing runs as a background job at about 1,000 rows per second. A test file of exactly 50,000 rows produced this result:

- 48,150 rows valid and inserted
- 1,300 rows rejected: invalid email
- 500 rows were duplicates
- A worker restart crashed the job after row 49,950, the last row fully completed; rows 49,951-50,000 (50 rows) were not processed.

The four counts together cover all 50,000 rows.

Design what the user sees before the upload, during processing, and after this result. Explain how the user recovers the rejected rows and how the job resumes without inserting duplicates.`,
    rubric: [
      "Describe up-front validation feedback and visible progress during the background job",
      "Present a result summary that separates inserted, rejected, duplicate, and unprocessed rows with a way to obtain rejected rows",
      "Explain resumable, idempotent processing so a restart does not create duplicates",
    ],
  },
  "PE:T12.5": {
    title: "Cloud-storage integration / lifecycle",
    prompt: `Pro users connect a cloud-storage account through OAuth to export project files automatically. Facts:

- The access token lasts 1 hour; a refresh token is stored server-side.
- The provider sometimes returns 503 for several minutes.
- The user can revoke the app in the provider's own settings; then refresh fails with invalid_grant.
- The user can click Disconnect in our settings.

List the integration's lifecycle states from connect to disconnect. For each failure above, say what the product does automatically and what the user sees. Explain what Disconnect must delete or revoke, and what happens to exports queued at that moment.`,
    rubric: [
      "List lifecycle states including connected, degraded or retrying, needs reconnection, and disconnected",
      "Distinguish transient 503 retries from invalid_grant requiring user reauthorization, with matching UI",
      "Specify token deletion or revocation and a defined outcome for queued exports on disconnect",
    ],
  },
};

const testingQuestions: Record<string, DeliveryQuestion> = {
  "PE:T13.1": {
    title: "Discount code / choosing test layers",
    prompt: `A checkout feature has three pieces:

\`\`\`ts
// pricing.ts
export function applyDiscount(cents: number, pct: number): number {
  return Math.round(cents * (1 - pct / 100));
}
\`\`\`

- DiscountField: a React component that calls POST /discounts/validate and shows "Code applied" or the server's error.
- POST /discounts/validate is owned by another team; the frontend relies on its response shape {valid: boolean, pct?: number, reason?: string}.

Three behaviors need protection: (a) a 15% discount on 999 cents rounds correctly; (b) the field shows the server's reason for an expired code; (c) the frontend breaks if the other team renames pct. For each, choose unit, component/integration, contract, or end-to-end coverage and explain why that layer catches that failure most cheaply.`,
    rubric: [
      "Choose a unit test for the rounding behavior and justify it by isolation and speed",
      "Choose a component test with a controlled response for the error display",
      "Choose a contract test for the cross-team response shape and explain why an end-to-end test is not the cheapest guard for these",
    ],
  },
  "PE:T13.2": {
    title: "Archive project / risk-based test plan",
    prompt: `Feature: an "Archive project" button. Facts:

- Only owners may archive; the server enforces it.
- Archived projects disappear from the active list and become read-only.
- Archiving up to and including 1,000 files completes in the request; more than 1,000 files uses a background job.
- If that job fails, the project must remain active and editable with all files intact, and the owner must see the failure.
- Unarchive restores visibility in the active list and editing, with all files intact.

Propose a provisional plan; no codebase is supplied. State reasonable assumptions. Unit means isolated logic; API integration means a server request with backend components and a test database; E2E means a browser user journey through frontend and backend.

Rank the behaviors by failure consequences and any likelihood assumptions. Cover archive/unarchive success, job failure, permission denial, and boundary cases of exactly 1,000 and 1,001 files. Describe each test, layer, and reason.

With only your top three individual tests, what coverage would you defer and what risk would remain? Name one behavior covered at only one layer; justify avoiding duplication. The cap is an exercise simplification, not an estimate of equal effort. Different rankings and layer allocations are valid if justified. No code needed.`,
    rubric: [
      "Rank behaviors by justified failure consequences and stated likelihood assumptions; accept different defensible orders rather than a hidden preferred ranking",
      "Cover successful archiving and unarchiving, failed-job preservation and feedback, non-owner permission denial, and the synchronous/asynchronous boundary at 1,000 versus 1,001 files",
      "Choose justified test layers under reasonable stated implementation assumptions; no exact allocation or codebase-specific precision is required",
      "Identify the top three individual tests, deferred coverage and remaining risk; distinguish test count from effort and justify covering one behavior at only one layer",
    ],
  },
  "PE:T13.3": {
    title: "Weather widget / controlling dependencies",
    prompt: `A dashboard widget shows "Rain expected" when a third-party weather API forecasts rain within 3 hours. Its current test:

\`\`\`ts
test("shows rain warning", async () => {
  render(<Weather city="Oslo" />);
  expect(await screen.findByText("Rain expected")).toBeVisible();
});
\`\`\`

The component calls fetch("https://api.weather.example/forecast?city=Oslo") and compares forecast times with Date.now(). The test passes only on rainy days in Oslo and fails when CI has no network.

Explain the two sources of nondeterminism. Rewrite the test approach so it is deterministic. Then describe one separate check that keeps meaningful coverage of the real API integration without making every CI run depend on it.`,
    rubric: [
      "Identify the live network response and the current time as the sources of nondeterminism",
      "Control both with a stubbed response and a fixed clock while testing the 3-hour logic",
      "Propose a separate contract, recorded-fixture, or scheduled live check for the real API",
    ],
  },
  "PE:T13.4": {
    title: "Comment posting test / flaky UI test",
    prompt: `This end-to-end test fails in about 1 of 12 CI runs and passes on rerun:

\`\`\`ts
test("posts a comment", async ({ page }) => {
  await page.goto("/projects/demo");          // shared seeded project
  await page.locator("div.sc-x7f2 > button:nth-child(2)").click();
  await page.fill("textarea", "Looks good");
  await page.click("text=Send");
  await page.waitForTimeout(300);
  expect(await page.locator(".comment").count()).toBe(4);
});
\`\`\`

Other tests running in parallel also add comments to "demo". Posting a comment usually takes 100-600 ms.

Identify each cause of brittleness in this test. Rewrite it, or describe the rewrite precisely, so it is resilient to timing, parallel data, and styling changes.`,
    rubric: [
      "Identify the fixed wait, the shared project with an absolute count, and the generated class and position selector",
      "Replace them with an awaited assertion on the posted content, isolated test data, and role- or label-based selectors",
    ],
  },
  "PE:T13.5": {
    title: "Settings page / what not to test",
    prompt: `A team is adding tests for a new profile settings page. Proposed tests include:

1. The avatar uploader resizes images to 256 px (uses a well-tested open-source image library).
2. The display-name field rejects names longer than 50 characters (server rule).
3. The page's CSS matches a pixel snapshot on three browsers.
4. A user cannot change another user's email via PUT /users/:id (server-enforced).
5. The vendor's date-picker opens when clicked.
6. Saving shows "Saved" and keeps the new values after reload.

The team has time for about half of them. Choose which to omit and justify each omission using risk, ownership, and the confidence already available. Say what would make you add one back.`,
    rubric: [
      "Keep the permission check and the save round trip as high-risk owned behavior",
      "Justify omitting tests of third-party behavior and brittle pixel snapshots using ownership and existing confidence",
      "State a concrete trigger that would make an omitted test worth adding",
    ],
  },
};

const debuggingQuestions: Record<string, DeliveryQuestion> = {
  "PE:T14.1": {
    title: "Notification badge / mapping an unfamiliar feature",
    prompt: `You must fix a bug in the unread-notifications badge of an unfamiliar codebase. A search for "unread" returns:

\`\`\`
src/ui/Header.tsx:41          <Badge count={unreadCount} />
src/ui/useNotifications.ts:12 const unreadCount = items.filter(n => !n.readAt).length;
src/api/notifications.ts:8    export const listNotifications = () => get("/api/notifications?limit=50");
server/routes/notifications.ts:22  router.get("/api/notifications", ...)
server/routes/notifications.ts:58  router.post("/api/notifications/:id/read", ...)
tests/useNotifications.test.ts:5   it("counts unread items", ...)
\`\`\`

Using only these results, sketch a minimal map: the entry point, the data flow from server to badge, the relevant boundary, and the existing test. Name the next two files you would open first and why, and one fact visible here that could explain a wrong count for heavy users.`,
    rubric: [
      "Trace the flow from the server route through the API client and hook to the Header badge",
      "Choose the next files to open with reasons rather than reading the repository linearly",
      "Notice that counting a limit=50 page can undercount users with more notifications",
    ],
  },
  "PE:T14.2": {
    title: "Missing avatars / smallest failing condition",
    prompt: `Bug report: "Avatars are broken for some users." Collected evidence:

- user 101, avatar file "me.png": shows correctly
- user 102, avatar file "photo#2.png": broken image
- user 103, avatar file "Zoë.jpg": broken image
- user 104, avatar file "zoe.jpg": shows correctly
- All four images exist in storage under exactly those names.
- The browser's network panel for user 102 shows a request to /avatars/photo and a 404.
- No network capture exists yet for user 103.

The avatar URL is built as \`"/avatars/" + fileName\` and assigned to an img src.

Reduce this report to a reproducible symptom. State the smallest known failing condition supported by the evidence, the minimal reproduction steps, and which part of the report is still an unconfirmed hypothesis.`,
    rubric: [
      "Restate the symptom as a specific failing request rather than 'avatars are broken'",
      "Identify an unencoded '#' in the file name as the supported condition: the browser treats the rest as a fragment and requests only /avatars/photo, with minimal reproduction steps",
      "Keep the non-ASCII Zoë.jpg failure as a separate unconfirmed case needing its own capture, not attributed to the same proven cause",
    ],
  },
  "PE:T14.3": {
    title: "Duplicate orders / competing hypotheses",
    prompt: `Some customers get charged twice for one order. Evidence:

- 0.4% of orders have two charges, all within 2 seconds of each other.
- The checkout button disables itself on click (verified in code).
- Server logs for one duplicate show two POST /orders requests with different request ids, the same session, and the same cart, 1.4 s apart; the first one took 1.6 s to respond.
- The mobile app's HTTP client retries POST requests on timeout; its timeout is 1.2 s.
- Every duplicate in the last week came from the mobile app.

List at least three competing hypotheses. For each, say which evidence supports or weakens it. Choose the single next piece of evidence you would collect before changing code, and explain what each possible result would tell you.`,
    rubric: [
      "List several distinct hypotheses, including user double-click, client retry on timeout, and a server-side duplicate path",
      "Weigh each hypothesis against the specific timing, source, and request-id evidence",
      "Choose a discriminating next observation and explain how each outcome updates the hypotheses",
    ],
  },
  "PE:T14.4": {
    title: "Cart total / minimal fix",
    prompt: `The cart total is wrong when a line has quantity 0 after the user decrements it. Existing code:

\`\`\`ts
// cart.ts (local style: small pure functions, named exports, no classes)
export function lineTotal(line: Line): number {
  return line.qty ? line.qty * line.unitCents : line.unitCents;
}

export function cartTotal(lines: Line[]): number {
  var sum = 0;
  for (var i = 0; i < lines.length; i++) sum += lineTotal(lines[i]);
  return sum;
}
\`\`\`

Example: lines [{qty: 2, unitCents: 500}, {qty: 0, unitCents: 300}] give 1300; expected 1000.

Describe in words the minimal fix (or optionally show the minimal code change); no implementation is required. Explain why the change is minimal, which tempting edits you would leave out of this change (and where they belong instead), and the one regression test you would add.`,
    rubric: [
      "Explain (code optional) a lineTotal change so quantity 0 contributes zero while keeping the local function style",
      "Avoid unrelated refactors such as converting var loops, and defer them explicitly",
      "Add a targeted regression test using the zero-quantity example",
    ],
  },
  "PE:T14.5": {
    title: "Timezone fix / verifying with evidence",
    prompt: `A fix changed the "due today" filter from comparing UTC dates to comparing dates in the user's stored time zone. The bug: users in UTC-8 saw tomorrow's tasks as due today after 4 pm. The engineer reports:

- Added test: user in America/Los_Angeles at 17:00 local; a task due tomorrow is excluded. Passes; it failed before the fix.
- All 212 existing tests pass.
- Not covered: users with no stored time zone (about 3% of accounts), and the daily reminder email, which uses a separate query.

Evaluate whether this evidence verifies the fix. State what remaining uncertainty exists, one additional targeted test you would add, and which follow-up should be tracked separately rather than added to this fix.`,
    rubric: [
      "Recognize the fail-before, pass-after regression test as targeted evidence for the reported case",
      "Identify the missing-time-zone accounts as remaining uncertainty and add a targeted test for them",
      "Separate the reminder-email query as tracked follow-up work rather than scope creep",
    ],
  },
};

const reviewQuestions: Record<string, DeliveryQuestion> = {
  "PE:T15.1": {
    title: "Team search endpoint / risks in a change",
    prompt: `Review this pull request, which adds member search to a team page:

\`\`\`ts
// server
router.get("/api/teams/:teamId/members", async (req, res) => {
  const q = req.query.q ?? "";
  const rows = await db.raw(
    \`SELECT id, name, email, salary_band FROM users
     WHERE team_id = \${req.params.teamId} AND name LIKE '%\${q}%'\`);
  res.json(rows);
});
\`\`\`

\`\`\`tsx
// client
<input placeholder="Search" onChange={e => fetchMembers(e.target.value)} />
\`\`\`

No tests were added. Teams can have 20,000 members. Identify the risks in this change across correctness, security/permission, accessibility, performance, testability, and maintainability. For each risk, point to the specific line or omission that creates it.`,
    rubric: [
      "Identify the interpolated SQL, the missing team-membership check, and the over-exposed email and salary_band fields",
      "Identify the unlabeled input, a request per keystroke, unbounded results, and the absent tests",
      "Tie each risk to the specific code or omission rather than listing generic categories",
    ],
  },
  "PE:T15.2": {
    title: "Coupon change / prioritizing feedback",
    prompt: `A reviewer left these six comments on a pull request that adds coupon codes to checkout:

1. "Rename \`cpn\` to \`coupon\`."
2. "The coupon is applied after tax is calculated, so customers are taxed on the undiscounted price."
3. "Use single quotes; the codebase prefers them."
4. "A coupon with usage_limit 1 can be redeemed twice if two checkouts submit at the same time; the check and increment are separate queries."
5. "This file is getting long; consider splitting it."
6. "The coupon error message is not announced to screen readers."

Business rule for this fictional store: tax is computed on the discounted subtotal.

Order the comments by user and production risk. Group them into blocking, should-fix, and optional, and justify the top two placements. Explain how presenting all six with equal weight would hurt the review.`,
    rubric: [
      "Place the tax-calculation and double-redemption defects as blocking with consequence-based reasons",
      "Place the accessibility issue above naming and style, and mark style or file-length comments optional",
      "Explain how equal weighting obscures defects and slows the author",
    ],
  },
  "PE:T15.3": {
    title: "Retry loop / actionable review comment",
    prompt: `In a pull request, this function uploads a file:

\`\`\`ts
async function upload(file: File) {
  while (true) {
    try { return await api.put("/files", file); }
    catch { /* try again */ }
  }
}
\`\`\`

A draft review comment says: "This is bad. Rewrite it using exponential backoff with jitter, max 5 attempts, base 200 ms, and use our RetryPolicy class from utils, and also rename the function."

Rewrite the comment so it is concise and actionable. It should explain the consequence for users and servers and state the property the code needs, without prescribing every implementation detail. Keep the rename out of it or label it clearly as optional.`,
    rubric: [
      "Name the consequences: endless retries on permanent errors, a hung upload for the user, and load on the server",
      "State the desired property, such as bounded retries that distinguish retryable errors and surface failure",
      "Keep the comment concise, non-prescriptive, and separate optional suggestions",
    ],
  },
  "PE:T15.4": {
    title: "Formatter abstraction / justifying complexity",
    prompt: `The codebase formats money in three places:

\`\`\`ts
// invoice.ts
\`$\${(cents / 100).toFixed(2)}\`
// cart.ts
\`$\${(cents / 100).toFixed(2)}\`
// receipt.ts
\`$\${(cents / 100).toFixed(2)}\`
\`\`\`

A pull request replaces them with a new module: an abstract CurrencyFormatterBase class, a UsdFormatter subclass, a FormatterFactory registered through dependency injection, and a config file listing one currency. The product sells only in USD; there is no plan for other currencies this year.

Decide whether removing the duplication this way is worth the four new constructs it adds. Propose what you would accept instead, and name the concrete future change that would justify revisiting a richer design.`,
    rubric: [
      "Recognize that removing three-way duplication is worthwhile but the class hierarchy and factory add unneeded indirection",
      "Propose a proportionate alternative such as one formatMoney function",
      "Name a concrete trigger, such as adding a second currency or locale, for revisiting the design",
    ],
  },
  "PE:T15.5": {
    title: "Field rename / risks beyond changed lines",
    prompt: `A pull request's diff is small. It renames a response field in GET /api/projects/:id from \`owner\` to \`ownerId\` and updates the web client's two uses. All tests pass. Facts not visible in the diff:

- A mobile app released last month reads \`owner\`; about 30% of users update the app slowly.
- A nightly export job serializes this response into customers' CSV backups.
- The API has a public documentation page.
- Deploys replace all servers at once; there is no API versioning.

Explain which risks lie outside the changed lines and why the passing tests do not cover them. Recommend what the author should change or add before merging.`,
    rubric: [
      "Identify the breaking contract for older mobile clients and the changed export or backup format",
      "Explain that the tests only exercise the updated web client and miss these consumers",
      "Recommend a compatible transition, such as returning both fields temporarily, plus documentation updates and a removal plan",
    ],
  },
};

const releaseQuestions: Record<string, DeliveryQuestion> = {
  "PE:T16.1": {
    title: "New editor toolbar / deploy versus release",
    prompt: `A team built a redesigned editor toolbar. Facts:

- The code is merged and passes tests. The marketing launch is in three weeks, on a fixed date.
- The deploy pipeline ships to production several times a day; a deploy takes 20 minutes and a rollback deploy takes another 20.
- A feature-flag service can switch the toolbar per account within seconds.
- Two enterprise customers asked to try the new toolbar early.

Explain the difference between deploying the toolbar code and releasing the toolbar to users in this situation. Describe how decoupling them reduces risk here, and name one cost or risk the decoupling itself introduces.`,
    rubric: [
      "Distinguish shipping inactive code from enabling the visible capability for users",
      "Tie decoupling to the facts: early enterprise access, a fixed launch date, and seconds-fast disable versus slow rollback",
      "Name a cost of decoupling, such as testing both paths or flag debt",
    ],
  },
  "PE:T16.2": {
    title: "Two features / rollout strategy",
    prompt: `Choose a rollout strategy for each feature:

A. A new image-compression step on upload. It runs server-side for every upload, and a bug could corrupt stored images. Users never see the step directly; every user in every account uploads.
B. A redesigned workspace billing page. It is visible only to workspace admins, and admins in the same workspace often compare screenshots.

The flag service can target by user id, account (workspace) id, percentage, or internal staff.

For each feature, choose the targeting unit and rollout steps, and justify them by blast radius and user identity. Say what signal must be healthy before each step widens.`,
    rubric: [
      "For A, pick a small staged rollout, starting internally, with a corruption check before widening",
      "For B, target by workspace so admins in one workspace see a consistent page",
      "Name a concrete health signal gating each widening step",
    ],
  },
  "PE:T16.3": {
    title: "Splitting a name column / compatible migration",
    prompt: `The users table has a column full_name. The team wants separate first_name and last_name columns. Facts:

- During a deploy, old and new app servers run at the same time for up to 15 minutes.
- Old servers read and write only full_name.
- The table has 4 million rows; backfilling takes about 2 hours.
- Some names do not split cleanly (for example, a single word or several surnames).

Produce a compatibility-first migration plan as ordered steps. For each step, say what the schema contains, what the app reads and writes, and why old and new servers stay correct while they overlap. Say how unsplittable names are handled and when full_name can finally be dropped.`,
    rubric: [
      "Order the steps as add columns, dual-write, backfill, switch reads, then stop writing and drop full_name later",
      "Explain why old and new servers stay correct during each overlap",
      "Handle unsplittable names explicitly and gate the drop on no remaining readers",
    ],
  },
  "PE:T16.4": {
    title: "Email digest launch / rollback and abort criteria",
    prompt: `A team will launch a weekly email digest. Facts:

- Launch writes a new digest_preferences row for every user (default: on).
- The first send goes to 2 million users at 09:00 Monday.
- The feature is behind a flag; turning it off stops future sends.
- The email provider bills per message and cannot recall sent email.
- Normal unsubscribe rate after a marketing email is 0.3%.

Before launch, define the kill switch, explicit abort criteria with numbers, and the rollback plan. Identify what cannot be rolled back and how the launch plan limits that risk.`,
    rubric: [
      "Define a kill switch and numeric abort criteria, such as unsubscribe, bounce, or error rates relative to the stated baseline",
      "Identify sent email as irreversible and limit it with a staged send rather than all 2 million at once",
      "Address what happens to the digest_preferences rows on rollback",
    ],
  },
  "PE:T16.5": {
    title: "Search rewrite / post-release cleanup",
    prompt: `A new search backend was rolled out behind the flag new_search_v2. Current state, six weeks after reaching 100%:

- The old search code path and its index still run; the old index costs $1,800 per month.
- new_search_v2 is checked in 14 places, including two tests that force it off.
- A migration added a column search_vector; an old trigger still populates a now-unused column search_text.
- Nobody has looked at the search success dashboard since launch.

Specify the post-release validation needed to decide the new path is safe to keep. Then give an ordered cleanup plan for the flag, the old path and index, the tests, and the unused column and trigger, with a guard for each removal.`,
    rubric: [
      "Define validation using current search success and error metrics compared with the old baseline",
      "Order removals safely: flag checks and old-path tests, then the old code and index, then the trigger and column",
      "Attach a guard, owner, or deadline to each removal so the temporary machinery does not linger",
    ],
  },
};

const operationsQuestions: Record<string, DeliveryQuestion> = {
  "PE:T17.1": {
    title: "File upload / feature-level telemetry",
    prompt: `Users upload files to a project. Today the only telemetry is server request logs (status code and latency per HTTP request). An upload is: the browser requests a signed URL, uploads directly to storage (which our server never sees), then calls POST /files/confirm. Support says "uploads fail sometimes" but logs show 99.9% success.

Define a small set of feature-level events and metrics that connect technical errors and latency to whether a user actually finished uploading a file. Say where each event is emitted, which properties it carries (keep personal data out), and which one number you would put at the top of the dashboard. Explain why the existing 99.9% can look healthy while users fail.`,
    rubric: [
      "Define events across start, storage upload, confirm, and user-visible completion or abandonment, with emitting locations",
      "Carry useful properties such as error stage, size bucket, and duration without personal data",
      "Explain that server logs miss direct-to-storage failures and abandonment, and choose a user-level completion rate",
    ],
  },
  "PE:T17.2": {
    title: "Login errors / narrowing the affected population",
    prompt: `Since 14:10, sign-in failures rose from 0.5% to 6%. Evidence:

\`\`\`
14:12 POST /login 500 ua="Safari/17.4" region=eu-west sso=false err="TypeError: crypto.randomUUID is not a function" (client log)
14:13 POST /login 200 ua="Chrome/124"  region=eu-west sso=false
14:15 POST /login 500 ua="Safari/15.3" region=us-east sso=false err="TypeError: crypto.randomUUID is not a function" (client log)
14:16 POST /login 200 ua="Safari/17.4" region=us-east sso=true
\`\`\`

- A frontend release went out at 14:05; the backend was not deployed today.
- Failure by browser: Chrome 0.4%, Firefox 0.6%, Safari 31%.
- SSO sign-ins (which use a different page) are unaffected.
- Team capability test (synthetic, secure https page): crypto.randomUUID supported in Safari 17.4; not supported in Safari 15.3.

The log lines are reported evidence (client logs can mislabel user agents or context), not guaranteed truth.

Narrow the affected population and the likely boundary using this evidence. State which details are consistent with your conclusion and which one log line does not fit neatly with the capability test and needs checking.`,
    rubric: [
      "Narrow the population to Safari users on the password sign-in page after the 14:05 frontend release",
      "Place the likely boundary in client code rather than the backend or a region, citing the release time and SSO difference",
      "Flag the 14:12 Safari 17.4 failure as conflicting with the supplied capability test and propose checking it, such as the reported user agent, an insecure context, or a missing polyfill",
    ],
  },
  "PE:T17.3": {
    title: "Three incidents / triage",
    prompt: `Three defects were reported this morning. Triage them.

A. Some users' exported invoices show another customer's company name. Seen twice; not yet reproduced.
B. The dashboard chart shows times in UTC instead of local time for all users. Reproduces every time.
C. Saving a project fails for about 2% of saves with a "try again" message; retrying works. Started after yesterday's release.

For each, judge how severe it is, how many users it reaches, how reliably it reproduces, whether data could leak or be lost, and what quick mitigation exists. Order them by priority and justify the order, especially where it differs from how reproducible each is.`,
    rubric: [
      "Rank A highest because of possible cross-customer data exposure despite low reproducibility",
      "Assess each defect's scope, reproducibility, and risk from the given details",
      "Identify a mitigation for each, such as disabling invoice export, rolling back for C, or deferring B",
    ],
  },
  "PE:T17.4": {
    title: "Checkout errors / choosing a mitigation",
    prompt: `At 11:00 a release went out containing three changes: a new checkout layout (behind flag checkout_v2, on for 100%), a database index, and a logging-library upgrade. Since 11:05, 8% of checkout attempts fail with a JavaScript error in the new layout's address form. Facts:

- Turning off checkout_v2 takes 30 seconds and restores the old, working layout.
- Rolling back the whole release takes 25 minutes and also removes the index, which a migration already relies on.
- An engineer says a one-line code fix could be deployed in about 45 minutes.
- Checkout handles about $20,000 per hour.

Choose among rollback, disabling the feature, an operational mitigation, and an immediate code fix. Justify the choice by blast radius and reversibility, and say what happens after the immediate action.`,
    rubric: [
      "Choose disabling checkout_v2 first as the fastest, narrowest, reversible action",
      "Explain why the full rollback is riskier due to the dependent index and why waiting for the code fix costs revenue",
      "Plan the follow-up: ship the fix with a test, then re-enable gradually",
    ],
  },
  "PE:T17.5": {
    title: "Duplicate notifications / post-fix validation",
    prompt: `Incident: for two hours, some users received the same push notification 3-5 times. A fix was deployed: the notification worker now records each notification id before sending and skips ids it has already recorded. Facts:

- The duplicates began when the worker was scaled from 1 to 4 instances.
- Before the incident, there was no metric for sends per notification id.
- The on-call engineer learned about it from social media 90 minutes in.

Specify how you will validate that the fix works in production, including the signal and the time window. Then name the minimum follow-up work to prevent recurrence and to detect such a problem faster, and say what you would deliberately not add.`,
    rubric: [
      "Validate with a concrete signal, such as sends per notification id staying at one across all four instances, over a defined window",
      "Propose minimal follow-ups: an alert on duplicate sends and a test with multiple workers",
      "Explicitly scope out unnecessary additions with a reason",
    ],
  },
};

const uxQuestions: Record<string, DeliveryQuestion> = {
  "PE:T18.1": {
    title: "Team activity panel / user-visible states",
    prompt: `A side panel lists the last 30 days of activity in a project (edits, comments, shares). Facts:

- It loads with GET /projects/:id/activity, which takes 200 ms to 3 s.
- A new project has no activity.
- Activity older than 7 days is unavailable on the Free plan; Free users see only the last 7 days.
- Viewers may see edits and comments but not share events; the server omits them.
- The activity service is sometimes down while the rest of the app works.
- The panel has no pagination and no real-time updates.

Candidate generic states from a design-system checklist: loading, empty, success, error, partial or restricted data, loading more (pagination), live update arrived, offline draft.

Enumerate the user-visible states this panel actually needs, and for each give what the user sees. Then name one candidate state from the checklist that does not apply here and why.`,
    rubric: [
      "Cover loading, empty, success, error or unavailable service, plan-limited history, and the viewer's filtered view",
      "Describe concrete content for each state",
      "Exclude a state that does not apply, such as 'loading more' pagination, with a fact-based reason",
    ],
  },
  "PE:T18.2": {
    title: "Four actions / proportional feedback",
    prompt: `Choose feedback, confirmation, undo, or retry behavior for each action:

A. Starring a project (instant, harmless, reversible).
B. Deleting a comment (fast; the server can restore it for 30 days).
C. Permanently deleting a workspace with 400 projects (takes about 1 minute; cannot be undone).
D. Sending a large export to email (takes 2-10 minutes; fails about 1% of the time).

For each, justify your choice by latency, reversibility, and consequence. Explain why using a confirmation dialog for all four would be worse.`,
    rubric: [
      "Use lightweight optimistic feedback for A and undo instead of confirmation for B",
      "Use strong confirmation, such as typing the name, plus progress for C",
      "Use background progress, notification on completion, and retry for D, and explain confirmation fatigue",
    ],
  },
  "PE:T18.3": {
    title: "Offline comment / preserving context",
    prompt: `A user writes a long comment on a design and clicks Post just as the network drops. The current behavior: a red toast "Network Error" appears for 3 seconds, the comment box is cleared, and the scroll position jumps to the top. Facts:

- The app can detect offline and online events.
- Posting is safe to retry if the client sends an idempotency key.
- Comments are tied to a position on the design.

Redesign the failure behavior. Explain how the user's text and context are preserved, what recovery path is offered, and what the user sees when the network returns. Say how you prevent a double post on retry.`,
    rubric: [
      "Keep the comment text, pinned position, and scroll context instead of clearing them",
      "Offer a meaningful recovery path, such as a persistent failed state with retry or automatic resend when back online",
      "Prevent double posting using the idempotency key",
    ],
  },
  "PE:T18.4": {
    title: "Error copy / critique and rewrite",
    prompt: `Critique and rewrite each message. Facts about each situation are in brackets.

1. "Error 413: Payload Too Large" [uploaded file exceeds the 25 MB limit]
2. "Something went wrong." [payment card was declined by the bank]
3. "NullPointerException in ShareService.java:212" [sharing failed on the server; retry usually works]
4. "Invalid input." [project name contains "/", which is not allowed]
5. "Your session has been terminated due to a security policy violation." [session expired after 30 minutes of inactivity]

For each, say what is wrong and write a replacement of at most two short sentences telling the user what occurred and their next step, with no internal details.`,
    rubric: [
      "Identify the specific problem in each message, such as exposed internals, vagueness, or alarming wording",
      "Rewrite each to state what happened plus a concrete next step, using the bracketed facts",
      "Keep the rewrites concise and free of stack traces or status codes",
    ],
  },
  "PE:T18.5": {
    title: "Undo send / end-to-end edge cases",
    prompt: `A messaging feature works as specified:

1. User clicks Send; the message appears immediately with a 10-second "Undo" button.
2. After 10 seconds the client sends it to the server.
3. If the tab is closed during those 10 seconds, the message is discarded silently.
4. If the recipient is removed from the channel during the 10 seconds, the server rejects the send and the client removes the message from the list without a notice.
5. Messages sent on a second device appear there only after a reload.

Each piece is technically correct. Review the end-to-end flow for edge cases that confuse users or create unsafe outcomes. For the two most serious ones, propose a change.`,
    rubric: [
      "Identify that closing the tab silently loses a message the user believes was sent",
      "Identify that silently removing a rejected message hides the failure from the sender",
      "Propose changes for the two most serious cases, justified by user consequence",
    ],
  },
};

const integrationQuestions: Record<string, DeliveryQuestion> = {
  "PE:T19.1": {
    title: "Pinned comments / connecting the artifacts",
    prompt: `Requirement: "Project editors can pin up to 3 comments so they appear at the top of the comment panel for everyone on the project." Existing system: a React app; a comments table (id, project_id, author_id, body, created_at); GET /projects/:id/comments; project roles viewer and editor checked on the server; a feature-flag service; an analytics tool.

List the artifacts this requirement needs: the UI change, the API contract, the data change, the authorization rule, the tests, one metric, and the rollout. Keep each to one or two lines. Then name one layer someone might propose that this feature does not need, and why.`,
    rubric: [
      "Connect the requirement to concrete UI, contract, data, authorization, test, metric, and rollout items",
      "Enforce editor-only pinning and the limit of 3 on the server",
      "Reject an unnecessary layer, such as a new service or real-time channel, with a reason",
    ],
  },
  "PE:T19.2": {
    title: "Scheduled posts / cross-layer assumptions",
    prompt: `A "schedule post" feature has three parts, each tested and correct on its own:

- UI: a date-time picker shows local time and sends "2024-06-01T09:00" (no offset) to the API.
- API: stores the received string as a UTC timestamp.
- Worker: every minute, publishes posts whose timestamp is earlier than the current UTC time.

A user in Tokyo (UTC+9) schedules a post for 09:00. Trace what happens end to end and when the post is published in Tokyo time. Identify the assumption each layer makes about the other, and where the contract should be fixed. Then name one other way a failure in one part could propagate silently to the user.`,
    rubric: [
      "Trace that the post is published at 18:00 Tokyo time because the offset-free value is treated as UTC",
      "Identify the mismatched time-zone assumptions and fix the contract with an explicit offset or UTC instant",
      "Name another silent propagation path, such as a worker failure leaving posts unpublished without user feedback",
    ],
  },
  "PE:T19.3": {
    title: "Shared checklists / thin slice",
    prompt: `The team is building collaborative checklists inside projects. The full plan includes: create and edit items, assign people, due dates, reminders by email, live updates for others, reordering by drag, and templates. The riskiest open question: will two people editing the same checklist at once lose each other's changes? The product's other uses of live updates are none; it currently refreshes on page load.

Choose a thin end-to-end slice to build first. State which pieces from the plan it includes and which it postpones, what it must touch in the UI, API, and data layers, and what the slice must demonstrate to retire the riskiest question. Explain why building the full UI first would not answer that question.`,
    rubric: [
      "Pick a slice of create, edit, and toggle with concurrent edits across UI, API, and data layers",
      "Postpone non-risky features such as templates, reminders, and drag reordering",
      "State a concrete demonstration criterion for concurrent edits and explain why breadth-first work delays it",
    ],
  },
  "PE:T19.4": {
    title: "Saved filters / deciding whether it worked",
    prompt: `The team shipped "saved filters" on the project list. Goal stated before launch: "Users who manage many projects find them faster." Facts:

- The release went to 50% of workspaces as a random experiment; the rest are a control group.
- Available data: time from opening the list to opening a project, filter-creation events, API error rates and latency for GET /projects, and support tickets.
- 60% of users have fewer than 10 projects.

Define how the team will decide, after four weeks, whether saved filters succeeded, both as working software and for the people using them. Give the primary user metric, the technical health checks, a guardrail, and the decision rule, including which users to analyze.`,
    rubric: [
      "Define a primary user metric such as time to open a project for users with many projects, compared with control",
      "Include technical health checks on errors and latency plus a guardrail",
      "State a decision rule in advance and explain why the many-projects segment matters",
    ],
  },
  "PE:T19.5": {
    title: "Pinned comments / adapting to a changed assumption",
    prompt: `A design for "pin comments" is ready:

- Pins stored as a pinned_at column on the comments table.
- Only project editors can pin; limit 3 per project, enforced by the API.
- The comment panel sorts pinned comments first.
- Rollout behind a flag to 10% of workspaces; the metric is the share of projects with at least one pin.

New information: legal requires that pins be per-user (each person pins comments for themselves only), not shared with the project.

Adapt the design. Say which parts must change and how, which parts remain stable, and whether the rollout or metric needs adjusting.`,
    rubric: [
      "Move pins to a per-user record, such as a user_comment_pins table, instead of a column on comments",
      "Revise authorization so any reader can pin for themselves, and reconsider the limit",
      "Keep the stable parts, such as the panel ordering, the flag, and the rollout, and adjust the metric to per-user use",
    ],
  },
};

const modelQuestions: Record<string, DeliveryQuestion> = {
  "PE:X03.1": {
    title: "Ticket summarizer / failure modes and fallback",
    prompt: `A synthetic help-desk product adds "Summarize ticket": a model reads a support ticket thread and shows a 3-bullet summary to the agent. Facts:

- Threads range from 200 to 40,000 tokens; the model's context limit is 16,000 tokens.
- Model latency is about 2 s at the median and 14 s at the 99th percentile; agents expect a result within 5 s.
- Budget: $0.01 per summary; the model costs $0.40 per million input tokens.
- In a pilot, 3% of summaries stated a refund had been issued when it had not.

Design the interaction around these failure modes. Cover long threads, latency beyond 5 s, cost, and the false-refund claims, and describe the fallback UX when the model fails or times out.`,
    rubric: [
      "Handle threads beyond the context limit and keep cost within budget with a stated approach, such as truncation or chunking",
      "Address the 5 s expectation with streaming, a timeout, or a non-blocking UI, plus a fallback when the model fails",
      "Mitigate the false refund claims, for example by checking against ticket data or labeling, rather than trusting the summary",
    ],
  },
  "PE:X03.2": {
    title: "Ticket summarizer / evaluation set",
    prompt: `The team wants to switch the "Summarize ticket" feature from model A to cheaper model B and to change its prompt. They have: 5,000 past synthetic tickets with outcomes, a log of which summaries agents edited before using them, and three support leads available for two hours.

Propose a test set and scoring criteria for comparing A, B, and the new prompt. Say how many and which tickets you include (cover the known risky cases, such as refunds and very long threads), what each summary is scored on, and who or what scores it. Then explain how you would tell whether offline scores reflect real agent outcomes after release.`,
    rubric: [
      "Build a stratified dataset including refund, long-thread, and typical tickets at a size the reviewers can score",
      "Define explicit criteria, such as factual accuracy and key-fact coverage, applied the same way to every variant",
      "Link offline scores to an online outcome, such as the agent edit rate, and acknowledge where they can diverge",
    ],
  },
  "PE:X03.3": {
    title: "Order-status assistant / diagnosing a failing workflow",
    prompt: `A synthetic shopping assistant answers "Where is my order?" It retrieves the user's orders, calls a get_shipment tool, and the model writes a reply. One trace:

\`\`\`
user: where is order 5521?
retrieved orders: [5512 (delivered), 5520 (processing)]
tool call: get_shipment(order_id="5512") -> {status:"delivered", date:"May 2"}
model reply: "Order 5521 was delivered on May 2."
UI: shows reply with a green "Delivered" badge parsed from the reply text
\`\`\`

Order 5521 exists and is in transit. Locate the failure at each stage: context, retrieval, tool execution, model behavior, and downstream product logic. Choose the cheapest justified intervention first and explain why it beats changing the model.`,
    rubric: [
      "Identify that retrieval omitted order 5521, so the model lacked the right context",
      "Identify the model calling the tool with the wrong id and asserting an unsupported claim, and the UI deriving a badge from free text",
      "Choose a cheap targeted intervention, such as fixing retrieval or looking up the requested id directly, with a reason",
    ],
  },
};

const frontendSystemQuestions: Record<string, DeliveryQuestion> = {
  "PE:X07.1": {
    title: "Notification inbox / time-boxed frontend design",
    prompt: `In a 30-minute interview round, design the frontend for a notification inbox in a web app. Given requirements:

- A bell icon in the header shows an unread count; clicking it opens a panel listing notifications, newest first.
- Users can have up to 5,000 notifications; the API returns pages of 25 with a cursor.
- Clicking a notification marks it read and navigates to its target.
- New notifications should appear within about 30 seconds; no push channel exists yet.
- The panel must work by keyboard and with screen readers.

First, ask the two clarifying questions you consider most important and state the assumption you will use for each. Then outline, prioritized by risk: components and where state lives, the API calls and response shape, the rendering approach for long lists, one performance budget and one accessibility requirement, the failure states, and one instrumentation event. Keep each item brief; say which items you would cut first if time ran out.`,
    rubric: [
      "Ask relevant clarifying questions and state working assumptions",
      "Outline components and state, a paginated API contract, the read-marking flow, and a refresh strategy within 30 seconds",
      "Address long-list rendering, a concrete performance budget, keyboard and screen-reader behavior, failure states, and instrumentation",
      "Prioritize by risk and name what to cut first",
    ],
  },
  "PE:X07.2": {
    title: "Shared task board / real-time client design",
    prompt: `A task board lets up to 20 teammates move cards between columns and edit card titles at the same time. Facts:

- Moves must appear to others within 2 seconds.
- Users on trains lose the connection for up to 5 minutes and keep working.
- The server assigns each change an increasing sequence number and can return all changes after a given number.
- Two people editing the same title at once is rare; moving the same card at once happens a few times a day.

Choose a transport (polling, server-sent events, or WebSockets) and justify it. Explain how the client reconnects and fetches missed updates, how local changes are queued with optimistic state while offline, and which conflict approach (last-write-wins, a server-authoritative merge, OT, or a CRDT) you choose for moves and for titles, with trade-offs. No algorithm implementation is needed.`,
    rubric: [
      "Choose a transport with a reason tied to the 2-second and 20-user facts",
      "Use the sequence number to catch up after reconnecting, and queue offline mutations with optimistic display and later reconciliation",
      "Choose conflict approaches for moves and titles with trade-offs proportional to how often conflicts occur",
    ],
  },
  "PE:X07.3": {
    title: "Streamed chat answer / rendering design",
    prompt: `A chat product streams AI answers token by token. Facts:

- Tokens arrive about every 20 ms; answers can reach 4,000 tokens with Markdown and code blocks.
- The current implementation re-parses the full Markdown and re-renders the entire message on every token. On mid-range laptops, typing in the input box lags by 300 ms during streaming, and the page jumps when code blocks finish.
- Conversations can contain 500 earlier messages, all rendered in the DOM.
- Users often scroll up to read earlier messages while an answer streams.

Design the rendering approach to control input latency, layout shift, and memory. Then adapt your design when one constraint changes: answers may now include live-updating charts that must stay interactive.`,
    rubric: [
      "Reduce per-token work by batching updates per frame and parsing incrementally or only the last block",
      "Control layout shift and scroll position, and virtualize the 500 earlier messages to limit memory",
      "Adapt the design for interactive charts, for example isolating them as stable components updated independently",
    ],
  },
};

const javascriptQuestions: Record<string, DeliveryQuestion> = {
  "PE:X08.1": {
    title: "Event loop and this / runtime trace",
    prompt: `This code runs as an ES module (strict mode) in a browser:

\`\`\`js
const out = [];
const counter = { n: 0, inc() { this.n++; out.push(this.n); } };
const inc = counter.inc;
setTimeout(() => out.push("timeout"), 0);
Promise.resolve().then(() => out.push("micro"));
for (var i = 0; i < 2; i++) setTimeout(() => out.push("i" + i), 0);
counter.inc();
try { inc(); } catch (e) { out.push("err"); }

async function load() { throw new Error("boom"); }
try { load(); } catch (e) { out.push("caught"); }
\`\`\`

Predict the contents of out after all queued work has finished, and explain each entry using \`this\` binding, closures over var, and the order of microtasks versus timers. Explain why "caught" is or is not pushed and how to catch load's error. Finally, write a TypeScript signature for a helper once(fn) that preserves fn's parameter and return types.`,
    rubric: [
      "Predict the exact final order of out with reasons for each entry",
      "Explain the lost this in strict mode, the shared var i, and microtasks running before timers",
      "Explain that the async error becomes a rejected promise not caught by the synchronous try, show await or catch, and give a correctly typed once signature",
    ],
  },
  "PE:X08.2": {
    title: "Debounce utility / implementation and tests",
    prompt: `Implement debounce(fn, waitMs) in plain JavaScript or TypeScript with this behavior:

- Each call restarts a timer; fn runs once, waitMs after the last call, with the arguments and \`this\` of that last call.
- The returned function has cancel(), which drops a pending call.
- It also has flush(), which runs a pending call immediately and returns its result; flush() does nothing if no call is pending.

Write the implementation. Then write three or four small tests using fake timers (assume your test runner offers useFakeTimers() and advanceTimersByTime(ms)). Cover the edge cases that matter most, and say which edge case you consciously left untested.`,
    rubric: [
      "Implement restart-on-call timing that uses the last call's arguments and this",
      "Implement cancel and flush correctly, including flush with nothing pending",
      "Write focused fake-timer tests covering the key edge cases, and name an untested case",
    ],
  },
  "PE:X08.3": {
    title: "Accessible tabs / time-boxed component",
    prompt: `In 45 minutes, build a Tabs component twice: once with plain DOM APIs and no framework, and once in React. Requirements:

- Tabs come from a list of {id, label}; selecting a tab loads its content from an async function loadPanel(id) that returns a string after 100-1,000 ms and sometimes rejects.
- Show a loading state and an error with a retry button.
- Keyboard: Left and Right arrows move between tabs, Home and End jump to the first and last tab; use the tab and tabpanel roles with aria-selected.
- If the user switches tabs quickly, an older response must not overwrite the current panel.

Write both versions or the key parts of each. Then list what you cut to fit the time and why those cuts were acceptable.`,
    rubric: [
      "Implement selection state, click and arrow, Home, and End keyboard handling with correct ARIA roles in both versions",
      "Handle loading, error with retry, and stale responses when switching quickly",
      "State explicit cuts with reasons for the time box",
    ],
  },
};

/** All delivery questions keyed by objective id (54 entries). */
export const deliveryQuestions: Record<string, DeliveryQuestion> = {
  ...accessQuestions,
  ...commercialQuestions,
  ...testingQuestions,
  ...debuggingQuestions,
  ...reviewQuestions,
  ...releaseQuestions,
  ...operationsQuestions,
  ...uxQuestions,
  ...integrationQuestions,
  ...modelQuestions,
  ...frontendSystemQuestions,
  ...javascriptQuestions,
};
