# LLM Performance Calculation Solution Concept Study

## 1. 개요 (Introduction)
본 연구는 GPU 자원(VRAM, TOPS, 대역폭)과 LLM 모델 사양을 조합하여 예상 퍼포먼스를 수치화하고, 이를 지속적으로 보정할 수 있는 계산 솔루션의 개념을 정의합니다.

## 2. 핵심 성능 지표 (Core Metrics)

### 2.1 VRAM 요구량 (Memory Requirement)
모델을 로드하고 추론을 수행하는 데 필요한 메모리입니다.
- **Formula**: `VRAM (GB) = [P * (Q / 8) * 1.2] + KV_Cache`
  - `P`: 파라미터 수 (Billion)
  - `Q`: 양자화 비트수 (FP16=16, INT4=4)
  - `1.2`: 활성화 값(Activations) 및 프레임워크 오버헤드 보정 계수
  - `KV_Cache`: 컨텍스트 길이에 따른 추가 메모리 (Batch * Seq_Len * Hidden_Dim * Layers * 2 / 10^9)

### 2.2 추론 속도 (Throughput - TPS)
초당 생성 토큰 수(Tokens Per Second)를 결정하는 요소입니다.
- **Memory Bound (Decoding)**: 대부분의 생성 시점은 메모리 대역폭에 제약됩니다.
  - `TPS = Memory_Bandwidth (GB/s) / [P * (Q / 8)]`
- **Compute Bound (Prefill)**: 초기 프롬프트 처리 시점은 GPU의 연산 능력에 제약됩니다.
  - `Prefill_TPS = GPU_TFLOPS / (Model_FLOPs_per_token)`

## 3. 보정 시스템 (Calibration System)

### 3.1 보정 계수 (Correction Factor)
이론적 수치와 실제 성능의 간극을 메우기 위해 다음과 같은 보정값을 도입합니다.
- **Efficiency Factor (η)**: `Actual_TPS = Theoretical_TPS * η` (일반적으로 0.6 ~ 0.9)
- **Overhead Constant (C)**: `Actual_VRAM = Base_VRAM + C` (프레임워크가 점유하는 기본 메모리)

### 3.2 정밀 분석 방법론 (Analysis Methodologies)
보정값을 도출하기 위해 수행 가능한 분석 유형입니다.

1. **실측 회귀 분석 (Empirical Regression Analysis)**:
   - 방법: 시퀀스 길이(2k, 4k, 8k...)와 배치 사이즈를 가변하며 VRAM 사용량을 측정합니다.
   - 목적: 데이터 포인트들을 선형 회귀하여 '기본 오버헤드(절편)'와 '토큰당 메모리 증가율(기울기)'을 분리해냅니다.
2. **프레임워크 정적 점유 분석 (Static Footprint Analysis)**:
   - 방법: 모델 로드 전/후 및 첫 번째 추론 직후의 VRAM 변화를 모니터링합니다.
   - 목적: CUDA 컨텍스트, 커널 로드, 기본 버퍼가 차지하는 정적 메모리(`System Reserve`)를 확정합니다.
3. **루프라인 모델 프로파일링 (Arithmetic Intensity Analysis)**:
   - 방법: `nsys` 또는 `nvprof`를 사용하여 연산량 대비 메모리 대역폭 사용률을 측정합니다.
   - 목적: 하드웨어의 이론적 한계치 대비 실제 활용률(`Efficiency Factor`)을 기술적으로 증명합니다.
4. **활성화 버퍼 분석 (Activation Buffer Analysis)**:
   - 방법: Hidden Dimension, Attention Heads, Batch Size를 기반으로 중간 텐서 크기를 수식화합니다.
   - 목적: 가중치 외에 추론 과정에서 일시적으로 필요한 메모리 계수(기존 1.2배 등)를 정교화합니다.
5. **PagedAttention 단편화 분석 (Fragmentation Analysis)**:
   - 방법: vLLM 등에서 물리적 할당량과 실제 사용된 KV 토큰 수를 비교합니다.
   - 목적: 메모리 관리 효율에 따른 실제 가용 VRAM의 유효 용량을 산출합니다.

### 3.3 데이터 업데이트 메커니즘
- **GPU DB**: 각 GPU 모델별 Peak TFLOPS, Memory Bandwidth, VRAM 용량 정보를 유지합니다.
- **Benchmarking Feed**: 실제 유저나 벤치마크 도구로부터 얻은 성능 데이터를 DB에 누적하여 `η`와 `C` 값을 최신화합니다.

## 4. 솔루션 아키텍처 제안

### 4.1 서비스 구성요소
1. **Spec Library**: 최신 GPU 및 LLM 모델의 하드웨어/아키텍처 스펙 저장소.
2. **Calculation Engine**: 위 수식을 기반으로 성능을 추정하는 핵심 로직.
3. **Calibration Module**: 실측 데이터를 기반으로 보정 계수를 재계산 (Regression Analysis 등 활용).
4. **Result Dashboard**: GPU-모델 조합별 예상 TPS, Latency, VRAM 점유율 시각화.

### 5. 사실 근거 및 기술적 배경 (Factual Evidence)

### 5.1 메모리 병목 현상의 근거: Roofline Model
추론 시 생동감 있는 속도(TPS)를 결정하는 핵심은 GPU의 연산력(TFLOPS)보다 **메모리 대역폭(Bandwidth)**입니다. 
- **Fact**: LLM의 디코딩(Decoding) 단계는 'Arithmetic Intensity'(연산 밀도)가 매우 낮아 Roofline 모델 상에서 'Memory-bound' 영역에 위치합니다. 따라서 `TPS = 대역폭 / 모델 크기` 공식이 성립하며, 이는 NVIDIA 및 Anyscale의 벤치마크 데이터와 일치합니다.

### 5.2 KV Cache 오버헤드
- **Fact**: KV Cache는 `2 * Batch * Layers * Hidden_Dim * Seq_Len * Precision`의 공식을 따릅니다. 
- **PagedAttention**: vLLM 프로젝트의 핵심 기술로, 기존의 연속적 메모리 할당 방식에서 발생하는 60~80%의 메모리 낭비를 4% 이하로 줄일 수 있음을 실증하였습니다. 이는 본 계산 엔진에서 `KV_Cache` 보정치를 적용하는 근거가 됩니다.

### 5.3 하드웨어 효율성 (Efficiency Factor)
- **Fact**: 이론적인 최대 성능과 실제 성능 사이에는 하드웨어 활용도(Utilization) 간극이 존재합니다. 
- **Benchmark**: vLLM과 TensorRT-LLM은 고도화된 커널 최적화를 통해 약 80~90%의 GPU 활용률을 달성합니다. 반면 일반적인 정적 배칭(Static Batching)은 30% 이하의 효율을 보이기도 합니다. 본 솔루션의 `η` 보정 계수는 이러한 기술적 성숙도를 반영합니다.

## 6. 참고 문헌 및 자료 (References)
1. **Kwon et al.** (2023). "Efficient Memory Management for Large Language Model Serving with PagedAttention". *SOSP 2023*. (vLLM의 핵심 논문)
2. **NVIDIA Technical Blog**: "Optimizing LLM Inference with TensorRT-LLM".
3. **Anyscale Blog**: "LLM Inference: At the Speed of Thought".
4. **FlashAttention**: Dao et al. (2022). "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness".
5. **NVIDIA Hopper/Ampere Datasheet**: 공식 하드웨어 사양 (TFLOPS, Memory Bandwidth).

## 7. 타사 솔루션 분석 및 차별화 (Comparative Analysis)

### 7.1 주요 솔루션 분석
- **Vokturz (HF Space)**: HF API 연동을 통한 자동 모델 스펙 로드 및 Training/LoRA 메모리 추정 강점. 그러나 추론 오버헤드를 일괄 1.2배(20%)로 처리하여 긴 컨텍스트에서의 오차 발생 가능성 존재.
- **BestGPUsForAI**: 단순 파라미터 기반 빠른 계산 및 다양한 양자화(FP4/6/8) 지원. 성능(TPS) 지표는 부재.

### 7.2 LlmVramCalc의 차별점
- **정밀 KV Cache 모델링**: 고정된 1.2배 계수가 아닌, 시퀀스 길이에 따른 동적 메모리 점유율 계산.
- **성능(Throughput) 예측**: 하드웨어 대역폭 기반의 TPS 산출 및 효율 지표(η) 제공.
- **보정 시스템**: 실측 데이터를 통한 지속적인 수식 고도화 가능성.

## 8. 고도화 계획 (Advanced Roadmap)

1. **자동화 인터페이스**: Hugging Face API 연동을 통한 모델 아키텍처(Hidden Size, Layer 등) 자동 추출 기능.
2. **훈련 모드 확장**: Inference 외에 Full Training 및 LoRA 학습 시 필요한 VRAM(Optimizer State 포함) 계산 기능 추가.
3. **인프라 최적화 가이드**: 목표 TPS 달성을 위한 최소 사양 GPU 추천 및 가성비($/Token) 분석 기능.
4. **PagedAttention 시뮬레이션**: 관리 방식에 따른 실제 가용 메모리 변화량 시뮬레이션 모듈.
## 9. 에이전트 시스템 및 동시성 설계 (Agent & Concurrency)

### 9.1 4가지 핵심 자원 단위
에이전트 시스템 구상 시 반드시 고려해야 할 4가지 수치입니다.
1. **파라미터 수 (B)**: 모델의 지능과 비례하지만 VRAM 요구량의 기초가 됨.
2. **정밀도 (bits)**: 가중치 한 개당 메모리 크기 (INT4 가 표준).
3. **비디오 메모리 (VRAM)**: GPU 모델 전체 용량 중 모델 가중치와 시스템 예약을 제외한 가용 공간.
4. **컨텍스트 길이 (Context Window)**: 에이전트가 기억하는 토큰 수 (8k~32k 이상). KV 캐시 점유량에 직결됨.

### 9.2 동시 처리 건수 (Batch Size) 및 가용성 계산
GPU 메모리 한도 내에서 수용 가능한 최대 세션 수를 산출합니다.
- **[공식]** `동시 처리 가능 건수 (Batch Size) = (총 VRAM - 모델 가중치 - 시스템 예약분) / (사용자 1인당 KV 캐시 점유량)`
- **성능 기반 제약**: 사용자별 체감 속도를 위해 `(총 TPS) / (동시 접속자 수)`가 최소 15~20 TPS 이상 유지되도록 설계해야 함.

### 9.3 에이전트 특화 지표
- **TTFT (Time To First Token)**: 응답 개시 지연 시간.
- **RPS (Requests Per Second)**: 초당 처리 작업 수.
- **PagedAttention**: vLLM 등의 기술을 통해 KV 캐시 낭비를 최소화하여 동시 처리량을 비약적으로 향상 가능.

## 10. 에이전트 워크로드 프로파일링 가이드 (Profiling Guide)

정밀한 리소스 산출을 위해 사용자(또는 고객)에게 던져야 할 핵심 질문 리스트와 이를 수치로 변환하는 프레임워크입니다.

### 10.1 핵심 질문 프레임워크 (5-Dimension Questions)

| 영역 | 주요 질문 | 기술 변환 수치 |
| :--- | :--- | :--- |
| **1. 모델 전략** | 얼마나 복잡한 지적 처리가 필요한가? (단순 분류 vs 전문가 수준 추론) | `Parameters (B)` 결정 |
| **2. 정보 밀도** | 한 번에 참조해야 할 정보량(문서, 이전 대화 등)은 얼마인가? | `Context Window (seq_len)` 결정 |
| **3. 상호작용** | 사용자가 체감해야 할 응답 속도가 중요한가? (실시간 채팅 vs 비동기 작업) | `Target TPS` 및 `Efficiency (η)` 결정 |
| **4. 에이전트 행동** | 스스로 도구(Tool)를 사용하거나 고민(CoT)하는 단계가 많은가? | `Inference Steps` 및 `Output Token` 가중치 적용 |
| **5. 부하 예측** | 피크 타임 시 동시에 몇 개의 요청을 처리해야 하는가? | `Concurrency (Batch Size)` 결정 |

### 10.2 워크로드 변환 알고리즘 (Business to Technical)

1. **Context Window 산출**:
   - 질문: "참조할 PDF가 보통 몇 페이지인가요?"
   - 변환: `1페이지 ≈ 1,000 토큰` 적용 ➔ RAG 사용 시 기본 8k 이상 권장.
2. **Total VRAM 산출 시 오버헤드**:
   - 질문: "도구 사용(Function Calling)이 빈번한가요?"
   - 변환: 에이전트가 루프를 돌 때마다 컨텍스트가 누적되므로 `KV_Cache`에 1.5배의 안전 계수(Safety Factor) 적용.

### 10.3 질문 단계별 의사 결정 트리
- **Q1.** 70B 이상의 모델이 필수인가? ➔ (Yes: H100급 인프라 권장) / (No: 8B급 RTX 4090급 검토)
- **Q2.** 동시 접속자가 10명 이상인가? ➔ (Yes: vLLM PagedAttention 필수 적용)
- **Q3.** 응답 지연이 2초 이내여야 하는가? ➔ (Yes: FP16 대신 INT4/AWQ 양자화로 TPS 확보)

이 가이드는 단순 계산기를 넘어, 비즈니스 요구사항을 실제 인프라 비용과 성능으로 연결하는 **컨설팅 로직**으로 활용됩니다.

## 11. 멀티 GPU 및 통합 메모리 스케일링 (Multi-GPU & Unified Memory Scaling)

단일 장비의 한계를 넘어 클러스터 및 클라우드 환경에서의 자원 스케일링을 위한 계산 모델입니다.

### 11.1 리소스 합산 모델
- **Total VRAM**: `VRAM_total = VRAM_per_node * Node_Count`
  - 통합 메모리(Unified Memory) 환경(Apple M 시리즈, HP Z2/ZGX 등)에서는 시스템 메모리 전체를 공유 자원으로 산정하되, OS 및 기타 프로세스 점유율(System Reserve)을 유동적으로 고려해야 합니다.
- **Total Bandwidth**: `Bandwidth_total = Bandwidth_per_node * Node_Count`
  - 본 계산기는 데이터 병렬 처리(Data Parallelism)를 통한 선형적 성능 확장을 가정합니다. 모델 병렬 처리(Model Parallelism) 시 발생하는 인터커넥트(NVLink, InfiniBand) 오버헤드는 `Efficiency Factor (η)`를 통해 보정합니다.

### 11.2 초거대 모델 수용 사례 (Case Study)
- **Llama-3 405B (4-bit)**: 약 203GB VRAM 필요.
  - **H100 (80GB) x 3**: 가능 (240GB 확보)
  - **HP ZGX Nano (128GB) x 2**: 가능 (256GB 확보)
  - **RTX 4090 (24GB) x 9**: 가능 (216GB 확보)

### 11.3 통합 메모리 하드웨어의 특성
- HP Z2 Mini G1A 및 ZGX Nano와 같은 최신 AI 워크스테이션은 고속 LPDDR5x를 GPU와 CPU가 공유하여, 일반 소비자용 GPU보다 훨씬 큰 VRAM 공간을 제공하면서도 합리적인 비용으로 대규모 모델 서빙이 가능합니다.

---

## 12. 통합 메모리(UM) 성능 보정 모델 (Unified Memory Performance Refinement)

통합 메모리(Unified Memory) 장비는 용량 면에서 유리하지만, 대역폭 경쟁과 시스템 점유율 측면에서 전용 GPU 대비 특성이 다릅니다. 본 계산기는 이러한 UM 특성을 반영하여 보다 현실적인 예측을 제공합니다.

### 12.1 대역폭 경쟁 (Bandwidth Contention)
- UM 아키텍처에서는 GPU 컴퓨팅, CPU 연산, OS 서비스가 **동일한 메모리 버스를 공유**합니다.
- 따라서, 이론상 대역폭(예: 273GB/s)을 LLM 추론에 100% 활용하기 어렵습니다.
- **보정 공식**: `η_effective = η * 0.85`
  - 기본 Efficiency Factor(η)에 15%의 추가 페널티를 적용합니다.

### 12.2 시스템 점유율 증가 (Elevated System Reserve)
- 전용 GPU는 VRAM이 독립적으로 관리되는 반면, UM 장비에서는 OS와 백그라운드 앱이 동일 메모리 풀을 사용합니다.
- 이로 인해 안정적인 LLM 서빙을 위해 더 많은 시스템 예약 공간이 필요합니다.
- **보정 공식**: `System Reserve (UM) = System Reserve + 1.0 GB` (최소 3GB 권장)

### 12.3 UM 장비 대상 권장 사항
| 장비 | 권장 System Reserve | 권장 η Factor |
|---|---|---|
| Apple M3 Max | 4 GB | 0.5~0.6 |
| Apple M2 Ultra | 4 GB | 0.55~0.65 |
| HP Z2 Mini G1A | 4 GB | 0.5~0.55 |
| HP ZGX Nano G1N | 4 GB | 0.5~0.55 |

이 보정 모델은 UM 하드웨어의 **VRAM 용량 대비 대역폭 제한**이라는 트레이드오프를 반영하여, 과도하게 낙관적인 성능 예측을 방지합니다.
