import { Timestamp } from 'firebase/firestore';

export interface ChatMessage {
  text: string;
  timeStamp: Date;
  user: string;
  id: string;
  channelId?: string;
}