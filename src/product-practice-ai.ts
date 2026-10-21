// Small, self-contained local practice questions for AI-assisted engineering
// objectives (PE:T20.1-.5). Data only: no runtime dependencies or model calls.

export const aiPracticeQuestions: Record<
  string,
  { title: string; prompt: string; rubric: string[] }
> = {
  "PE:T20.1": {
    title: "Checking an AI orientation note",
    prompt: `Before adding share-link revocation, you asked an AI assistant to orient you in the repository. It replied:
"Share tokens are validated in src/middleware/shareAuth.ts. The share_links table already has an expires_at column, so revocation can set expires_at to now."

The repository file listing contains src/routes/projects.ts, src/routes/shares.ts and src/db/schema.sql; there is no src/middleware directory. schema.sql defines share_links(id, project_id, token, created_by, created_at).

How should you treat this reply before you rely on it? Name the claim you would check first, what in the repository you would look at, and what you would do if the check disagrees with the reply.`,
    rubric: [
      "Treats the reply as a hypothesis to verify rather than as authoritative knowledge of the repository.",
      "Notices that the supplied listing and schema contradict the named middleware path and the expires_at column.",
      "Proposes concrete checks in the actual code (for example searching where the token is read in the routes) and explains revising the plan from that evidence instead of acting on the reply.",
    ],
  },
  "PE:T20.2": {
    title: "Reviewing generated revocation code",
    prompt: `Requirements: only the project owner may revoke a share link; a revoked link must stop authorizing project reads; the owner's UI should show a link as revoked only after the server confirms.

Helpers: getLink(id) returns {id, projectId, token, revokedAt} or null; findLinkByToken(token) returns the same shape or null; getProject(id) returns {ownerId, memberIds}; isMember(userId, project) is true for the owner and every collaborator.

An AI assistant generated:
\`\`\`ts
export async function revokeLink(userId: string, linkId: string) {
  const link = await getLink(linkId);
  if (!link) return { status: 404 };
  const project = await getProject(link.projectId);
  if (!isMember(userId, project)) return { status: 403 };
  await setRevokedAt(link.id, new Date());
  return { status: 200 };
}

// existing, unchanged
export async function authorizeProjectRead(token: string) {
  return (await findLinkByToken(token)) !== null;
}

// Share dialog
async function onRevoke(id: string) {
  const res = await api.revoke(id);
  if (res.status === 200) markRevoked(id);
  else showError(res.status);
}
\`\`\`
It says: "Revoked links are already rejected by the read check. Tests pass." Test output: "✓ owner can revoke a link (200) — 1 passed".

Would you accept this code as is? If not, what would you change and why? Which one test would you add first?`,
    rubric: [
      "Gives a clear accept-or-change decision tied to the stated requirements rather than general style comments.",
      "Identifies that isMember lets any collaborator revoke, violating the owner-only requirement, and proposes comparing userId with project.ownerId.",
      "Identifies that authorizeProjectRead ignores revokedAt, so a revoked token still authorizes reads, and that the assistant's claim is unsupported because the passing test covers only the owner revoking.",
      "Proposes a test that would fail on the current code (a collaborator receiving 403, or a revoked token being denied a read) and explains what it demonstrates.",
    ],
  },
  "PE:T20.3": {
    title: "Choosing context to share with an assistant",
    prompt: `A test for share-link revocation fails and you want an AI assistant's help. You have these synthetic artifacts:
A. Failing test output: "expected 403, received 200" in revoke.test.ts.
B. The revokeLink handler (25 lines) and the test file revoke.test.ts.
C. config/local.env, which holds working values for SHARE_TOKEN_SECRET and DATABASE_URL (including a password).
D. A support-ticket export with customer names and email addresses complaining about old links.
E. A production log excerpt whose lines include full live share tokens next to the 403/200 responses.
F. The billing module, which does not touch sharing.

Which artifacts would you give the assistant, how would you prepare any of them first, and why would you leave the others out?`,
    rubric: [
      "Selects the task-relevant artifacts (the failing output and the handler and test code) and explains why they are enough to diagnose the failure.",
      "Does not paste secret values: excludes config/local.env or shares only variable names with values replaced by placeholders, and redacts tokens if any log line is used.",
      "Leaves out unrelated or sensitive material (customer names and emails, the billing module) with a reason based on relevance and privacy.",
    ],
  },
  "PE:T20.4": {
    title: "Separating verified facts from generated claims",
    prompt: `An AI assistant summarized its revocation change with three claims:
1. "Reads with a revoked token now return 410."
2. "The change is covered by tests."
3. "Cached project pages are invalidated immediately on revocation."

The diff you were given contains only this change to the read handler:
\`\`\`ts
const link = await findLinkByToken(token);
if (!link) return { status: 404 };
if (link.revokedAt) return { status: 410 };
return { status: 200, project: await loadProject(link.projectId) };
\`\`\`
Test run output:
\`\`\`
✓ revokeLink sets revokedAt (12 ms)
1 passed, 0 failed
\`\`\`

For each claim, say whether the supplied code or test output supports it, and point to the evidence. For any claim that is not supported, name one check that would verify it.`,
    rubric: [
      "Marks claim 1 as supported by the code (revokedAt leads to 410) while noting that no test exercises that path.",
      "Marks claim 2 as only partly supported: the single passing test covers setting revokedAt, not the read behavior.",
      "Marks claim 3 as unsupported because no caching code appears in the diff, and proposes a concrete check such as a test or runtime request after revocation.",
      "Keeps verified facts explicitly separate from the assistant's suggestions rather than accepting or rejecting all claims together.",
    ],
  },
  "PE:T20.5": {
    title: "Explaining a final design and a rejected alternative",
    prompt: `Your team has settled on this revocation design, and you are the engineer presenting it in review:
- share_links gains a revoked_at column.
- The revoke endpoint allows only the project owner.
- The shared-project read check denies tokens whose revoked_at is set.
- The Share dialog marks a link revoked only after the endpoint confirms.

An AI assistant had proposed instead: a separate revocation microservice with its own message queue, and hiding revoked links in the React dialog.

Explain to a reviewer how the final design meets the requirements, and why the assistant's proposal was changed or rejected. Base your explanation only on the design above.`,
    rubric: [
      "Explains how each part of the final design serves a requirement (owner-only revocation, revoked tokens denied on read, UI reflects the confirmed result).",
      "Rejects or changes the microservice and queue with a reason such as unnecessary complexity or delayed enforcement for a single column and check.",
      "Explains that hiding links in the UI does not stop a revoked token from authorizing reads, so enforcement must be on the server.",
    ],
  },
};
