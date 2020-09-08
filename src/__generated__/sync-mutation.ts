/* eslint-disable */
/* This is an autogenerated file. Do not edit this file directly! */
export type SyncMutation = {
    syncWithPubs: {
        __typename: "SyncReport" | "WorkspaceNotFoundError" | "WorkspaceNotValidError";
    } & (({
        syncedWorkspace: {
            address: string;
        };
        pubSyncResults: ({
            __typename: "DetailedSyncSuccess" | "SyncSuccess" | "SyncError";
        } & ({
            pubUrl: string;
        }) & (({
            pushed: {
                ignoredCount: number;
                rejectedCount: number;
                acceptedCount: number;
            };
            pulled: {
                ignoredCount: number;
                rejectedCount: number;
                acceptedCount: number;
            };
        })))[];
    }));
};
export type SyncMutationVariables = {
    workspace: string;
    pubUrls: string[];
};
