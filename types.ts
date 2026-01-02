
export enum Sender {
  User = 'user',
  Model = 'model'
}

export type ModelId = 'gemini-3-flash-preview' | 'gemini-3-pro-preview';

export interface Attachment {
  mimeType: string;
  data: string; // base64 string
  fileName?: string; // Add file name support
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: Date;
  isError?: boolean;
  attachment?: Attachment;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}
