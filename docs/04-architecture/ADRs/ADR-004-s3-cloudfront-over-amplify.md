# ADR-004: S3와 CloudFront를 정적 호스팅으로 선택

- 상태: 승인
- 일자: 2026-08-15

## 맥락

Vite 산출물을 HTTPS로 공개하고 모든 AWS 리소스와 정책을 Terraform으로 설명할
수 있어야 한다. GitHub Actions가 빌드와 배포를 통제한다.

## 비교

| 관점 | S3 + CloudFront OAC | Amplify Hosting |
|---|---|---|
| 추상화 | Bucket·CDN·정책을 직접 설계 | 빌드·브랜치 배포를 관리형으로 제공 |
| Terraform 학습 신호 | 네트워크·IAM·캐시가 명확 | 애플리케이션 연결은 간단 |
| CI/CD | GitHub Actions와 책임이 명확 | Amplify 빌드와 중복 가능 |
| 비용 | S3·CloudFront 사용량 | 빌드·호스팅·전송 사용량 |
| 보안 | OAC와 Bucket Policy 직접 검증 | 관리형 기본값 활용 |

## 결정

비공개 S3 Bucket과 CloudFront OAC를 사용하고 GitHub Actions가 검증된 정적
산출물을 업로드한다. MVP URL은 CloudFront 기본 도메인이다.

## 결과

캐시 무효화와 보안 헤더를 직접 관리해야 하지만 Terraform과 AWS 설계 역량을
명확히 보여준다. Preview 환경과 브랜치별 배포가 핵심이 되면 Amplify를 다시
비교한다. 두 서비스를 동시에 사용하지 않는다.
