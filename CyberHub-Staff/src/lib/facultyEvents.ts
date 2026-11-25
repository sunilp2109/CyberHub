export type EventMode = "attended" | "conducted";

export type FacultyEvent = {
  id: string;
  eventDate: string;
  name: string;
  category: string;
  facultyRole: string;
  mode: EventMode;
  certificate?: { fileName: string } | null;
  details?: {
    organizer?: string;
    department?: string;
    venue?: string;
    format?: "offline" | "online" | "hybrid";
    startTime?: string;
    endTime?: string;
    description?: string;
    objectives?: string;
    keyTopics?: string;
    eventOutcome?: string;
    chiefGuest?: string;
    numParticipants?: string;
    targetAudience?: string;
    coordinators?: string;
    participationType?: string;
    organizingResponsibility?: string;
    sdgs?: number[];
    focusAreas?: string[];
  } | null;
};

export const SDG_LIST = [
  { n: 1, name: "No Poverty" },
  { n: 2, name: "Zero Hunger" },
  { n: 3, name: "Good Health" },
  { n: 4, name: "Quality Education" },
  { n: 5, name: "Gender Equality" },
  { n: 6, name: "Clean Water" },
  { n: 7, name: "Affordable Energy" },
  { n: 8, name: "Decent Work" },
  { n: 9, name: "Industry & Innovation" },
  { n: 10, name: "Reduced Inequalities" },
  { n: 11, name: "Sustainable Cities" },
  { n: 12, name: "Responsible Consumption" },
  { n: 13, name: "Climate Action" },
  { n: 14, name: "Life Below Water" },
  { n: 15, name: "Life on Land" },
  { n: 16, name: "Peace & Justice" },
  { n: 17, name: "Partnerships" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const eventsUrl = `${API_URL}/api/v1/staff/events`;
export const eventDateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" });

export function eventCertificateUrl(id: string) {
  return `${eventsUrl}/${encodeURIComponent(id)}/certificate`;
}
