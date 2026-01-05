# LlmVramCalc: LLM Performance calculation solution

본 프로젝트는 GPU 자원(VRAM, Memory Bandwidth)과 LLM 모델의 사양을 기반으로 최적의 처리 능력을 평가하고, 실측 데이터를 통해 예측치를 보완할 수 있는 성능 지표 계산 솔루션을 제안합니다.

## 🚀 프로젝트 목적
- **정밀한 자원 예측**: 모델 크기 및 양자화 비트에 따른 VRAM 요구량 산출.
- **성능 수치화**: GPU 대역폭과 연산력을 바탕으로 예상 TPS(Tokens Per Second) 도출.
- **지속적 보정**: 이론적 한계를 극복하기 위해 실측 효율(η)과 오버헤드를 반영하는 보정 시스템 설계.

## 📁 주요 파일 구성 및 관계

| 파일명 | 구분 | 설명 |
| :--- | :--- | :--- |
| **[concept_study_report.md](concept_study_report.md)** | **핵심 보고서** | Roofline 모델, PagedAttention 등 기술적 근거와 상술된 수식 및 아키텍처 제안서. |
| **[llm_performance_poc.py](llm_performance_poc.py)** | **프로토타입** | 실제 Python으로 구현된 성능 계산기. GPU/모델 조합별 VRAM 및 TPS 자동 산출. |
| **[walkthrough.md](walkthrough.md)** | **결과 요약** | 프로젝트 전체의 성과, 검증 결과 및 향후 확장성(Future Directions) 정리. |
| **[implementation_plan.md](implementation_plan.md)** | **기획 문서** | 서비스 구현 단계와 검증 전략을 담은 초기 로드맵. |
| **[task.md](task.md)** | **진행 상황** | 연구 및 개발 단계별 완료된 항목들을 기록한 체크리스트. |

### 파일 간 관계 (Structural Relationship)
1. **기술적 근거(`concept_study_report.md`)** 에 기반하여 
2. **현실적인 계산 로직(`llm_performance_poc.py`)** 을 구현하였으며,
3. 이들의 실행 결과와 개념을 **종합 정리(`walkthrough.md`)** 하여 대시보드 형태의 서비스로 발전시킬 수 있는 기반을 마련했습니다.

## 🧮 핵심 모델 (Core Logic)
- **VRAM 예측**: `Weights_MB + KV_Cache_MB + Activation_Overhead`
- **Throughput(TPS) 예측**: `Bandwidth_GBs / Weight_Size_GB * Efficiency_Factor`

## 🛠 실행 방법
필요한 라이브러리 없이 표준 Python 환경에서 실행 가능합니다.
```bash
python llm_performance_poc.py
```

## 📚 참고 문헌 (References)
- *Kwon et al. (2023)* - "Efficient Memory Management for Large Language Model Serving with PagedAttention" (vLLM)
- *FlashAttention (2022)* - Dao et al.
- *NVIDIA TensorRT-LLM* 기술 문서 등

---
*본 프로젝트는 LLM 인프라 최적화 및 운영 효율성 극대화를 위한 연구용 자재입니다.*
