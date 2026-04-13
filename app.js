(function () {
    function Git(name) {
        this.name = name; //Repo name
        this.lastCommitId = -1; // keep track of last commit id
        this.HEAD = null; // Reference to Last commit
    }

    Git.prototype.commit = function (message) {
        const commit = new Commit(++this.lastCommitId, this.HEAD, message);

        // update the HEAD
        this.HEAD = commit;

        return commit;
    };

    Git.prototype.log = function () {
        let history = []; // array of commits in reverse order.

        //Start from HEAD;
        let commit = this.HEAD;

        while (commit) {
            history.push(commit);
            // Keep following the parent
            commit = commit.parent;
        }

        return history;
    };

    function Commit(id, parent, message) {
        this.id = id;
        this.parent = parent;
        this.message = message;
    }

    // Exposing Git Class on window
    window.Git = Git;
})();


// Test #1
var repo = new Git("test");
repo.commit("Initial commit");
repo.commit("Change 1");

var log = repo.log();
console.assert(log.length === 2); // Should have 2 commits.
console.assert(!!log[0] && log[0].id === 1); // Commit 1 should be first.
console.assert(!!log[1] && log[1].id === 0); // And then Commit 0.