export enum ChatState {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  CHATTING = 'CHATTING',
  ERROR = 'ERROR',
}

export enum ChatMode {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}

export enum MessageSender {
  USER = 'USER',
  STRANGER = 'STRANGER',
  SYSTEM = 'SYSTEM',
}

export interface Message {
  id: string;
  text: string;
  sender: MessageSender;
  type?: string; // For audio/video message types
}
