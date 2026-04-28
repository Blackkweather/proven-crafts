// Centralized mock data for Skill Network MVP.
// Realistic enough to make the product feel alive without a backend.

export type SkillLevel = "foundational" | "proficient" | "advanced" | "expert";

export interface Skill {
  name: string;
  level: SkillLevel;
}

export interface PortfolioItem {
  id: string;
  title: string;
  type: "project" | "video" | "writing" | "submission";
  summary: string;
  cover?: string;
  url?: string;
  tags: string[];
  year: number;
}

export interface TalentProfile {
  id: string;
  name: string;
  initials: string;
  headline: string;
  location: string;
  bio: string;
  skills: Skill[];
  portfolio: PortfolioItem[];
  completeness: number;
  availability: "open" | "exploring" | "booked";
}

export interface Company {
  id: string;
  name: string;
  initials: string;
  industry: string;
  size: string;
  about: string;
}

export interface Job {
  id: string;
  companyId: string;
  title: string;
  location: string;
  arrangement: "Remote" | "Hybrid" | "Onsite";
  comp: string;
  postedDays: number;
  requiredSkills: string[];
  summary: string;
  applicants: number;
}

export interface Challenge {
  id: string;
  companyId: string;
  title: string;
  brief: string;
  deadlineDays: number;
  requiredSkills: string[];
  submissions: number;
  prize?: string;
}

export interface Submission {
  id: string;
  challengeId: string;
  talentId: string;
  status: "draft" | "submitted" | "reviewed" | "shortlisted";
  submittedDays: number;
  matchScore: number;
}

export interface Application {
  id: string;
  jobId: string;
  talentId: string;
  matchScore: number;
  status: "new" | "reviewing" | "interview" | "offer" | "rejected";
  appliedDays: number;
}

export interface Conversation {
  id: string;
  withName: string;
  withRole: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  messages: { from: "me" | "them"; text: string; at: string }[];
}

export interface Notification {
  id: string;
  kind: "match" | "application" | "message" | "challenge";
  title: string;
  body: string;
  at: string;
  read: boolean;
}

export const currentTalent: TalentProfile = {
  id: "t-anya",
  name: "Anya Sharma",
  initials: "AS",
  headline: "Senior Frontend Engineer · Design Systems",
  location: "Berlin, DE",
  bio: "I build interfaces that feel inevitable. Last five years on design-system-driven product teams, shipping for fintech and developer tools.",
  availability: "exploring",
  completeness: 86,
  skills: [
    { name: "React", level: "expert" },
    { name: "TypeScript", level: "expert" },
    { name: "Design Systems", level: "expert" },
    { name: "GraphQL", level: "advanced" },
    { name: "Accessibility", level: "advanced" },
    { name: "Motion Design", level: "proficient" },
    { name: "Rust", level: "foundational" },
  ],
  portfolio: [
    {
      id: "p1",
      title: "Helix — a tokenized design system for Stripe-scale products",
      type: "project",
      summary: "Led the rewrite of a 400-component library used by 12 product teams. Cut bundle size by 38% and migration time by half.",
      tags: ["Design Systems", "React", "TypeScript"],
      year: 2024,
    },
    {
      id: "p2",
      title: "Realtime collaboration in <16ms",
      type: "writing",
      summary: "Engineering essay on CRDT trade-offs for multiplayer editing, picked up by Hacker News front page.",
      tags: ["CRDT", "Performance"],
      year: 2024,
    },
    {
      id: "p3",
      title: "Submission · Linear UI Challenge",
      type: "submission",
      summary: "Reimagined the project triage flow. Shortlisted in the top 5 of 312 entries.",
      tags: ["Product Design", "React"],
      year: 2023,
    },
  ],
};

export const companies: Company[] = [
  { id: "c-meridian", name: "Meridian Labs", initials: "ML", industry: "Developer Tools", size: "40–80", about: "We make the build pipeline disappear." },
  { id: "c-northwind", name: "Northwind Capital", initials: "NW", industry: "Fintech", size: "120–200", about: "Quant-driven investing, human-driven design." },
  { id: "c-orbital", name: "Orbital", initials: "OR", industry: "Geospatial AI", size: "20–40", about: "Earth observation for climate-critical decisions." },
  { id: "c-haus", name: "Haus & Cohort", initials: "HC", industry: "Healthcare", size: "200+", about: "Care coordination platform used by 1,400 clinics." },
];

export const jobs: Job[] = [
  {
    id: "j1", companyId: "c-meridian",
    title: "Staff Frontend Engineer, Design Systems",
    location: "Remote (EU)", arrangement: "Remote", comp: "€110–140k",
    postedDays: 2, applicants: 48,
    requiredSkills: ["React", "TypeScript", "Design Systems", "Accessibility"],
    summary: "Own the next generation of our component library. You'll set the standard 12 product teams build on.",
  },
  {
    id: "j2", companyId: "c-orbital",
    title: "Frontend Engineer, Visualization",
    location: "Berlin", arrangement: "Hybrid", comp: "€90–120k",
    postedDays: 5, applicants: 31,
    requiredSkills: ["React", "TypeScript", "WebGL", "Motion Design"],
    summary: "Bring satellite-scale data to life. Working closely with our cartography lead.",
  },
  {
    id: "j3", companyId: "c-northwind",
    title: "Senior Product Engineer",
    location: "London", arrangement: "Onsite", comp: "£95–130k",
    postedDays: 9, applicants: 67,
    requiredSkills: ["React", "TypeScript", "GraphQL", "Performance"],
    summary: "Build trading interfaces where milliseconds and microcopy matter equally.",
  },
  {
    id: "j4", companyId: "c-haus",
    title: "Frontend Engineer, Care Tools",
    location: "Remote (Global)", arrangement: "Remote", comp: "$120–155k",
    postedDays: 12, applicants: 92,
    requiredSkills: ["React", "Accessibility", "TypeScript", "Testing"],
    summary: "Help clinicians spend less time in software and more time with patients.",
  },
];

export const challenges: Challenge[] = [
  {
    id: "ch1", companyId: "c-meridian",
    title: "Reimagine the API key management flow",
    brief: "Design and build a single-page experience for issuing, scoping, and rotating API keys with zero-downtime UX.",
    deadlineDays: 9, submissions: 24, prize: "Fast-track interview + €1,500",
    requiredSkills: ["React", "Design Systems", "TypeScript"],
  },
  {
    id: "ch2", companyId: "c-orbital",
    title: "Render 50k satellite passes without dropping a frame",
    brief: "Given a JSON dataset of orbital paths, render an interactive globe at 60fps with smooth filtering.",
    deadlineDays: 14, submissions: 11, prize: "Top 3 → on-site visit",
    requiredSkills: ["WebGL", "Performance", "TypeScript"],
  },
  {
    id: "ch3", companyId: "c-northwind",
    title: "A trading blotter that respects attention",
    brief: "Build a dense, keyboard-first table for live trade execution. Bonus: undo at the row level.",
    deadlineDays: 5, submissions: 38,
    requiredSkills: ["React", "Performance", "Accessibility"],
  },
];

export const candidates: TalentProfile[] = [
  currentTalent,
  {
    id: "t-jonas", name: "Jonas Devries", initials: "JD",
    headline: "Senior Backend Engineer · Distributed Systems", location: "Amsterdam",
    bio: "Distributed systems and cloud-native architecture. Currently obsessed with deterministic builds.",
    availability: "open", completeness: 92,
    skills: [
      { name: "Go", level: "expert" }, { name: "Kubernetes", level: "expert" },
      { name: "TypeScript", level: "advanced" }, { name: "Performance", level: "advanced" },
    ],
    portfolio: [],
  },
  {
    id: "t-mira", name: "Mira Okafor", initials: "MO",
    headline: "Product Engineer · Design-engineering", location: "Lagos",
    bio: "Working at the seam between design and engineering. Half my PRs are Figma comments.",
    availability: "exploring", completeness: 78,
    skills: [
      { name: "React", level: "expert" }, { name: "Design Systems", level: "advanced" },
      { name: "Motion Design", level: "advanced" }, { name: "TypeScript", level: "advanced" },
    ],
    portfolio: [],
  },
  {
    id: "t-rafa", name: "Rafael Costa", initials: "RC",
    headline: "Frontend Engineer · 3D & Visualization", location: "Lisbon",
    bio: "WebGL and Three.js for serious data, not just pretty demos.",
    availability: "open", completeness: 71,
    skills: [
      { name: "WebGL", level: "expert" }, { name: "TypeScript", level: "advanced" },
      { name: "React", level: "advanced" }, { name: "Performance", level: "advanced" },
    ],
    portfolio: [],
  },
  {
    id: "t-yuki", name: "Yuki Tanaka", initials: "YT",
    headline: "Senior Engineer · Accessibility & UX", location: "Tokyo",
    bio: "Accessibility isn't a checklist. I help teams ship interfaces that work for everyone, including their future selves.",
    availability: "booked", completeness: 88,
    skills: [
      { name: "Accessibility", level: "expert" }, { name: "React", level: "expert" },
      { name: "TypeScript", level: "advanced" }, { name: "Testing", level: "advanced" },
    ],
    portfolio: [],
  },
];

export const applications: Application[] = [
  { id: "a1", jobId: "j1", talentId: "t-anya", matchScore: 94, status: "interview", appliedDays: 3 },
  { id: "a2", jobId: "j1", talentId: "t-mira", matchScore: 81, status: "reviewing", appliedDays: 4 },
  { id: "a3", jobId: "j1", talentId: "t-yuki", matchScore: 88, status: "new", appliedDays: 1 },
  { id: "a4", jobId: "j2", talentId: "t-rafa", matchScore: 92, status: "interview", appliedDays: 6 },
  { id: "a5", jobId: "j2", talentId: "t-anya", matchScore: 74, status: "reviewing", appliedDays: 2 },
  { id: "a6", jobId: "j3", talentId: "t-jonas", matchScore: 79, status: "new", appliedDays: 1 },
];

export const submissions: Submission[] = [
  { id: "s1", challengeId: "ch1", talentId: "t-anya", matchScore: 96, submittedDays: 1, status: "shortlisted" },
  { id: "s2", challengeId: "ch1", talentId: "t-mira", matchScore: 84, submittedDays: 2, status: "submitted" },
  { id: "s3", challengeId: "ch2", talentId: "t-rafa", matchScore: 95, submittedDays: 3, status: "reviewed" },
  { id: "s4", challengeId: "ch3", talentId: "t-yuki", matchScore: 90, submittedDays: 1, status: "submitted" },
];

export const conversations: Conversation[] = [
  {
    id: "cv1", withName: "Lena Park", withRole: "Talent Lead, Meridian Labs",
    lastMessage: "Loved your Helix write-up. Free Thursday for a 30?",
    lastAt: "2h", unread: 1,
    messages: [
      { from: "them", text: "Hey Anya — saw your application for the Staff role.", at: "Wed 14:02" },
      { from: "them", text: "Loved your Helix write-up. Free Thursday for a 30?", at: "Wed 14:03" },
      { from: "me", text: "Thanks Lena — Thursday 4pm CET works great.", at: "Wed 14:18" },
    ],
  },
  {
    id: "cv2", withName: "Daniel Roth", withRole: "Engineering Manager, Orbital",
    lastMessage: "Your submission cleared review — sending next steps.",
    lastAt: "1d", unread: 0,
    messages: [
      { from: "them", text: "Your submission cleared review — sending next steps.", at: "Tue 09:11" },
    ],
  },
  {
    id: "cv3", withName: "Priya Iyer", withRole: "Talent Partner, Northwind",
    lastMessage: "Quick question about your availability in Q2.",
    lastAt: "3d", unread: 0,
    messages: [
      { from: "them", text: "Quick question about your availability in Q2.", at: "Mon 11:45" },
    ],
  },
];

export const notifications: Notification[] = [
  { id: "n1", kind: "match", title: "94% match", body: "Staff Frontend Engineer, Design Systems · Meridian Labs", at: "2h", read: false },
  { id: "n2", kind: "message", title: "Lena Park sent a message", body: "Loved your Helix write-up…", at: "2h", read: false },
  { id: "n3", kind: "application", title: "Interview scheduled", body: "Meridian Labs · Thursday 4pm CET", at: "1d", read: true },
  { id: "n4", kind: "challenge", title: "Submission shortlisted", body: "Reimagine the API key management flow", at: "1d", read: true },
  { id: "n5", kind: "match", title: "New challenge matches your skills", body: "A trading blotter that respects attention", at: "3d", read: true },
];

// --- Helpers ---

export function matchScore(required: string[], owned: { name: string }[]) {
  if (!required.length) return 0;
  const set = new Set(owned.map((s) => s.name.toLowerCase()));
  const hit = required.filter((r) => set.has(r.toLowerCase())).length;
  return Math.round((hit / required.length) * 100);
}

export function getCompany(id: string) {
  return companies.find((c) => c.id === id)!;
}

export function getTalent(id: string) {
  return candidates.find((t) => t.id === id)!;
}

export function getJob(id: string) {
  return jobs.find((j) => j.id === id);
}

export const skillLevelMeta: Record<SkillLevel, { label: string; bars: number }> = {
  foundational: { label: "Foundational", bars: 1 },
  proficient: { label: "Proficient", bars: 2 },
  advanced: { label: "Advanced", bars: 3 },
  expert: { label: "Expert", bars: 4 },
};
