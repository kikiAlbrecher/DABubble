export class Channel {
    channelId: string;
    channelName: string;
    channelDescription: string;
    // channelMember: string;
    channelMessage: string;
    channelCreatorId: string;

    constructor(obj?: any) {
        this.channelId = obj ? obj.channelId : '';
        this.channelName = obj ? obj.channelName : '';
        this.channelDescription = obj ? obj.channelDescription : '';
        // this.channelMember = obj ? obj.channelMember : '';
        this.channelMessage = obj ? obj.channelMessage : '';
        this.channelCreatorId = obj ? obj.channelCreatorId : '';
    }
}