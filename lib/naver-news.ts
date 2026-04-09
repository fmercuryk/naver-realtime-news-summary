const NAVER_NEWS_URL = "https://openapi.naver.com/v1/search/news.json";

export type NaverNewsApiItem = {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
};

export type CleanArticle = {
  index: number;
  title: string;
  description: string;
  pubDate: string;
  link: string;
  originalLink: string;
  publishedAt: string;
};

export class NaverNewsError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "NaverNewsError";
  }
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export function parseNaverPubDate(pubDate: string): Date | null {
  const d = new Date(pubDate);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type DateFilterMode = "none" | "today" | "week";

export function filterArticlesByRecency(
  articles: CleanArticle[],
  mode: DateFilterMode,
  now: Date = new Date(),
): CleanArticle[] {
  if (mode === "none") return articles;
  const ms =
    mode === "today" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const cutoff = now.getTime() - ms;
  return articles.filter((a) => {
    const t = new Date(a.publishedAt).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  });
}

function toCleanArticles(items: NaverNewsApiItem[]): Omit<CleanArticle, "index">[] {
  return items.map((item) => {
    const published = parseNaverPubDate(item.pubDate);
    return {
      title: stripHtml(item.title),
      description: stripHtml(item.description),
      pubDate: item.pubDate,
      link: item.link,
      originalLink: item.originallink,
      publishedAt: published?.toISOString() ?? item.pubDate,
    };
  });
}

function withIndices(articles: Omit<CleanArticle, "index">[]): CleanArticle[] {
  return articles.map((a, i) => ({ ...a, index: i + 1 }));
}

export async function fetchNaverNewsPage(
  query: string,
  clientId: string,
  clientSecret: string,
  start: number,
  display: number,
): Promise<NaverNewsApiItem[]> {
  const params = new URLSearchParams({
    query,
    display: String(display),
    start: String(start),
    sort: "date",
  });
  const res = await fetch(`${NAVER_NEWS_URL}?${params}`, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new NaverNewsError(res.status, text);
  }
  const data = (await res.json()) as { items?: NaverNewsApiItem[] };
  return data.items ?? [];
}

export async function collectArticles(
  query: string,
  clientId: string,
  clientSecret: string,
  options: { maxArticles: number; maxPages?: number },
): Promise<CleanArticle[]> {
  const maxPages = options.maxPages ?? 2;
  const raw: NaverNewsApiItem[] = [];
  for (let page = 0; page < maxPages && raw.length < options.maxArticles; page++) {
    const start = page * 100 + 1;
    const items = await fetchNaverNewsPage(
      query,
      clientId,
      clientSecret,
      start,
      100,
    );
    if (items.length === 0) break;
    raw.push(...items);
    if (items.length < 100) break;
  }
  return withIndices(toCleanArticles(raw).slice(0, options.maxArticles));
}
