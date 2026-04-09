"use client";

import { useCallback, useState } from "react";

type RequestMode = "keyword" | "today" | "week" | "us_stocks" | "kr_stocks";

type AnalyzeResponse = {
  meta: {
    mode: RequestMode;
    naverQuery: string;
    dateFilter: string;
    fetchedCount: number;
    usedCount: number;
  };
  articles: Array<{
    index: number;
    title: string;
    description: string;
    pubDate: string;
    link: string;
    originalLink: string;
    publishedAt: string;
  }>;
  analysis: {
    executiveSummary: string;
    keywords: Array<{
      term: string;
      importanceScore: number;
      rationale: string;
    }>;
    sentiment: {
      overallLabel: string;
      confidence: number;
      rationale: string;
    };
    categories: Array<{
      name: string;
      articleRefs: string[];
      summary: string;
    }>;
    trendInsights: string[];
  };
};

const MODE_LABEL: Record<RequestMode, string> = {
  keyword: "키워드",
  today: "오늘",
  week: "이번 주",
  us_stocks: "미국 주식",
  kr_stocks: "한국 주식",
};

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const run = useCallback(async (mode: RequestMode, kw?: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/news/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          ...(mode === "keyword" && kw !== undefined ? { keyword: kw } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string; detail?: string } | AnalyzeResponse;
      if (!res.ok) {
        const msg =
          "error" in data && data.error
            ? data.error + ("detail" in data && data.detail ? ` (${data.detail})` : "")
            : "요청에 실패했습니다.";
        setError(msg);
        return;
      }
      setResult(data as AnalyzeResponse);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const onKeywordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void run("keyword", keyword);
  };

  return (
    <div className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-4xl flex-col gap-1 px-4 py-6">
          <h1 className="text-2xl font-semibold tracking-tight">실시간 뉴스 요약</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            네이버 뉴스 검색과 AI로 요약·키워드·감정·분류·트렌드를 함께 봅니다.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={onKeywordSubmit} className="flex flex-col gap-4">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              검색 키워드
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 반도체, AI 규제…"
                className="min-h-11 flex-1 rounded-xl border border-zinc-300 bg-white px-4 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !keyword.trim()}
                className="h-11 shrink-0 rounded-xl bg-emerald-600 px-5 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                키워드 분석
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-zinc-100 pt-6 dark:border-zinc-800">
            <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              빠른 보기
            </p>
            <div className="flex flex-wrap gap-2">
              <PresetButton
                label="오늘 뉴스"
                sub="24시간 이내"
                loading={loading}
                onClick={() => void run("today")}
              />
              <PresetButton
                label="이번 주"
                sub="7일 이내"
                loading={loading}
                onClick={() => void run("week")}
              />
              <PresetButton
                label="미국 주식"
                sub="최근 시장"
                loading={loading}
                onClick={() => void run("us_stocks")}
              />
              <PresetButton
                label="한국 주식"
                sub="최근 시장"
                loading={loading}
                onClick={() => void run("kr_stocks")}
              />
            </div>
          </div>
        </section>

        {loading && (
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-6 py-8 text-center text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            뉴스를 불러오고 분석하는 중입니다…
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
            role="alert"
          >
            {error}
          </div>
        )}

        {result && !loading && (
          <div className="flex flex-col gap-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold">요약</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {result.analysis.executiveSummary}
              </p>
              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
                <div>
                  <dt className="inline font-medium text-zinc-600 dark:text-zinc-500">
                    모드{" "}
                  </dt>
                  <dd className="inline">{MODE_LABEL[result.meta.mode]}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-zinc-600 dark:text-zinc-500">
                    네이버 검색어{" "}
                  </dt>
                  <dd className="inline">{result.meta.naverQuery}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-zinc-600 dark:text-zinc-500">
                    기간 필터{" "}
                  </dt>
                  <dd className="inline">
                    {result.meta.dateFilter === "none"
                      ? "없음(최신순)"
                      : result.meta.dateFilter === "today"
                        ? "24시간"
                        : "7일"}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-medium text-zinc-600 dark:text-zinc-500">
                    분석 기사{" "}
                  </dt>
                  <dd className="inline">
                    {result.meta.usedCount}건 (수집 {result.meta.fetchedCount}건)
                  </dd>
                </div>
              </dl>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-lg font-semibold">키워드</h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  중요도 순 (모델 추정)
                </p>
                <ul className="mt-4 flex flex-col gap-3">
                  {[...result.analysis.keywords]
                    .sort((a, b) => b.importanceScore - a.importanceScore)
                    .map((k) => (
                      <li
                        key={k.term + k.importanceScore}
                        className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/50"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {k.term}
                          </span>
                          <span className="shrink-0 text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                            {k.importanceScore}/10
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {k.rationale}
                        </p>
                      </li>
                    ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-lg font-semibold">맥락 기반 감정</h2>
                <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                    {result.analysis.sentiment.overallLabel}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    신뢰도{" "}
                    {Math.round(result.analysis.sentiment.confidence * 100)}%
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {result.analysis.sentiment.rationale}
                  </p>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold">주제별 분류</h2>
              <div className="mt-4 flex flex-col gap-4">
                {result.analysis.categories.map((c) => (
                  <details
                    key={c.name}
                    className="group rounded-xl border border-zinc-100 bg-zinc-50/50 open:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:open:bg-zinc-900"
                  >
                    <summary className="cursor-pointer list-none px-4 py-3 font-medium text-zinc-900 marker:content-none dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-2">
                        {c.name}
                        <span className="text-xs font-normal text-zinc-500">
                          기사 #{c.articleRefs.join(", ")}
                        </span>
                      </span>
                    </summary>
                    <p className="border-t border-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                      {c.summary}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold">트렌드 인사이트</h2>
              <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                {result.analysis.trendInsights.map((t, i) => (
                  <li key={i} className="leading-relaxed">
                    {t}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold">출처</h2>
              <ul className="mt-4 flex max-h-80 flex-col gap-2 overflow-y-auto text-sm">
                {result.articles.map((a) => (
                  <li key={a.index} className="flex gap-2 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800">
                    <span className="w-6 shrink-0 tabular-nums text-zinc-400">
                      {a.index}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={a.originalLink || a.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                      >
                        {a.title}
                      </a>
                      <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {a.pubDate}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function PresetButton({
  label,
  sub,
  loading,
  onClick,
}: {
  label: string;
  sub: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex min-w-[8.5rem] flex-col rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm transition hover:border-emerald-300 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
    >
      <span className="font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{sub}</span>
    </button>
  );
}
