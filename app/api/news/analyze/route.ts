import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeNewsArticles } from "@/lib/analyze-news";
import {
  collectArticles,
  filterArticlesByRecency,
  NaverNewsError,
  type DateFilterMode,
} from "@/lib/naver-news";

const PRESET_QUERY = {
  today: "주요뉴스",
  week: "주요뉴스",
  us_stocks: "미국 주식",
  kr_stocks: "한국 주식",
} as const;

const MAX_FETCH = 100;
const MAX_AFTER_FILTER = 45;

const BodySchema = z
  .object({
    mode: z.enum(["keyword", "today", "week", "us_stocks", "kr_stocks"]),
    keyword: z.string().optional(),
  })
  .refine(
    (d) => d.mode !== "keyword" || (d.keyword?.trim().length ?? 0) > 0,
    { message: "키워드 모드에서는 검색어를 입력해 주세요.", path: ["keyword"] },
  );

function resolveQueryAndFilter(
  mode: z.infer<typeof BodySchema>["mode"],
  keyword: string | undefined,
): { query: string; dateFilter: DateFilterMode } {
  switch (mode) {
    case "keyword":
      return { query: keyword!.trim(), dateFilter: "none" };
    case "today":
      return { query: PRESET_QUERY.today, dateFilter: "today" };
    case "week":
      return { query: PRESET_QUERY.week, dateFilter: "week" };
    case "us_stocks":
      return { query: PRESET_QUERY.us_stocks, dateFilter: "week" };
    case "kr_stocks":
      return { query: PRESET_QUERY.kr_stocks, dateFilter: "week" };
  }
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 JSON 요청입니다." },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(" ");
    return NextResponse.json({ error: msg || "입력값을 확인해 주세요." }, { status: 400 });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const openaiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경 변수를 설정해 주세요." },
      { status: 500 },
    );
  }
  if (!openaiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY 환경 변수를 설정해 주세요." },
      { status: 500 },
    );
  }

  const { mode, keyword } = parsed.data;
  const { query, dateFilter } = resolveQueryAndFilter(mode, keyword);

  try {
    const pages = dateFilter === "today" ? 3 : 2;
    let articles = await collectArticles(query, clientId, clientSecret, {
      maxArticles: MAX_FETCH,
      maxPages: pages,
    });
    const beforeFilterCount = articles.length;
    articles = filterArticlesByRecency(articles, dateFilter);
    articles = articles.slice(0, MAX_AFTER_FILTER);

    const analysis = await analyzeNewsArticles(articles, openaiKey, model);

    return NextResponse.json({
      meta: {
        mode,
        naverQuery: query,
        dateFilter,
        fetchedCount: beforeFilterCount,
        usedCount: articles.length,
      },
      articles,
      analysis,
    });
  } catch (e) {
    if (e instanceof NaverNewsError) {
      return NextResponse.json(
        {
          error: "네이버 뉴스 API 호출에 실패했습니다.",
          detail: e.message,
          status: e.status,
        },
        { status: 502 },
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "분석 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
