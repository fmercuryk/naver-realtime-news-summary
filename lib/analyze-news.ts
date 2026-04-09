import OpenAI from "openai";
import { z } from "zod";
import type { CleanArticle } from "@/lib/naver-news";

export const NewsAnalysisSchema = z.object({
  executiveSummary: z.string(),
  keywords: z.array(
    z.object({
      term: z.string(),
      importanceScore: z.number().int().min(1).max(10),
      rationale: z.string(),
    }),
  ),
  sentiment: z.object({
    overallLabel: z.string(),
    confidence: z.number().min(0).max(1),
    rationale: z.string(),
  }),
  categories: z.array(
    z.object({
      name: z.string(),
      articleRefs: z.array(z.string()),
      summary: z.string(),
    }),
  ),
  trendInsights: z.array(z.string()),
});

export type NewsAnalysis = z.infer<typeof NewsAnalysisSchema>;

/** OpenAI Structured Outputs schema (strict; mirrors NewsAnalysis) */
const ANALYSIS_JSON_SCHEMA = {
  name: "news_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "executiveSummary",
      "keywords",
      "sentiment",
      "categories",
      "trendInsights",
    ],
    properties: {
      executiveSummary: { type: "string" },
      keywords: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["term", "importanceScore", "rationale"],
          properties: {
            term: { type: "string" },
            importanceScore: { type: "integer", minimum: 1, maximum: 10 },
            rationale: { type: "string" },
          },
        },
      },
      sentiment: {
        type: "object",
        additionalProperties: false,
        required: ["overallLabel", "confidence", "rationale"],
        properties: {
          overallLabel: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          rationale: { type: "string" },
        },
      },
      categories: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "articleRefs", "summary"],
          properties: {
            name: { type: "string" },
            articleRefs: {
              type: "array",
              items: { type: "string" },
            },
            summary: { type: "string" },
          },
        },
      },
      trendInsights: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
} as const;

function formatArticlesForPrompt(articles: CleanArticle[]): string {
  return articles
    .map(
      (a) =>
        `[${a.index}] ${a.pubDate}\n제목: ${a.title}\n요약: ${a.description}`,
    )
    .join("\n\n");
}

export async function analyzeNewsArticles(
  articles: CleanArticle[],
  apiKey: string,
  model: string,
): Promise<NewsAnalysis> {
  if (articles.length === 0) {
    return {
      executiveSummary: "분석할 뉴스 기사가 없습니다.",
      keywords: [],
      sentiment: {
        overallLabel: "중립",
        confidence: 0,
        rationale: "기사가 없어 판단할 수 없습니다.",
      },
      categories: [],
      trendInsights: [],
    };
  }

  const client = new OpenAI({ apiKey });
  const system =
    "당신은 한국어 뉴스 분석가입니다. 제공된 뉴스 스니펫(제목·요약·날짜)만 근거로 요약·키워드·맥락적 감정·주제 분류·트렌드 인사이트를 작성합니다. articleRefs에는 해당 기사 번호만 문자열로 넣습니다(예: \"1\", \"3\"). 확실하지 않은 내용은 추측하지 마세요.";

  const user = `다음 뉴스들을 분석해 주세요.\n\n${formatArticlesForPrompt(articles)}`;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: ANALYSIS_JSON_SCHEMA,
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI 응답이 비어 있습니다.");
  }

  const parsed = JSON.parse(raw) as unknown;
  return NewsAnalysisSchema.parse(parsed);
}
