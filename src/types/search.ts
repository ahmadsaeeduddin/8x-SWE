export type SearchResult = {
  id: string;
  kind: "meeting" | "transcript";
  title: string;
  detail: string;
  meta: string;
  href: string;
  speaker?: string;
  timestamp?: string;
};

export type SearchResponse = {
  results: SearchResult[];
};
