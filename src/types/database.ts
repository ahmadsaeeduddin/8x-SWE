export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      meetings: {
        Row: {
          accent: "orange" | "cyan" | "violet" | null;
          created_at: string;
          duration_seconds: number;
          error_message: string | null;
          id: string;
          search_vector: unknown;
          short_summary: string | null;
          slug: string;
          source: "seeded" | "upload" | "transcript";
          starts_at: string;
          status: "uploaded" | "transcribing" | "analyzing" | "ready" | "failed";
          title: string;
          updated_at: string;
          visibility: "private" | "unlisted";
        };
        Insert: {
          accent?: "orange" | "cyan" | "violet" | null;
          created_at?: string;
          duration_seconds?: number;
          error_message?: string | null;
          id?: string;
          short_summary?: string | null;
          slug: string;
          source?: "seeded" | "upload" | "transcript";
          starts_at: string;
          status?: "uploaded" | "transcribing" | "analyzing" | "ready" | "failed";
          title: string;
          updated_at?: string;
          visibility?: "private" | "unlisted";
        };
        Update: {
          accent?: "orange" | "cyan" | "violet" | null;
          created_at?: string;
          duration_seconds?: number;
          error_message?: string | null;
          id?: string;
          short_summary?: string | null;
          slug?: string;
          source?: "seeded" | "upload" | "transcript";
          starts_at?: string;
          status?: "uploaded" | "transcribing" | "analyzing" | "ready" | "failed";
          title?: string;
          updated_at?: string;
          visibility?: "private" | "unlisted";
        };
        Relationships: [];
      };
      participants: {
        Row: {
          avatar_color: string | null;
          created_at: string;
          email: string | null;
          id: string;
          initials: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          avatar_color?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          initials: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          avatar_color?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          initials?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meeting_participants: {
        Row: {
          created_at: string;
          meeting_id: string;
          participant_id: string;
          role: string | null;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          meeting_id: string;
          participant_id: string;
          role?: string | null;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          meeting_id?: string;
          participant_id?: string;
          role?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_participants_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
        ];
      };
      recordings: {
        Row: {
          created_at: string;
          duration_seconds: number | null;
          file_size_bytes: number | null;
          id: string;
          is_primary: boolean;
          meeting_id: string;
          mime_type: string;
          storage_bucket: string;
          storage_path: string;
          updated_at: string;
          waveform: number[];
        };
        Insert: {
          created_at?: string;
          duration_seconds?: number | null;
          file_size_bytes?: number | null;
          id?: string;
          is_primary?: boolean;
          meeting_id: string;
          mime_type: string;
          storage_bucket?: string;
          storage_path: string;
          updated_at?: string;
          waveform?: number[];
        };
        Update: {
          created_at?: string;
          duration_seconds?: number | null;
          file_size_bytes?: number | null;
          id?: string;
          is_primary?: boolean;
          meeting_id?: string;
          mime_type?: string;
          storage_bucket?: string;
          storage_path?: string;
          updated_at?: string;
          waveform?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "recordings_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      transcript_segments: {
        Row: {
          created_at: string;
          end_seconds: number | null;
          id: string;
          meeting_id: string;
          search_vector: unknown;
          sort_order: number;
          speaker_name: string;
          speaker_participant_id: string | null;
          start_seconds: number;
          text: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_seconds?: number | null;
          id?: string;
          meeting_id: string;
          sort_order: number;
          speaker_name: string;
          speaker_participant_id?: string | null;
          start_seconds: number;
          text: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_seconds?: number | null;
          id?: string;
          meeting_id?: string;
          sort_order?: number;
          speaker_name?: string;
          speaker_participant_id?: string | null;
          start_seconds?: number;
          text?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transcript_segments_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transcript_segments_speaker_participant_id_fkey";
            columns: ["speaker_participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
        ];
      };
      summaries: {
        Row: {
          created_at: string;
          decisions: string[];
          key_takeaways: string[];
          meeting_id: string;
          purpose: string;
          topics: string[];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          decisions?: string[];
          key_takeaways?: string[];
          meeting_id: string;
          purpose: string;
          topics?: string[];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          decisions?: string[];
          key_takeaways?: string[];
          meeting_id?: string;
          purpose?: string;
          topics?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "summaries_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: true;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      action_items: {
        Row: {
          created_at: string;
          deadline: string | null;
          id: string;
          meeting_id: string;
          owner_name: string | null;
          owner_participant_id: string | null;
          sort_order: number;
          status: "open" | "completed";
          task: string;
          timestamp_seconds: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deadline?: string | null;
          id?: string;
          meeting_id: string;
          owner_name?: string | null;
          owner_participant_id?: string | null;
          sort_order?: number;
          status?: "open" | "completed";
          task: string;
          timestamp_seconds?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deadline?: string | null;
          id?: string;
          meeting_id?: string;
          owner_name?: string | null;
          owner_participant_id?: string | null;
          sort_order?: number;
          status?: "open" | "completed";
          task?: string;
          timestamp_seconds?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "action_items_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "action_items_owner_participant_id_fkey";
            columns: ["owner_participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
        ];
      };
      highlights: {
        Row: {
          created_at: string;
          detail: string;
          id: string;
          label: string | null;
          meeting_id: string;
          sort_order: number;
          timestamp_seconds: number | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          detail: string;
          id?: string;
          label?: string | null;
          meeting_id: string;
          sort_order?: number;
          timestamp_seconds?: number | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          detail?: string;
          id?: string;
          label?: string | null;
          meeting_id?: string;
          sort_order?: number;
          timestamp_seconds?: number | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "highlights_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_shares: {
        Row: {
          created_at: string;
          expires_at: string | null;
          id: string;
          meeting_id: string;
          revoked_at: string | null;
          token_hash: string;
          token_hint: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          meeting_id: string;
          revoked_at?: string | null;
          token_hash: string;
          token_hint?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          meeting_id?: string;
          revoked_at?: string | null;
          token_hash?: string;
          token_hint?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_shares_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_meeting_content: {
        Args: {
          result_limit?: number;
          search_query: string;
        };
        Returns: {
          meeting_id: string;
          meeting_starts_at: string;
          meeting_title: string;
          rank: number;
          result_type: string;
          snippet: string;
          speaker_name: string | null;
          start_seconds: number | null;
          transcript_segment_id: string | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type TableRow<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Row"];

export type TableInsert<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Insert"];

export type TableUpdate<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Update"];
