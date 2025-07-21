import { ChatMessage } from "../app/main-content/message.model";
import { User } from "../app/userManagement/user.interface";
import { Channel } from "./channel.class";

export interface SearchResult {
  message: ChatMessage;
  channel?: Channel;
  user?: User;
  path: string;
}