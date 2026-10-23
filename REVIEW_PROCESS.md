# Review and merging in this fork

This policy governs `CrispStrobe/extensions`. The repository owner directs work
in this independently maintained fork.

## Authorization

The owner's instructions authorize implementation, testing, commits, normal
pushes, pull requests, repairs and qualified merges within the requested scope.
Agents should carry that work through completion without asking for another
approval for each already-authorized step.

There is no standing requirement for two external reviewer approvals. The
owner may explicitly request additional review for a particular change. Record
actual reviews accurately; never invent approvals or represent automated
checks as human reviews.

## Qualification

- Preserve existing owners' work and use isolated branches or worktrees.
- Explain the problem, resulting behavior, relevant validation and remaining
  limits in the pull request.
- Pass every enabled check on the exact proposed head. Only explicitly declared
  conditional skips are allowed.
- Qualify affected behavior with appropriate protocol, guest or consumer tests.
  Documentation changes require the applicable documentation and policy checks.
- Preserve original failures. Repair their cause without weakening assertions,
  thresholds, baselines or evidence requirements to obtain a passing result.
- Merge normally against the reviewed head, and verify the landed tree and
  parents. Do not force-push, rewrite shared history or enable automatic merge.
- When another owned repository consumes the change, land the supplier first,
  then update the exact dependency pin and its reproducible derived evidence.

## Repository boundary

Owner authorization applies to the requested work in owned repositories.
Upstream submissions, pushes, maintainer contact and support requests require
an explicit instruction from the owner. This fork's workflow does not direct
contributors to contact upstream reviewers.

The previous reviewer-count and maintainer-contact instructions were inherited
from the upstream project. This fork-specific policy replaces them here.
