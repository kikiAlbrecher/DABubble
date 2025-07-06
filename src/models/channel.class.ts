export class Channel {
    channelId: string;
    channelName: string;
    channelDescription: string;
    channelCreatorId: string;

    constructor(obj?: any) {
        this.channelId = obj ? obj.channelId : '';
        this.channelName = obj ? obj.channelName : '';
        this.channelDescription = obj ? obj.channelDescription : '';
        this.channelCreatorId = obj ? obj.channelCreatorId : '';
    }
}