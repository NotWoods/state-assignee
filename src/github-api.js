const { Octokit } = require('@octokit/rest');
const pkg = require('../package.json');

exports.GithubApi = class GithubApi {
  /**
   * @param auth Octokit authentication method, such as an API key.
   * @see https://octokit.github.io/rest.js/v17#authentication
   */
  constructor(auth) {
    this.octokit = new Octokit({
      auth,
      userAgent: `${pkg.name} v${pkg.version}`,
    });
  }

  /**
   * @see https://octokit.github.io/rest.js/v17#repos-list-collaborators
   * @param {ReposListCollaboratorsParams} options
   * @returns {Promise<ReposListCollaboratorsResponseItem[]>}
   */
  async listRepoCollaborators(options) {
    const merged = this.octokit.repos.listCollaborators.endpoint.merge(options);
    return this.octokit.paginate(merged);
  }

  /**
   * @see https://octokit.github.io/rest.js/v17#issues-list-for-repo
   * @param {IssuesListForRepoParams} options
   * @returns {AsyncIterable<IssuesListForRepoResponseItem>}
   */
  async *iterateIssuesForRepo(options) {
    const merged = this.octokit.issues.listForRepo.endpoint.merge(options);
    for await (const { data } of this.octokit.paginate.iterator(merged)) {
      yield* data;
    }
  }

  /**
   * @see https://octokit.github.io/rest.js/v17#issues-list-events
   * @param {IssuesListEventsParams} options
   * @returns {AsyncIterable<IssuesListEventsResponseItem>}
   */
  async *iterateEventsForIssue(options) {
    const merged = this.octokit.issues.listEvents.endpoint.merge(options);
    for await (const { data } of this.octokit.paginate.iterator(merged)) {
      yield* data;
    }
  }
}
