# ADR-001: TypeScript 단일 언어와 React/Vite

- 상태: 승인
- 일자: 2026-08-15

## 맥락

1인 포트폴리오가 웹 UI, API, Schema, 테스트와 인프라를 다뤄야 한다. MVP는
검색엔진 유입보다 조건 입력 후 대화형 일정 생성이 핵심이며 런타임 SSR이 필요
없다.

## 비교

| 선택지 | 장점 | 단점 |
|---|---|---|
| TypeScript + React/Vite | 단일 언어, 빠른 정적 빌드, AWS 정적 호스팅 단순 | SSR·서버 컴포넌트 없음 |
| TypeScript + Next.js | SEO·SSR·풀스택 생태계 | 정적 MVP에 배포·캐시 경계가 복잡 |
| Python API + TypeScript Web | 데이터 처리 라이브러리 풍부 | 타입·도메인 모델·도구가 두 언어로 분산 |
| Java/Spring + React | 기업 포트폴리오 신호와 강한 구조 | 작은 서버리스 MVP에 콜드 스타트·개발량 증가 |

## 결정

pnpm workspace의 TypeScript 모노레포를 쓰고 Web은 React/Vite 정적 SPA,
API는 Node.js Lambda handler로 구현한다. 공유 패키지는 DTO Schema와 도메인
용어만 포함하며 Web이 Domain 내부 객체에 의존하지 않게 한다.

## 결과

빌드·테스트·온보딩은 단순해진다. 공개 설명 페이지의 SEO가 핵심 성장 경로가
되면 정적 사전 렌더링 또는 별도 콘텐츠 빌드를 먼저 검토하고, 그 필요가 입증될
때 Next.js 전환 ADR을 작성한다.
