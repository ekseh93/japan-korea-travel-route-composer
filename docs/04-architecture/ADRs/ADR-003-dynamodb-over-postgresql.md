# ADR-003: DynamoDB를 MVP 저장소로 선택

- 상태: 승인
- 일자: 2026-08-15

## 맥락

MVP 데이터는 도쿄·서울의 검수된 소규모 Place Projection과 요청 해시 기반 일정
캐시다. 관리자 임의 질의나 사용자 계정 트랜잭션은 없다.

## 비교

| 관점 | DynamoDB | PostgreSQL/RDS |
|---|---|---|
| 비용 | 요청 또는 용량 기반, 서버 없음 | 인스턴스·스토리지 고정비 |
| 쿼리 | 접근 패턴 선설계 필요 | 관계·임의 질의 강함 |
| DDD | Aggregate Projection과 키 조회에 적합 | 관계형 불변조건·분석에 적합 |
| 운영 | 패치·백업 서버 관리 없음 | 연결, 마이그레이션, 가용성 관리 |
| 로컬 개발 | Adapter/Fake 필요 | 로컬 DB가 직관적 |

## 결정

Catalog와 Itinerary Cache를 분리한 DynamoDB 테이블을 사용한다. 카탈로그 원본은
Git에서 검수하고 DynamoDB에는 게시 Projection만 넣는다. 런타임 접근 패턴은
City + CatalogVersion 조회와 requestHash 조회로 제한한다.

Capacity Mode는 배포 계정의 Free Tier 자격과 예상 트래픽을 확인해 Terraform
변수로 결정한다. 기본 설계값은 유휴 요청 비용이 없는 On-Demand이며 API
throttling과 Lambda reserved concurrency로 최대 소비 속도를 제한한다. 이는
0원이나 총액 하드 캡을 보장하지 않는다.

## 결과

복잡한 장소 관계, 운영자 검색과 대규모 분석에는 부적합하다. 사용자 저장 일정,
다중 편집자 CMS 또는 복잡한 지리 질의가 생기면 PostgreSQL/PostGIS를 새 ADR로
재평가한다. 지금은 포트폴리오를 위한 불필요한 RDS 고정비를 지지 않는다.
