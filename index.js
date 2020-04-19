const { Octokit } = require('@octokit/rest');
const pkg = require('./package.json');
const config = require('./config.js');

const [owner, repo] = config.repo.split('/');

const octokit = new Octokit({
  auth: config.apiKey,
  userAgent: `${pkg.name} v${pkg.version}`,
});

/**
 * @template T
 * @param {AsyncIterable<T>} asyncIterable
 * @returns {Promise<Array<T>>}
 */
async function arrayFromAsync(asyncIterable) {
  let result = [];
  for await (const value of asyncIterable) {
    result.push(value);
  }
  return result;
}

/**
 * Returns true if any issue assignees are not collaborators.
 * @param {ReadonlySet<string>} collaborators Usernames of collaborators
 * @param {ReadonlyArray<{ login: string }>} assignees Users assigned to an issue
 * @returns {boolean}
 */
function contributorsAssigned(collaborators, assignees) {
  return assignees.some((assignee) => !collaborators.has(assignee.login))
}

/**
 * Get all collaborators for a repo
 * @param {string} owner (ie: mozilla-mobile)
 * @param {string} repo (ie: fenix)
 * @returns {Promise<ReadonlySet<string>>}
 */
async function getCollaborators(owner, repo) {
  const options = octokit.repos.listCollaborators.endpoint.merge({
    owner,
    repo,
    affiliation: 'all',
  });
  const collaborators = await octokit.paginate(options);
  return new Set(collaborators.map((user) => user.login));
}

/**
 * Yields every issue with a contributor assigned to it.
 * @param {string} owner
 * @param {string} repo
 */
async function* issuesWithContributorsAssigned(owner, repo) {
  const collaboratorsPromise = getCollaborators(owner, repo);
  const options = octokit.issues.listForRepo.endpoint.merge({
    owner,
    repo,
    labels: config.labels,
    state: 'open',
    assignee: '*',
    sort: 'updated',
    direction: 'asc',
  });

  for await (const { data } of octokit.paginate.iterator(options)) {
    for (const issue of data) {
      if (issue.pull_request) continue;

      const collaborators = await collaboratorsPromise;
      if (contributorsAssigned(collaborators, issue.assignees)) {
        yield issue;
      }
    }
  }
}

async function main() {
  console.log(await arrayFromAsync(issuesWithContributorsAssigned(owner, repo)));
}

main();
