// Database types
export interface Profile {
  id: string;
  email: string | null;
  is_anonymous: boolean;
  anonymous_session_id: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Document {
  id: string;
  chat_id: string;
  filename: string;
  file_path: string;
  file_type: 'pdf' | 'docx' | 'txt';
  file_size?: number;
  word_count?: number;
  processed: boolean;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_text: string;
  embedding: number[];
  chunk_index: number;
  metadata: Record<string, unknown>;
}

export interface AnonymousSession {
  session_id: string;
  ip_hash: string;
  message_count: number;
  upgraded_to_user_id: string | null;
  created_at: string;
  expires_at: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface StreamChunk {
  content: string;
  done?: boolean;
}

export interface ChatWithMessages extends Chat {
  messages: Message[];
}

export interface RAGContext {
  chunks: { text: string; similarity: number }[];
  query: string;
}

// Auth types
export interface AnonymousSessionResponse {
  session_id: string;
  usage_count: number;
  upgrade_required: boolean;
}

export interface UpgradeRequest {
  session_id: string;
  email: string;
}

// Qwen API types
export interface QwenMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface QwenRequest {
  model: string;
  messages: QwenMessage[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface QwenStreamChoice {
  delta: {
    content?: string;
    role?: string;
  };
  finish_reason?: string | null;
}

export interface QwenStreamResponse {
  id: string;
  choices: QwenStreamChoice[];
  created: number;
  model: string;
}

// UI types
export interface ChatState {
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  upgradeRequired: boolean;
}

export interface FileUploadResult {
  document_id: string;
  filename: string;
  processed: boolean;
}
