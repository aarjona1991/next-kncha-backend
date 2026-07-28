export type Sex = "male" | "female";
export type Sport = "futbol5" | "futbol7";
export type Audience = "mixed" | "men" | "women";
export type UserStatus = "active" | "banned";
export type EventVisibility = "private" | "public";
export type EventStatus =
  | "open"
  | "full"
  | "completed"
  | "cancelled"
  | "postponed";
export type MemberRole = "organizer" | "player";
export type JoinedVia = "invite" | "poll" | "organizer";
export type MemberStatus = "active" | "left" | "kicked";
export type JoinRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired";
export type VoteValue = "yes" | "no";
export type ConversationType = "event" | "group";
export type MessageType = "user" | "system";
export type ReportStatus = "pending" | "resolved" | "dismissed";
export type ReportTargetType = "user" | "event" | "message";

export const ROOKIE_SCORE = 1000;
export const ROOKIE_BADGE = "rookie";
export const MAX_ACTIVE_EVENTS_PER_ORGANIZER = 2;
export const POLL_CLOSE_HOURS_BEFORE = 3;

export const SPORT_CAPACITY: Record<Sport, number> = {
  futbol5: 10,
  futbol7: 14,
};

export const ACTIVE_EVENT_STATUSES: EventStatus[] = [
  "open",
  "full",
  "postponed",
];

export interface UserDoc {
  displayName: string;
  email: string;
  photoUrl: string | null;
  sex: Sex;
  birthDate: string; // YYYY-MM-DD
  sports: Sport[];
  zoneId: string;
  score: number;
  badges: string[];
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ZoneDoc {
  name: string;
  city: string;
  department: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventDoc {
  organizerId: string;
  sport: Sport;
  capacity: number;
  filledCount: number;
  visibility: EventVisibility;
  audience: Audience;
  zoneId: string;
  approxDate: string; // YYYY-MM-DD
  startsAt: string | null; // ISO
  venueText: string | null;
  status: EventStatus;
  inviteCode: string;
  pollOpen: boolean;
  conversationId: string;
  keepGroupYes: number;
  keepGroupNo: number;
  keepGroupClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemberDoc {
  role: MemberRole;
  joinedVia: JoinedVia;
  status: MemberStatus;
  joinedAt: string;
  displayName: string;
}

export interface JoinRequestDoc {
  userId: string;
  displayName: string;
  status: JoinRequestStatus;
  yesVotes: number;
  noVotes: number;
  createdAt: string;
  updatedAt: string;
}

export interface VoteDoc {
  value: VoteValue;
  createdAt: string;
}

export interface ConversationDoc {
  type: ConversationType;
  eventId: string | null;
  title: string;
  memberIds: string[];
  persisted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDoc {
  senderId: string | null;
  type: MessageType;
  body: string;
  createdAt: string;
}

export interface GroupDoc {
  conversationId: string;
  memberIds: string[];
  createdFromEventId: string;
  createdAt: string;
}

export interface NotificationDoc {
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface ReportDoc {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface KeepGroupVoteDoc {
  value: VoteValue;
  createdAt: string;
}
