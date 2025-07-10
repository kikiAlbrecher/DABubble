export class Channel {
    channelId: string = '';
    channelName: string = '';
    channelDescription: string = '';
    channelCreatorId: string = '';

    constructor(obj?: any) {
        this.channelId = obj?.channelId ?? '';
        this.channelName = obj?.channelName ?? '';
        this.channelDescription = typeof obj?.channelDescription === 'string' ? obj.channelDescription : '';
        this.channelCreatorId = obj?.channelCreatorId ?? '';
    }
}