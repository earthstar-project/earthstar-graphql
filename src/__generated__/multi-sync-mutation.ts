/* eslint-disable */
/* This is an autogenerated file. Do not edit this file directly! */
export type MultiSyncMutation = {
    syncMany: ({
        __typename: "SyncSuccess" | "WorkspaceNotFoundError" | "SyncError" | "DetailedSyncSuccess";
    } & (({
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
};
export type MultiSyncMutationVariables = {
    workspaces: ({
        address: string;
        pubs: string[];
    })[];
};
