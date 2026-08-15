# 출처·저작권·수집 정책

> 상태: 설계 승인  
> 기준일: 2026-08-15  
> 주의: 이 문서는 개발 정책이며 법률 자문이 아니다.

## 1. 기본 원칙

비영리·포트폴리오라는 사정만으로 복제, 크롤링, 데이터베이스화 또는 공개 재배포가
허용되지 않는다. 출처 표시는 이용허락을 대신하지 않는다. 다음 우선순위를 따른다.

1. 공식 API와 공공데이터
2. CC 등 오픈 라이선스 데이터
3. 공식 웹페이지를 사람이 확인한 사실과 원문 링크
4. 명시적 허가를 받은 편집·리뷰 데이터
5. 허용 범위가 검증된 수동 커뮤니티 링크

검증되지 않은 자동 크롤링, 리뷰 본문·사진 복제, 사용자명·프로필 수집, 별점
재구성은 우선순위가 아니라 금지 대상이다.

## 2. Source 상태

| 상태 | 의미 | 허용 동작 |
|---|---|---|
| APPROVED_OPEN | 오픈 라이선스/API 조건 확인 | 허용 필드 Import·게시, 표시 의무 준수 |
| CONDITIONAL | 키·승인·쿼터·용도 조건 존재 | 체크리스트 충족한 환경만 사용 |
| MANUAL_LINK_ONLY | 자동수집 근거 없음, 링크 검토만 허용 | 사람이 URL을 확인하고 독자 설명, 원문 저장 금지 |
| BLOCKED | 약관·권리·robots 또는 위험 때문에 사용 금지 | 수집·요약·점수화·Seed 반입 금지 |
| UNVERIFIED | 검토가 끝나지 않음 | BLOCKED와 동일하게 취급 |

robots.txt 허용은 법적·계약상 허가가 아니며, robots.txt 차단은 자동수집 중단
신호로 취급한다. 약관, API 정책, 라이선스와 권리자를 함께 검토한다.

## 3. 필드별 저장 정책

| 데이터 | 기본 정책 |
|---|---|
| 공식 명칭·주소·영업시간 | 허용 근거 확인 후 사실 필드로 저장 |
| 좌표 | 좌표 제공자의 라이선스와 파생 DB 조건 기록 |
| 공식 URL | 수동 확인 후 링크 가능, Deep link 조건 확인 |
| 독자 요약 | 여러 사실을 토대로 새로 작성, 원문 문체·배열 복제 금지 |
| 리뷰 본문·댓글 | 저장·Embedding·재게시 금지 |
| 사용자명·프로필·게시 이력 | 수집 금지 |
| 사진·Thumbnail | 자체 제작 또는 명시적 재사용 허가 없으면 금지 |
| 별점·리뷰 수 | API·라이선스가 명시적으로 허용할 때만 |
| 커뮤니티 URL | MANUAL_LINK_ONLY 승인과 정기 재검토 후 제한적 사용 |
| 검색 Snippet | 저장·게시 근거로 사용 금지 |

짧은 인용이 필요한 경우에도 목적상 필요한 최소 범위, 원저작물 시장 영향,
표시 방법을 별도 검토한다. MVP 기본값은 직접 인용 0문장이다.

## 4. 수집·검수·게시 흐름

~~~mermaid
flowchart TD
    Candidate["후보 Source 제안"] --> Register["Source Registry 등록"]
    Register --> CheckTerms["약관·robots·라이선스·API 정책 확인"]
    CheckTerms --> Decision{"이용 근거가 명확한가?"}
    Decision -->|아니오| Block["UNVERIFIED 또는 BLOCKED"]
    Decision -->|링크만 가능| Manual["MANUAL_LINK_ONLY"]
    Decision -->|조건부| Conditional["조건·쿼터·표시 의무 기록"]
    Decision -->|오픈| Import["허용 필드만 Import"]
    Manual --> Human["사람이 URL·관련성 확인"]
    Conditional --> Import
    Import --> Normalize["ACL 변환·원문 제거·독자 요약"]
    Human --> Normalize
    Normalize --> Validate["Schema·권리·날짜·출처 검증"]
    Validate --> PR["Catalog PR 검토"]
    PR -->|승인| Version["불변 CatalogVersion 생성"]
    PR -->|반려| Fix["수정 또는 폐기"]
    Version --> Publish["DynamoDB 게시 Projection"]
    Publish --> ReviewDue["기한 도래·삭제 요청·약관 변경 감시"]
    ReviewDue --> Register
~~~

## 5. Source 검토 체크리스트

- [ ] 제공자·권리자·공식 URL을 식별했다.
- [ ] 이용약관과 API/데이터 라이선스 URL을 기록했다.
- [ ] robots.txt와 기술적 접근 제한을 확인했다.
- [ ] 비영리 공개 재배포와 파생 데이터 허용 범위를 확인했다.
- [ ] 허용 필드, 금지 필드, 호출 쿼터와 캐시 기간을 기록했다.
- [ ] Attribution 문구와 화면 위치를 정했다.
- [ ] 확인일, 다음 검토일과 담당자를 기록했다.
- [ ] 삭제·정정 요청 연락 방법을 기록했다.
- [ ] 원문·사진·개인정보가 Seed와 Git 이력에 없는지 확인했다.

하나라도 답을 얻지 못하면 자동수집은 시작하지 않는다.

## 6. Evidence와 추천의 관계

- Tier A: 공식 기관, 공공데이터, 오픈 라이선스의 확인 가능한 사실
- Tier B: 재사용 허가를 받은 편집 데이터 또는 공식 운영자 정보
- Tier C: 허용된 수동 커뮤니티 원문 링크. 내용 복제 없이 참고 포인터만 제공

Place 게시에는 Tier A 또는 B가 필요하다. Tier C는 실사용 관점을 확인하는 보조
링크이며 영업시간, 안전성, 가격 또는 추천 순위를 단독으로 결정하지 않는다.
화면은 `공식 정보`와 `이용자 경험 참고 링크`를 섞지 않고 분리한다.

## 7. 변경·삭제·정정

삭제 요청 연락처는 공개 Source Policy 화면과 Repository에 표시한다. 요청을
받으면 72시간 이내에 다음 임시 조치를 목표로 한다.

1. 대상 Evidence를 REVIEW_REQUIRED로 바꾸고 새 게시에서 제외한다.
2. 긴급한 경우 Catalog Current pointer를 직전 안전 버전으로 되돌린다.
3. 권리·사실관계를 확인하고 수정, 삭제 또는 유지 결정을 기록한다.
4. Git 이력에 금지 원문이 들어간 경우 공개 배포를 즉시 중지하고 이력 정리 절차를
   별도 검토한다.

원본 사이트의 게시물이 삭제되거나 약관이 변경되면 링크를 RETIRED 처리한다.

## 8. 재검토 주기

- CONDITIONAL 및 MANUAL_LINK_ONLY: 최대 90일
- APPROVED_OPEN: 최대 180일 또는 라이선스 변경 공지 시 즉시
- 장소 영업시간·가격: 최대 90일, 여행 전 공식 확인 경고 상시 표시
- 약관·robots 변화 감시는 자동 Alert로 보조할 수 있으나 법적 판단은 사람이 한다.

## 9. 법적 참고 범위

한국 저작권법의 공정이용과 일본의 정보분석 예외는 구체적 사안별 요건이 있고,
공개 리뷰 데이터셋 재배포를 포괄적으로 허용한다고 전제하지 않는다.

- [대한민국 저작권법 관련 조문](https://law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1020155981)
- [일본 문화청 2018년 저작권법 개정 안내](https://www.bunka.go.jp/seisaku/chosakuken/hokaisei/h30_hokaisei/)

공개 범위가 커지거나 리뷰 분석을 도입하기 전에는 관할 법률 전문가 또는 각
제공자에게 서면 허가를 요청한다.

## 10. Source Governance Gate

| Gate | 차단 조건 | 통과 증거 |
|---|---|---|
| 등록 | SourceId·공식 URL·권리자 불명 | Source Registry PR |
| 이용조건 | 약관·License·API 정책·robots 검토 누락 | checkedAt·근거 URL |
| 필드 | allowed/forbidden field 불명 | SourceRecord schema |
| 게시 | Tier A/B, Claim, 확인일, 독자 요약 누락 | Evidence validation |
| 개인정보 | 사용자명·Profile·원문·사진 탐지 | CI forbidden scan |
| 만료 | reviewDueAt 초과·정책 변경 | REVIEW_REQUIRED 전환 |
| 삭제 | removalContact·임시 제외 절차 없음 | Correction Runbook |

정책 설계 판정은 PASS다. 개별 Source의 실제 반입은 Registry 상태와 PR 승인을
통과해야 하며, 사이트가 공개되어 있다는 사실만으로 승인하지 않는다.
