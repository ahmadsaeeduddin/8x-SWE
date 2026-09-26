import type { MeetingPreview } from "@/types/meeting";

export const meetings: MeetingPreview[] = [
  {
    id: "product-design-review",
    title: "Product design review",
    summary:
      "The team aligned on the new workspace navigation and narrowed the launch scope to three core workflows.",
    date: "Today",
    time: "10:00 AM",
    duration: "46 min",
    participantCount: 5,
    participants: [
      { name: "Maya Chen", initials: "MC", color: "bg-[#f18f62]" },
      { name: "Omar Haleem", initials: "OH", color: "bg-[#6b9bd2]" },
      { name: "Noah Williams", initials: "NW", color: "bg-[#9b7bd8]" },
    ],
    topics: ["Product", "Design"],
    actionItems: 4,
    highlights: 3,
    accent: "orange",
    waveform: [28, 45, 66, 38, 78, 52, 34, 72, 92, 48, 64, 36, 58, 84, 46, 70, 32, 56],
  },
  {
    id: "acme-onboarding-research",
    title: "Acme onboarding research",
    summary:
      "Customer feedback surfaced friction in team invites and a strong preference for guided first-run templates.",
    date: "Yesterday",
    time: "2:30 PM",
    duration: "38 min",
    participantCount: 4,
    participants: [
      { name: "Leila Khan", initials: "LK", color: "bg-[#58b8ba]" },
      { name: "Sam Foster", initials: "SF", color: "bg-[#cd7fae]" },
      { name: "Jon Bell", initials: "JB", color: "bg-[#738cce]" },
    ],
    topics: ["Research", "Customer"],
    actionItems: 3,
    highlights: 5,
    accent: "cyan",
    waveform: [48, 34, 60, 88, 44, 72, 38, 58, 80, 54, 32, 66, 42, 74, 50, 90, 62, 36],
  },
  {
    id: "q4-go-to-market-sync",
    title: "Q4 go-to-market sync",
    summary:
      "Marketing and sales agreed on the launch narrative, campaign milestones, and ownership for partner outreach.",
    date: "Sep 24",
    time: "9:15 AM",
    duration: "1 hr 14 min",
    participantCount: 7,
    participants: [
      { name: "Ava Brooks", initials: "AB", color: "bg-[#c98b55]" },
      { name: "Theo Martin", initials: "TM", color: "bg-[#7f81cd]" },
      { name: "Riya Shah", initials: "RS", color: "bg-[#6baf8e]" },
    ],
    topics: ["GTM", "Planning"],
    actionItems: 6,
    highlights: 4,
    accent: "violet",
    waveform: [34, 62, 42, 74, 52, 86, 46, 68, 38, 80, 58, 36, 72, 50, 92, 44, 64, 30],
  },
];
