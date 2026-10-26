# Task: Concept Study for LLM Performance Calculation Solution

## Phase 1: Research & Definition
- [x] Research LLM VRAM estimation formulas (Parameters, Quantization, KV Cache)
- [x] Research inference performance metrics (Tokens/sec, Latency, Memory Bandwidth vs Compute)
- [x] Identify key GPU performance indicators (TOPS, TFLOPS, Memory Bandwidth)

## Phase 2: System Architecture Design
- [x] Design the Calculation Engine logic
- [x] Design the Calibration (Correction Factor) system
- [x] Design the Data Model for GPUs and Models

## Phase 3: Implementation Plan
- [x] Create an Implementation Plan for the solution
- [x] Draft a prototype or mockup of the calculation tool

## Phase 6: 타사 솔루션 분석 및 고도화 계획 수립
- [x] Vokturz (HF Space) 및 BestGPUsForAI 서비스 분석
- [x] 우리 프로젝트와의 유사성/대체 가능성 검토
- [x] 분석 결과를 바탕으로 고도화 계획(Roadmap) 수립 및 문서 반영

## Phase 7: 동시성 및 에이전트 자원 산출 로직 통합
- [x] 동시 처리 건수 계산 공식 수립 및 기술 보고서 반영
- [x] LLM 에이전트 4대 핵심 자원 단위 정의
- [x] Python PoC에 동시성 및 사용자별 TPS 산출 기능 구현 및 검증

## Phase 8: 에이전트 워크로드 프로파일링 방법론 수립
- [x] 비즈니스 요구사항을 기술 수치로 변환하는 '질문 프레임워크' 설계
- [x] 기술 보고서 및 가이드라인 문서 반영

## Phase 9: Web-based GUI Dashboard 개발
- [x] 비즈니스 톤 대시보드 UI 디자인 및 가이드 기능 설계
- [x] HTML/JS 기반 인터랙티브 계산기 구현
- [x] 전문가가 아니여도 사용 가능한 '심플 가이드' AI 어시스턴트 통합

## Phase 10: 하드웨어 지원 확대 및 UI 최적화
- [x] Apple M2/M3, AMD MI300X, NVIDIA Pro 등 하드웨어 데이터베이스 확장
- [x] 사용자 직접 입력(Custom Hardware) 기능 구현
- [x] 서비스 프리셋 한국어 로컬라이징 및 상세 도움말 추가
- [x] 차트 렌더링 시 레이아웃 흔들림 및 2중 스크롤 버그 수정 (푸터 통합)
- [x] 모바일 대응용 사이드바 토글 및 오버레이 구현 (Menu/Close 버튼 추가)

## Phase 4: Technical Evidence & Verification
- [x] Research and document factual basis (papers, benchmarks, specs)
- [x] Update the concept study report with references

## Phase 5: Documentation & GitHub Preparedness
- [x] Create README.md with project overview and file relationships
- [x] Finalize workspace structure for sharing
