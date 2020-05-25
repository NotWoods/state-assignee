import { OctokitResponse } from '@octokit/types';
import { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/types';

export { OctokitOptions } from '@octokit/core/dist-types/types';
export {
  ReposListCollaboratorsParams,
  IssuesListForRepoParams,
  IssuesListEventsParams,
} from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/types';

type OctokitItem<T> = T extends () => Promise<OctokitResponse<Array<infer U>>>
  ? U
  : never;

export type ReposListCollaboratorsResponseItem = OctokitItem<
  RestEndpointMethods['repos']['listCollaborators']
>;
export type IssuesListForRepoResponseItem = OctokitItem<
  RestEndpointMethods['issues']['listForRepo']
>;
export type IssuesListEventsResponseItem = OctokitItem<
  RestEndpointMethods['issues']['listForRepo']
> & { event: string };
