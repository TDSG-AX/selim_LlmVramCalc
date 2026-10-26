# selim_LlmVramCalc — LLM 인프라 사이징 계산기

사내에서 LLM(특히 AI 코딩 에이전트)을 서비스하려 할 때 **"GPU가 몇 장, 어떤 장비가 필요한가?"** 를 기획자·개발자·의사결정자가 직접 가늠할 수 있게 하는 **VRAM·처리량(TPS)·동시 사용자 산출 도구** 모음입니다.

핵심 질문은 두 가지입니다.

1. **용량 한계** — 모델 가중치 + 사용자별 KV Cache(컨텍스트)가 GPU 메모리에 들어가는가? (OOM 여부, 최대 동시 인원)
2. **속도 한계** — 메모리 대역폭이 충분해 체감 속도(tps)가 실무에서 쓸 만한가?

> 모든 수치는 이론식과 하드웨어 사양에 기반한 **예측값(참고용)** 입니다. 상용 배포 전에는 실제 벤치마크로 검증하세요.

**바로 열기**: https://tdsg-ax.github.io/selim_LlmVramCalc/ (버전 선택 화면, 저장소 루트 `index.html`)

## 버전 구성

| 버전 | 폴더 | 성격 | 바로 보기 |
| :--- | :--- | :--- | :--- |
| **v1** (v1.1) | [`v1/`](v1/) | 범용 정밀 계산기 — 모델 파라미터·양자화·하드웨어를 직접 지정, 멀티 GPU·보정(Calibration) 지원 | [실행](https://tdsg-ax.github.io/selim_LlmVramCalc/v1/) |
| **v2** (v2.3) | [`v2/`](v2/) | AI 코딩 에이전트 특화 — 모델 프리셋·동시 인원·작업 깊이 3가지 입력으로 필요 장비를 즉시 판정 (검토 결과 반영 완료, 추가 개선 진행 중) | [실행](https://tdsg-ax.github.io/selim_LlmVramCalc/v2/) |

### v1 — LLM Performance Calculator Pro
기존 저장소의 전체 내용입니다. 모델 크기·양자화 비트·GPU 사양(멀티 GPU, HP AI 워크스테이션, 통합 메모리 포함)을 세밀하게 설정해 필요 VRAM, TPS, 동시 접속자를 계산하며, 실측값 기반 `Efficiency Factor` 보정 기능과 Roofline 모델 등 기술 근거 문서를 함께 제공합니다. 정적 파일(HTML/JS/CSS)로 구성된 다파일 앱입니다.
**v1.1 변경**: 검수 결과([v1/REVIEW.md](v1/REVIEW.md))를 반영해 KV Cache를 모델 구조 기반으로, TPS를 배치 인지 식으로 교체하고 목표 TPS 판정·멀티 GPU 병렬 효율·통합 메모리 사용 비율을 추가했습니다.
→ 자세한 내용: [v1/README.md](v1/README.md)

### v2 — AI 코딩 에이전트 인프라 사이징 계산기
`필요 VRAM = 고정 메모리(모델 가중치 + 런타임 버퍼) + 1인당 KV Cache × 동시 인원` 의 단순한 선형 모델로, 비전문가도 이해하기 쉬운 의사결정용 대시보드를 지향합니다.
- 3대 입력: **모델**(Qwen 14B / 32B INT4 / 32B FP16 / 70B FP8) · **동시 활성 인원**(1~30명) · **작업 깊이**(16k~128k 컨텍스트)
- 출력: 필요 메모리 요약 배너, 인원 증가에 따른 VRAM 곡선과 장비 한계선 차트, 장비별(H100/A100/H200/GB10 등) 최대 인원·예상 tps·제약사항 판정
- 단일 `index.html`(Tailwind·Chart.js CDN 사용)로 동작
- **v2.3 변경**: "동시 접속"을 동시 처리 요청(in-flight)으로 재정의 — 팀원 수·호출 주기·출력 토큰으로 평균/피크 동시 요청과 prefill 활용률을 계산하고 "수용 가능 팀원 수"를 제시(직접 입력 모드 병행)
- **v2.1~2.2 변경**: 사용 가능 VRAM 비율·KV 정밀도·배치 인지 tps·TTFT(prefill)·장비 9구성·컨텍스트 축 그래프, 메모리/속도 기준 최대 인원 병기
→ 자세한 내용: [v2/README.md](v2/README.md), 근거·평가: [v2/ANALYSIS.md](v2/ANALYSIS.md)

## 문서
- [CONCURRENCY.md](CONCURRENCY.md) — "동시 접속" 개념 검토 (동시 처리 시퀀스, 활성 비율, 피크 분위수, prefill 부하)
- [v1/REVIEW.md](v1/REVIEW.md), [v2/ANALYSIS.md](v2/ANALYSIS.md) — 버전별 계산·이론 검수

## 로드맵
- 동시 접속 모델 개선: 팀원 수·호출 주기·출력 토큰으로 동시 시퀀스(평균/P95)와 요구 처리량(prefill·decode) 계산 ([CONCURRENCY.md](CONCURRENCY.md) 9장)
- 병렬 효율·prefill 활용률 등 가정치의 실측 교정
- v1의 보정(Calibration) 기능과 v2의 통합 여부 결정

## ⚠️ 안내 사항
- 본 도구는 **예측값**을 제공하며, OS 점유 메모리·추론 프레임워크(vLLM, TensorRT-LLM 등) 최적화 수준에 따라 실제 결과가 다를 수 있습니다.

## ⚖️ License & Copyright

Copyright ⓒ 2026 **Selim**. All rights reserved.

본 프로젝트의 모든 결과물(소스 코드, 디자인, 기술 문서)에 대한 저작권은 **Selim**에게 있습니다. **무단 전재, 배포, 상업적 이용 및 무단 수정 후 배포를 엄격히 금지합니다.**
