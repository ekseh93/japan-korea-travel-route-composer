# ADR-005: 검수된 이동 행렬과 장애 축소형 지도

- 상태: 승인
- 일자: 2026-08-15

## 맥락

대중교통 길찾기는 정확한 제공자일수록 키, 결제, 쿼터와 약관 제약이 있다. 반면
MVP는 비용 없이 공개할 수 있어야 하고 이동시간을 확정 사실로 오인시키면 안 된다.

## 비교

| 선택지 | 정확도 | 비용·제약 | 결정 |
|---|---|---|---|
| 검수된 Zone 행렬 + Haversine | 중간 | 자체 유지, 실시간 아님 | 기본 |
| Kakao Mobility/Map API | 서울 상세 경로 가능 | 앱·쿼터·약관 확인 필요 | 선택 Adapter |
| Google Routes | 광범위한 경로·Transit | Billing 필수, 요소별 과금 | 기본 비활성 |
| OpenFreeMap + MapLibre | 시각 지도 | Public instance SLA 없음 | 표시 전용 |

## 결정

일정 편성은 도시별 Zone 간 검수 이동시간 행렬, 인접 장소 Haversine 보행 추정,
장소별 체류시간을 사용한다. 결과는 예상 시간과 confidence를 함께 표시한다.
MapLibre와 OpenFreeMap은 시각화에만 쓰고 실패 시 텍스트 일정이 남는다. 외부
경로 Provider는 동일 Port의 기능 플래그 Adapter다.

## 결과

실시간 지연과 정확한 환승을 반영하지 못한다. 사용자는 각 이동 구간의 공식 지도
검색 링크로 출발 전에 재확인해야 한다. 제공자 사용 승인을 받기 전에는 정확한
실시간 길찾기라는 표현을 금지한다.

근거:

- [OpenStreetMap 저작권과 라이선스](https://www.openstreetmap.org/copyright)
- [OpenFreeMap](https://openfreemap.org/)
- [OpenFreeMap Terms](https://openfreemap.org/tos/)
- [Kakao Maps REST API](https://developers.kakao.com/docs/ko/kakaomap/rest-api)
- [Google Routes 사용량과 과금](https://developers.google.com/maps/documentation/routes/usage-and-billing)
- [Google Transit Routes](https://developers.google.com/maps/documentation/routes/transit-route)
