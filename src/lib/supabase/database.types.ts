// Generated Supabase Database Types
// These types are derived from the database schema

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          is_anonymous: boolean;
          anonymous_session_id: string | null;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          is_anonymous?: boolean;
          anonymous_session_id?: string | null;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          is_anonymous?: boolean;
          anonymous_session_id?: string | null;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          role?: 'user' | 'assistant' | 'system';
          content?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          chat_id: string;
          filename: string;
          file_path: string;
          file_type: 'pdf' | 'docx' | 'txt';
          file_size: number | null;
          word_count: number | null;
          processed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          filename: string;
          file_path: string;
          file_type: 'pdf' | 'docx' | 'txt';
          file_size?: number | null;
          word_count?: number | null;
          processed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          filename?: string;
          file_path?: string;
          file_type?: 'pdf' | 'docx' | 'txt';
          file_size?: number | null;
          word_count?: number | null;
          processed?: boolean;
          created_at?: string;
        };
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          chunk_text: string;
          embedding: number[] | null;
          chunk_index: number;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          document_id: string;
          chunk_text: string;
          embedding?: number[] | null;
          chunk_index: number;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          document_id?: string;
          chunk_text?: string;
          embedding?: number[] | null;
          chunk_index?: number;
          metadata?: Record<string, unknown>;
        };
      };
      anonymous_sessions: {
        Row: {
          session_id: string;
          ip_hash: string;
          message_count: number;
          upgraded_to_user_id: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          session_id: string;
          ip_hash: string;
          message_count?: number;
          upgraded_to_user_id?: string | null;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          session_id?: string;
          ip_hash?: string;
          message_count?: number;
          upgraded_to_user_id?: string | null;
          created_at?: string;
          expires_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      check_usage_limit: {
        Args: { p_session_id: string };
        Returns: {
          allowed: boolean;
          message_count: number;
          upgrade_required: boolean;
        }[];
      };
      increment_anonymous_usage: {
        Args: { p_session_id: string };
        Returns: {
          success: boolean;
          new_count: number;
          upgrade_required: boolean;
        }[];
      };
    };
  };
}
