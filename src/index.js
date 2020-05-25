const { GithubApi } = require('./github-api');
const config = require('../config.js');

const [owner, repo] = config.repo.split('/');

const api = new GithubApi(config.apiKey);

/**
 * Returns true if any issue assignees are not collaborators.
 * @param {ReadonlySet<string>} collaborators Usernames of collaborators
 * @param {ReadonlyArray<{ login: string }>} assignees Users assigned to an issue
 * @returns {boolean}
 */
function contributorsAssigned(collaborators, assignees) {
  return assignees.some((assignee) => !collaborators.has(assignee.login));
}

/**
 * Get all collaborators for a repo
 * @param {string} owner (ie: mozilla-mobile)
 * @param {string} repo (ie: fenix)
 * @returns {Promise<ReadonlySet<string>>}
 */
async function getCollaborators(owner, repo) {
  const collaborators = await api.listRepoCollaborators({
    owner,
    repo,
    affiliation: 'all',
  });
  return new Set(collaborators.map((user) => user.login));
}

/**
 * Yields every issue with a contributor assigned to it.
 * @param {string} owner
 * @param {string} repo
 * @param {ReadonlySet<string>} collaborators
 */
async function* issuesWithContributorsAssigned(owner, repo, collaborators) {
  const options = {
    owner,
    repo,
    labels: config.labels,
    state: 'open',
    assignee: '*',
    sort: 'updated',
    direction: 'asc',
  };

  for await (const issue of api.iterateIssuesForRepo(options)) {
    if (issue.pull_request) continue;

    if (contributorsAssigned(collaborators, issue.assignees)) {
      yield issue;
    }
  }
}

/**
 * Yields every assignment event (assigned/unassigned) for an issue.
 * @param {string} owner
 * @param {string} repo
 * @param {number} issue_number
 */
async function* assignmentEventsForIssue(owner, repo, issue_number) {
  const options = {
    owner,
    repo,
    issue_number,
  };

  for await (const event of api.iterateEventsForIssue(options)) {
    if (event.event === 'assigned' || event.event === 'unassigned') {
      yield event;
    }
  }
}

/**
 * Yields the current assignees of an issue and the time they were assigned on.
 * @param {string} owner
 * @param {string} repo
 * @param {number} issue_number
 */
async function issueAssigneesWithDates(owner, repo, issue_number) {
  /** @type {Map<string, Date>} login name of assignee to date they were assigned. */
  const assignees = new Map();
  for await (const event of assignmentEventsForIssue(
    owner,
    repo,
    issue_number
  )) {
    const actors = event.assignees || [event.assignee];
    const createdAt = new Date(event.created_at);
    if (event.event === 'assigned') {
      for (const actor of actors) {
        assignees.set(actor.login, createdAt);
      }
    } else if (event.event === 'unassigned') {
      for (const actor of actors) {
        assignees.delete(actor.login);
      }
    }
  }
  return assignees;
}

async function main() {
  const collaborators = await getCollaborators(owner, repo);
  for await (const issue of issuesWithContributorsAssigned(
    owner,
    repo,
    collaborators
  )) {
    console.log(`(#${issue.number}) ${issue.title}`);
    const assignees = await issueAssigneesWithDates(owner, repo, issue.number);
    for (const [assignee, date] of assignees) {
      console.log(` - ${assignee}, assigned on ${date}`);
    }
  }
}

main();
