import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useState, type FormEvent } from "react";

import {
  composeTripRequestSchema,
  composeTripResponseSchema,
  errorResponseSchema,
  type ComposeTripRequest,
  type ComposeTripResponse,
} from "@route-composer/contracts";

import { appName, implementationMilestone } from "./app";
import "./styles.css";

const defaultRequest: ComposeTripRequest = {
  cityId: "TOKYO" as const,
  startDate: "2026-10-10",
  nights: 1,
  arrivalTime: "10:00",
  departureTime: "18:00",
  locale: "ja" as const,
  companionType: "FRIEND" as const,
  themes: ["FOOD" as const],
  pace: "BALANCED" as const,
  mobilityLevel: "MEDIUM" as const,
  budgetBand: "STANDARD" as const,
  mustVisitPlaceIds: [],
  excludedPlaceIds: [],
  rainConsideration: true,
  freeText: null,
  diversitySeed: 0,
};

const themeOptions = [
  ["FOOD", "음식"],
  ["CULTURE_HISTORY", "문화·역사"],
  ["NATURE_PARK", "공원·자연"],
  ["SHOPPING", "쇼핑"],
] as const;

function App() {
  const [request, setRequest] = useState(defaultRequest);
  const [result, setResult] = useState<ComposeTripResponse | null>(null);
  const [message, setMessage] = useState("조건을 선택하고 동선을 조합하세요.");
  const [loading, setLoading] = useState(false);

  async function compose(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsed = composeTripRequestSchema.safeParse(request);
    if (!parsed.success) {
      setMessage("입력 조건을 확인하세요.");
      return;
    }
    setLoading(true);
    setMessage("동선을 계산하고 있습니다.");
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
      const response = await fetch(`${baseUrl}/v1/trips:compose`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const error = errorResponseSchema.safeParse(body);
        setMessage(
          error.success
            ? error.data.error.message
            : "조합에 실패했습니다. 잠시 후 다시 시도하세요.",
        );
        return;
      }
      const composed = composeTripResponseSchema.safeParse(body);
      if (!composed.success) {
        setMessage("서버 응답을 확인할 수 없습니다.");
        return;
      }
      setResult(composed.data);
      setMessage("제약 조건을 확인한 동선을 만들었습니다.");
    } catch {
      setMessage("API에 연결할 수 없습니다. 로컬 API 실행 상태를 확인하세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">TOKYO / SEOUL · SOURCE-LED ROUTES</p>
        <h1 id="page-title">{appName}</h1>
        <p className="lead">조건을 먼저 지키고, 장소는 그 다음에 고릅니다.</p>
        <p className="status">{implementationMilestone} · 결정론적 조합 · 출처 표시</p>
      </section>

      <section className="workspace" aria-label="여행 조건과 조합 결과">
        <form className="control-panel" onSubmit={compose}>
          <div className="section-heading">
            <p className="eyebrow">01 / INPUT</p>
            <h2>여행의 리듬</h2>
          </div>
          <label>
            도시
            <select
              value={request.cityId}
              onChange={(event) =>
                setRequest({ ...request, cityId: event.target.value as typeof request.cityId })
              }
            >
              <option value="TOKYO">도쿄</option>
              <option value="SEOUL">서울</option>
            </select>
          </label>
          <div className="split-fields">
            <label>
              숙박 수
              <input
                type="number"
                min="1"
                max="4"
                value={request.nights}
                onChange={(event) => setRequest({ ...request, nights: Number(event.target.value) })}
              />
            </label>
            <label>
              언어
              <select
                value={request.locale}
                onChange={(event) =>
                  setRequest({ ...request, locale: event.target.value as typeof request.locale })
                }
              >
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
          <div className="split-fields">
            <label>
              도착
              <input
                type="time"
                value={request.arrivalTime}
                onChange={(event) => setRequest({ ...request, arrivalTime: event.target.value })}
              />
            </label>
            <label>
              출발
              <input
                type="time"
                value={request.departureTime}
                onChange={(event) => setRequest({ ...request, departureTime: event.target.value })}
              />
            </label>
          </div>
          <label>
            여행 속도
            <select
              value={request.pace}
              onChange={(event) =>
                setRequest({ ...request, pace: event.target.value as typeof request.pace })
              }
            >
              <option value="SLOW">느긋하게</option>
              <option value="BALANCED">균형 있게</option>
              <option value="FAST">많이 보기</option>
            </select>
          </label>
          <label>
            동행
            <select
              value={request.companionType}
              onChange={(event) =>
                setRequest({
                  ...request,
                  companionType: event.target.value as typeof request.companionType,
                })
              }
            >
              <option value="SOLO">혼자</option>
              <option value="FRIEND">친구</option>
              <option value="COUPLE">연인</option>
              <option value="FAMILY">가족</option>
            </select>
          </label>
          <fieldset>
            <legend>관심사</legend>
            <div className="check-grid">
              {themeOptions.map(([value, label]) => (
                <label className="check-row" key={value}>
                  <input
                    type="checkbox"
                    checked={request.themes.includes(value)}
                    onChange={(event) =>
                      setRequest({
                        ...request,
                        themes: event.target.checked
                          ? [...request.themes, value]
                          : request.themes.filter((theme) => theme !== value),
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="split-fields">
            <label>
              예산
              <select
                value={request.budgetBand}
                onChange={(event) =>
                  setRequest({
                    ...request,
                    budgetBand: event.target.value as typeof request.budgetBand,
                  })
                }
              >
                <option value="SAVER">절약형</option>
                <option value="STANDARD">표준형</option>
                <option value="FLEXIBLE">여유 있게</option>
              </select>
            </label>
            <label>
              보행량
              <select
                value={request.mobilityLevel}
                onChange={(event) =>
                  setRequest({
                    ...request,
                    mobilityLevel: event.target.value as typeof request.mobilityLevel,
                  })
                }
              >
                <option value="LOW">적게</option>
                <option value="MEDIUM">보통</option>
                <option value="HIGH">많이</option>
              </select>
            </label>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={request.rainConsideration}
              onChange={(event) =>
                setRequest({ ...request, rainConsideration: event.target.checked })
              }
            />
            우천 대체 후보 포함
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "계산 중..." : "동선 조합하기"}
          </button>
          <p className="form-message" role="status">
            {message}
          </p>
        </form>

        <section className="result-panel" aria-live="polite" aria-labelledby="result-title">
          <div className="section-heading">
            <p className="eyebrow">02 / OUTPUT</p>
            <h2 id="result-title">검증 가능한 하루</h2>
          </div>
          {result === null ? (
            <div className="empty-state">
              <strong>아직 조합된 일정이 없습니다.</strong>
              <span>API가 연결되면 장소, 이동시간, 근거를 이곳에 표시합니다.</span>
            </div>
          ) : (
            <div className="day-list">
              {result.dayPlans.map((day) => (
                <article className="day-card" key={day.dayIndex}>
                  <div className="day-heading">
                    <span>DAY {day.dayIndex}</span>
                    <time dateTime={day.date}>{day.date}</time>
                  </div>
                  <h3>{day.title}</h3>
                  {day.items.map((item) =>
                    item.type === "VISIT" ? (
                      <div className="timeline-item visit" key={item.visitId}>
                        <time>{item.startTime}</time>
                        <div>
                          <strong>{item.displayName}</strong>
                          <span>
                            {item.category} · {item.durationMinutes}분
                          </span>
                          <div className="evidence-links">
                            {item.evidence.map((evidence) => (
                              <a
                                key={evidence.evidenceId}
                                href={evidence.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {evidence.providerName} 출처
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : item.type === "TRAVEL" ? (
                      <div className="timeline-item travel" key={item.segmentId}>
                        <time>{item.startTime}</time>
                        <span>
                          이동 · 약 {item.durationMinutes}분 · {item.confidence}
                        </span>
                      </div>
                    ) : (
                      <div className="timeline-item travel" key={item.breakId}>
                        <time>{item.startTime}</time>
                        <span>휴식 · {item.durationMinutes}분</span>
                      </div>
                    ),
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Web application root was not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
