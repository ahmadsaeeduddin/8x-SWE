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
