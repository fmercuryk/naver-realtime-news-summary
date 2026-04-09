# 실시간 뉴스 요약

네이버 뉴스 검색 API로 기사를 모으고, OpenAI로 **요약·중요 키워드·맥락적 감정·주제 분류·트렌드 인사이트**를 한 번에 보여 주는 Next.js 앱입니다.

## 사전 준비

1. [네이버 developers](https://developers.naver.com/)에서 애플리케이션을 등록하고 **검색 API** 사용을 켠 뒤 `Client ID`, `Client Secret`을 발급합니다.
2. [OpenAI API 키](https://platform.openai.com/api-keys)를 준비합니다.
3. 프로젝트 루트에 `.env`를 만들고 [.env.example](.env.example)을 참고해 값을 채웁니다.

```bash
cp .env.example .env
```

## 실행

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 동작 요약

- **키워드**: 입력한 검색어로 뉴스를 최신순(`sort=date`)으로 가져옵니다. 네이버 API에 날짜 구간 파라미터가 없어 별도 날짜 필터는 적용하지 않습니다.
- **오늘 / 이번 주**: 고정 검색어로 넉넉히 수집한 뒤 `pubDate` 기준으로 각각 24시간·7일 이내만 남깁니다.
- **미국 주식 / 한국 주식**: 각각 `미국 주식`, `한국 주식`으로 검색하고 최근 7일로 필터합니다.

API 엔드포인트: `POST /api/news/analyze`  
Body 예: `{ "mode": "keyword", "keyword": "AI" }` 또는 `{ "mode": "today" }`.

## 배포

- **GitHub**: [fmercuryk/naver-realtime-news-summary](https://github.com/fmercuryk/naver-realtime-news-summary)
- **Vercel 프로덕션**: [naver-realtime-news-summary.vercel.app](https://naver-realtime-news-summary.vercel.app)

Vercel에서는 **Settings → Environment Variables**에 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `OPENAI_API_KEY`(선택: `OPENAI_MODEL`)를 설정합니다.

## 참고

- 네이버 검색 API 일일 호출 한도는 계정/앱 설정에 따릅니다.
- 분석은 기사 **제목·스니펫(description)·날짜**만 사용하며, 원문 전문은 가져오지 않습니다.

updated 2026.4.9.