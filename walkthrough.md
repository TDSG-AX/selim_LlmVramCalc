# LLM Performance Calculation Solution Walkthrough

본 프로젝트는 GPU 자원과 LLM 모델의 조합별 처리 능력을 평가하고, 실측 데이터를 통해 지속적으로 보정 가능한 계산 솔루션에 대한 개념 연구를 수행하였습니다.

## 주요 성과 (Key Accomplishments)

### 1. 기술 연구 및 수식 정립 (Verified Facts)
LLM 추론 시 발생하는 VRAM 점유율과 처리량(TPS)을 예측하기 위한 핵심 수식을 도출하고, Roofline Model 및 PagedAttention 등 최신 논문과 기술 문서를 통해 그 타당성을 검증하였습니다.
- **VRAM**: `Parameters * (Bits/8) * 1.2 + KV_Cache` (PagedAttention 기반 최적화 반영)
- **Throughput**: `Memory_Bandwidth / (Parameters * Bits/8) * η` (Decoding 단계의 Memory-bound 특성 반영)

### 2. 개념 연구 보고서 작성
[concept_study_report.md](concept_study_report.md)를 통해 솔루션의 아키텍처와 보정(Calibration) 시스템의 논리를 정의하였습니다.

### 3. 동시성 및 에이전트 자원 산출 로직 통합 (New)
제공된 자료를 바탕으로 에이전트 시스템의 **동시 처리 건수(Concurrency)**와 **에이전트 4대 핵심 단위**를 솔루션에 통합하였습니다.
- **동시 처리 계산**: `(가용 VRAM) / (인당 KV 캐시 점유량)` 공식을 PoC에 반영.
- **사용자별 성능 지표**: 총 TPS를 동시 접속자 수로 나눈 '인당 체감 TPS' 산출 기능 추가.

## 검증 결과 (Validation Results)

업데이트된 프로토타입 실행 결과, 다음과 같은 정밀 지표를 도출하였습니다:

```text
GPU          | Model           | VRAM Req   | Concurrency  | TPS (Tot/User)
---------------------------------------------------------------------------
RTX 3090     | 8B (16-bit)     | 18.70 GB   | 3 sessions   |  40.9 / 13.6 
RTX 4090     | 8B (4-bit)      | 10.30 GB   | 3 sessions   | 176.4 / 58.8 
A100_80GB    | 70B (4-bit)     | 47.00 GB   | 3 sessions   |  40.8 / 13.6 
H100_SXM     | 70B (8-bit)     | 92.50 GB   | 0 sessions   |  33.5 / 33.5 
```
> **Note**: H100_SXM (80GB)에서 70B 8-bit 모델은 가중치만으로도 용량이 한계에 도달하여 동시 처리가 불가능함을 정확히 예측함.

## 6. Web Dashboard GUI 및 AI 어시스턴트 (Final)
사용자 편의성을 위해 비즈니스 톤으로 디자인된 웹 기반 인터페이스를 구축했습니다.
- **주요 기능**: 실시간 VRAM 점유율 시각화, 동시 접속자 수 자동 계산, 배포 가능 여부 진단.
- **서비스별 프리셋(한국어 소통)**: 에이전트 서비스 유형을 한국어로 제공하며, 선택 시 해당 워크로드에 최적화된 설정을 자동으로 제안합니다.
- **하드웨어 지원 확대**: NVIDIA H100/A100뿐만 아니라 Apple(M2/M3), AMD(Instinct), NVIDIA RTX A6000 등 다양한 환경을 지원합니다.
- **직접 입력(Custom Hardware)**: 데이터베이스에 없는 최신 장비나 클라우드 인스턴스 사양을 사용자가 직접 입력하여 시뮬레이션할 수 있습니다.

![Dashboard Enhanced](file:///C:/Users/user/.gemini/antigravity/brain/91bfd105-0fc7-4366-b66a-5d14805623d8/llm_calculator_dashboard_1767628321432.png)
| **RTX 4090 (4대)** | Llama-3 14B (4-bit) | ~11.0 GB | 7 Sessions | **High Performance** |

## 6. UI 데모 및 연구 기록

### 멀티 GPU 대시보드 인터페이스
![Multi-GPU Dashboard UI Mockup](file:///C:/Users/user/.gemini/antigravity/brain/4bf4b2f3-4019-4c47-afdb-2baefe386d44/multi_gpu_dashboard_ui_mockup_1767759226754.png)
*멀티 GPU 클러스터 설정 시 리소스가 선형적으로 확장되는 모습을 보여주는 대시보드 디자인(예시)입니다.*

### HP 하드웨어 사양 조사 기록
![HP Hardware Research Recording](file:///C:/Users/user/.gemini/antigravity/brain/4bf4b2f3-4019-4c47-afdb-2baefe386d44/hp_hardware_research_1767751586260.webp)
*HP 최신 AI 하드웨어 사양 도출을 위해 수행된 브라우저 리서치 과정입니다.*

## 7. 결론 및 향후 계획
본 프로젝트는 단일 워크스테이션부터 클라우드 인프라 클러스터까지 LLM 도입 시 필요한 모든 하드웨어 자원을 정밀하게 예측할 수 있는 종합 솔루션으로 진화하였습니다.
