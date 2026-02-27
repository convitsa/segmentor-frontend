export type ConditionType =
  | "always"
  | "utm"
  | "device"
  | "language"
  | "newReturning"
  | "url"
  | "referrer"
  | "geo"
  | "time";

export type Comparator = "equals" | "contains" | "startsWith" | "endsWith" | "greaterThan" | "lessThan" | "between";

export interface Condition {
  id: string;
  type: ConditionType;
  key?: string;
  comparator?: Comparator;
  value?: string;
}

export type Field =
  | "text"
  | "visible"
  | "href"
  | "src"
  | "className"
  | "style"
  | "attribute";

export interface VariantMutation {
  field: Field;
  value: string;
  attributeName?: string;
}

export interface VariantDTO {
  id: string;
  name: string;
  mutations: VariantMutation[];
}

export interface Split {
  variantId: string;
  weight: number;
}

export interface RuleDTO {
  id: string;
  description?: string;
  conditions: Condition[];
  logic: "AND" | "OR";
  variantId: string;
  priority: number;
  enabled: boolean;
  startDate?: string;
  endDate?: string;
  splits?: Split[];
  audienceId?: string;
}

export interface ElementConfigDTO {
  id: string;
  label: string;
  selector: string;
  variants: VariantDTO[];
  rules: RuleDTO[];
}

export interface ProjectConfigDTO {
  id: string;
  siteUrl: string;
  elements: ElementConfigDTO[];
}

export interface AudienceDTO {
  id: string;
  name: string;
  conditions: Condition[];
  logic: "AND" | "OR";
}

export interface UserDTO {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface ProjectDTO {
  id: string;
  name: string;
  siteUrl: string;
  publicKey: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: UserDTO;
  token: string;
}

// ─── Visitor Journey Types ──────────────────────────────────────────

export interface VisitorDTO {
  id: string;
  projectId: string;
  visitorId: string;
  country?: string | null;
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
  language?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  firstReferrer?: string | null;
  firstUtmSource?: string | null;
  firstUtmMedium?: string | null;
  firstUtmCampaign?: string | null;
  totalSessions: number;
  totalPageviews: number;
  totalEvents: number;
  email?: string | null;
  polarCustomerId?: string | null;
  totalRevenue: number;
  tags: string[];
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface SessionDTO {
  id: string;
  projectId: string;
  visitorId: string;
  sessionId: string;
  entryPage?: string | null;
  exitPage?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  countryCode?: string | null;
  pageviews: number;
  events: number;
  duration: number;
  startedAt: string;
  endedAt: string;
}

export interface PageViewDTO {
  id: string;
  url: string;
  title?: string | null;
  duration?: number | null;
  scrollDepth?: number | null;
  sessionId: string;
  timestamp: string;
}

export interface TimelineEntry {
  kind: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface CustomerEventDTO {
  id: string;
  type: string;
  amount?: number | null;
  currency?: string | null;
  productName?: string | null;
  customerEmail?: string | null;
  externalId?: string | null;
  provider: string;
  timestamp: string;
}

export interface IntegrationDTO {
  id: string;
  type: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationDTO {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
