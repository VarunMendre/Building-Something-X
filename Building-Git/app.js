// ─── What is this? ───────────────────────────────────────────────────────────
//
// A minimal Git implementation in JavaScript.
// Real Git is complex — this captures just the core idea:
//   - A repo holds branches
//   - A branch is just a pointer to the latest commit
//   - A commit stores its message + a reference to its parent commit
//   - HEAD always tells you which branch you're currently on
//
// Commit chain looks like this:
//   HEAD → branch → commit C → commit B → commit A → null
//                   (latest)                         (first, no parent)

// ─── Commit ──────────────────────────────────────────────────────────────────

// A Commit is a single snapshot in history.
// Every commit knows its parent, forming a backwards-linked chain.
// The very first commit has parent = null (nothing came before it).
class Commit {
  constructor(id, parent, message) {
    this.id = id; // auto-incrementing number: 0, 1, 2 ...
    this.parent = parent; // points to the previous Commit, or null if this is the first
    this.message = message;
  }
}

// ─── Branch ──────────────────────────────────────────────────────────────────

// A Branch is just a named pointer to a commit.
// When you make a new commit on a branch, the branch's pointer moves forward.
// Two branches can point to the same commit — that's how branching starts.
class Branch {
  constructor(name, commit) {
    this.name = name; // e.g. "master", "feature"
    this.commit = commit; // the latest Commit on this branch, or null if no commits yet
  }
}

// ─── Git (the repo) ──────────────────────────────────────────────────────────

class Git {
  constructor(name) {
    this.name = name; // just a label for the repo
    this.lastCommitId = -1; // incremented before each commit, so first commit gets id 0
    this.branches = []; // all branches that exist in this repo

    // Every repo starts with a "master" branch with no commits yet.
    // HEAD points to the current branch — where new commits will land.
    // We must create master first, then assign HEAD — order matters here.
    const master = new Branch("master", null);
    this.branches.push(master);
    this.HEAD = master;
  }

  // commit(message)
  // Creates a new snapshot on the current branch.
  //
  // How it works:
  //   1. Increment the global commit counter and create a new Commit.
  //      The new commit's parent = whatever the branch was pointing to before.
  //   2. Move the current branch's pointer forward to this new commit.
  //
  // Before:  HEAD → master → commitA
  // After:   HEAD → master → commitB → commitA
  commit(message) {
    // ++this.lastCommitId increments first, then uses the value
    // so ids go: 0, 1, 2 ... never -1
    const commit = new Commit(++this.lastCommitId, this.HEAD.commit, message);

    // Advance the current branch to point at the new commit
    this.HEAD.commit = commit;

    return commit;
  }

  // log()
  // Returns the full commit history of the current branch,
  // from newest → oldest (same as `git log`).
  //
  // Works by following the parent chain starting from HEAD:
  //   HEAD.commit → parent → parent → ... → null
  log() {
    // Edge case: no commits yet on this branch
    if (!this.HEAD.commit) return [];

    const history = [];
    let commit = this.HEAD.commit; // start at the latest commit

    // Walk backwards through parents until we hit null (the first commit)
    while (commit) {
      history.push(commit);
      commit = commit.parent; // move one step back in history
    }

    return history; // newest first, oldest last
  }

  // checkout(branchName)
  // Switches HEAD to a different branch.
  // If the branch doesn't exist yet, it creates one starting at the current commit.
  //
  // This mirrors `git checkout <branch>` and `git checkout -b <branch>` combined.
  checkout(branchName) {
    // First, check if a branch with this name already exists
    for (let i = this.branches.length - 1; i >= 0; i--) {
      if (this.branches[i].name === branchName) {
        console.log(`Switched to existing branch: ${branchName}`);
        this.HEAD = this.branches[i]; // point HEAD at the found branch
        return this; // return this so calls can be chained
      }
    }

    // Branch doesn't exist — create it.
    // The new branch starts at whatever commit HEAD is currently on.
    // Both branches now point to the same commit, but will diverge
    // as you make new commits on each.
    const newBranch = new Branch(branchName, this.HEAD.commit);
    this.branches.push(newBranch);
    this.HEAD = newBranch;

    console.log(`Switched to new branch: ${branchName}`);
    return this; // chainable: repo.checkout("dev").commit("first dev commit")
  }
}

// ─── Test Helper ─────────────────────────────────────────────────────────────

// assert() is our tiny test utility.
// It takes a condition (true/false) and a label (what we're testing).
//
// Why not use Node's built-in `assert`?
// Node's assert *throws* on failure, which stops all remaining tests.
// This version just logs the failure and keeps going — so you see everything at once.
function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}`);
    process.exitCode = 1; // mark the process as failed without throwing
  }
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

function runTests() {
  // ── Test 1: Initialisation ─────────────────────────────────────────────────
  // A brand-new repo should start in a known, clean state.
  // No commits, one branch (master), HEAD pointing at master.
  console.log("\n── Test 1: Initialisation ──────────────────────────────────");
  {
    const repo = new Git("my-repo");
    assert(repo.name === "my-repo", "repo name is set");
    assert(repo.lastCommitId === -1, "lastCommitId starts at -1");
    assert(repo.HEAD.name === "master", "HEAD points to master");
    assert(repo.branches.length === 1, "one branch exists (master)");
    assert(repo.HEAD.commit === null, "master has no commit yet");
  }

  // ── Test 2: Single commit ──────────────────────────────────────────────────
  // The first commit should get id 0, store its message,
  // have no parent (it's the root), and update HEAD.commit.
  console.log("\n── Test 2: Single commit ───────────────────────────────────");
  {
    const repo = new Git("repo");
    const c = repo.commit("initial commit");
    assert(c.id === 0, "first commit id is 0");
    assert(c.message === "initial commit", "commit message is stored");
    assert(c.parent === null, "first commit has no parent");
    assert(repo.HEAD.commit === c, "HEAD.commit updated");
  }

  // ── Test 3: Multiple commits and log order ─────────────────────────────────
  // log() should walk the parent chain and return commits newest → oldest.
  // c2 → c1 → c0 → null
  console.log("\n── Test 3: Multiple commits and log order ──────────────────");
  {
    const repo = new Git("repo");
    const c0 = repo.commit("first");
    const c1 = repo.commit("second");
    const c2 = repo.commit("third");

    const history = repo.log();
    assert(history.length === 3, "log returns 3 commits");
    assert(history[0] === c2, "log[0] is the latest commit");
    assert(history[1] === c1, "log[1] is the middle commit");
    assert(history[2] === c0, "log[2] is the first commit");
    assert(history[2].parent === null, "first commit parent is null");
  }

  // ── Test 4: Log on empty repo ──────────────────────────────────────────────
  // If no commits have been made, log() should return [] not crash.
  console.log("\n── Test 4: Log on empty repo ───────────────────────────────");
  {
    const repo = new Git("repo");
    assert(repo.log().length === 0, "log is empty before any commit");
  }

  // ── Test 5: Checkout new branch ────────────────────────────────────────────
  // Checking out a name that doesn't exist should create a new branch
  // starting at the current commit. HEAD should now point at that new branch.
  console.log("\n── Test 5: Checkout new branch ─────────────────────────────");
  {
    const repo = new Git("repo");
    repo.commit("base");
    repo.checkout("feature");

    assert(repo.HEAD.name === "feature", "HEAD switched to feature");
    assert(repo.branches.length === 2, "two branches exist");
    // feature was created from master's latest commit,
    // so it starts at the same point
    assert(
      repo.HEAD.commit.id === 0,
      "feature starts at same commit as master",
    );
  }

  // ── Test 6: Checkout existing branch ──────────────────────────────────────
  // Checking out a name that already exists should just move HEAD —
  // no new branch should be created, and no commits should be lost.
  console.log("\n── Test 6: Checkout existing branch ────────────────────────");
  {
    const repo = new Git("repo");
    repo.commit("base");
    repo.checkout("feature");
    repo.commit("feature work");
    repo.checkout("master"); // back to existing master

    assert(repo.HEAD.name === "master", "HEAD back on master");
    // master didn't get the "feature work" commit — branches are independent
    assert(repo.HEAD.commit.id === 0, "master still at commit 0");
    assert(repo.branches.length === 2, "no duplicate branch created");
  }

  // ── Test 7: Branches are independent ──────────────────────────────────────
  // Commits made on one branch should not appear on the other.
  // They share history up to the point of branching, then diverge.
  //
  // Timeline:
  //   master:  base(0) ──────────────── master-work(3)
  //   feature: base(0) → featureA(1) → featureB(2)
  console.log("\n── Test 7: Branches are independent ────────────────────────");
  {
    const repo = new Git("repo");
    repo.commit("shared base"); // id 0 — both branches will share this

    repo.checkout("feature");
    repo.commit("feature A"); // id 1 — only on feature
    repo.commit("feature B"); // id 2 — only on feature

    repo.checkout("master");
    repo.commit("master work"); // id 3 — only on master

    // master should have advanced independently of feature
    assert(repo.HEAD.commit.id === 3, "master advanced independently");
    // master's parent should be the shared base, not anything from feature
    assert(repo.HEAD.commit.parent.id === 0, "master parent is shared base");

    // switch back to feature and verify its chain is intact
    repo.checkout("feature");
    assert(repo.HEAD.commit.id === 2, "feature still at commit 2");
    assert(repo.HEAD.commit.parent.id === 1, "feature parent chain intact");
  }

  // ── Test 8: commit() returns the Commit object ────────────────────────────
  // commit() should hand back the newly created Commit so callers can
  // inspect it or store a reference to it.
  console.log("\n── Test 8: commit() returns the Commit object ──────────────");
  {
    const repo = new Git("repo");
    const c = repo.commit("hello");
    assert(c instanceof Commit, "commit() returns a Commit instance");
    assert(typeof c.id === "number", "commit id is a number");
  }

  // ── Test 9: checkout() is chainable ───────────────────────────────────────
  // checkout() returns `this` (the Git instance), so you can chain calls:
  //   repo.checkout("dev").commit("first dev commit")
  console.log("\n── Test 9: checkout() is chainable ─────────────────────────");
  {
    const repo = new Git("repo");
    repo.commit("base");
    const result = repo.checkout("dev");
    assert(result === repo, "checkout() returns the Git instance");
  }

  // ── Test 10: Multiple repos are isolated ──────────────────────────────────
  // Two separate Git instances should never share state.
  // Committing to r1 must not affect r2 in any way.
  console.log("\n── Test 10: Multiple repos are isolated ────────────────────");
  {
    const r1 = new Git("r1");
    const r2 = new Git("r2");
    r1.commit("r1 commit");
    assert(r2.lastCommitId === -1, "r2 unaffected by r1 commits");
    assert(r2.log().length === 0, "r2 log still empty");
  }

  console.log(
    "\n─────────────────────────────────────────────────────────────\n",
  );
}

runTests();
