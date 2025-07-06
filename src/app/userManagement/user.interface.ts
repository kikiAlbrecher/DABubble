export interface User {
    id?: string;
    name: string;
    email: string;
    password: string;
    status: boolean;
    channelIds: { [channelId: string]: true },
    picture: string,
    displayName?: string;
    displayNameLowercase?: string;
}