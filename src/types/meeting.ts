export type MeetingAccent = "orange" | "cyan" | "violet";

export type MeetingParticipant = {
  name: string;
  initials: string;
  color: string;
};

export type MeetingPreview = {
  id: string;
  title: string;
  summary: string;
  date: string;
  time: string;
  duration: string;
  participantCount: number;
  participants: MeetingParticipant[];
  topics: string[];
  actionItems: number;
  highlights: number;
  accent: MeetingAccent;
  waveform: number[];
};

export type DashboardStats = {
  meetingCount: number;
  totalDurationSeconds: number;
  insightCount: number;
  actionItemCount: number;
  readyCount: number;
};

export type MeetingDetailParticipant = MeetingParticipant & {
  role: string;
};

export type MeetingActionItem = {
  id: string;
  task: string;
  owner: string;
  ownerInitials: string;
  ownerColor: string;
  deadline: string;
  timestamp: string;
  timestampSeconds: number;
  completed?: boolean;
};

export type MeetingHighlight = {
  id: string;
  label: string;
  title: string;
  detail: string;
  timestamp: string;
  timestampSeconds: number;
};

export type TranscriptSegment = {
  id: string;
  speaker: string;
  speakerInitials: string;
  speakerColor: string;
  timestamp: string;
  timestampSeconds: number;
  text: string;
};

export type MeetingDetail = {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  durationSeconds: number;
  participants: MeetingDetailParticipant[];
  waveform: number[];
  purpose: string;
  takeaways: string[];
  decisions: string[];
  actionItems: MeetingActionItem[];
  highlights: MeetingHighlight[];
  transcript: TranscriptSegment[];
  shareToken?: string;
};
