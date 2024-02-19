export type BehaviorEventArea =
  | 'login'
  | 'list-diagrams'
  | 'insert-diagram'
  | 'sync-diagrams';
  
export type BehaviorEvent = {
  area: BehaviorEventArea;
  eventID: string;
  page?: string;
  provider?: string;
  diagramType?: string;
  emailAddress?: string;
  tier?: string;
  value?: string;
  // Stick with camelCase for consistency with Mixpanel
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  current_url?: string;
  current_path?: string;
  referrer?: string;
  referring_domain?: string;
};