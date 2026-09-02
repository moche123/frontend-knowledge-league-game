export interface DisputeChatMessageDto {
  id: string;
  matchId: string;
  questionId: string | null;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface SendChatMessageDto {
  text: string;
  questionId?: string;
}
