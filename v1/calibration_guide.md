# LLM VRAM & Performance Calibration Guide

이 가이드는 실측 데이터를 기반으로 계산기의 정확도를 높이는 실전 프로세스를 설명합니다.

## 1. VRAM 오버헤드 측정 (Static & Dynamic)

### 1.1 프레임워크 오버헤드 (C1)
1. **모델 없이 런타임만 실행**: `vLLM`이나 `llama.cpp` 서버를 모델 없이 실행하거나, 단순 import 후 CUDA 컨텍스트를 초기화합니다.
2. **측정**: `nvidia-smi`를 통해 점유된 VRAM을 확인합니다. (보통 500MB ~ 2GB)
3. **입력**: 계산기의 `System Reserve` 값으로 사용합니다.

### 1.2 모델 가중치 오버헤드 (C2)
1. **모델 로드**: 특정 비트(예: INT4)로 모델을 로드합니다.
2. **측정**: (로드 후 VRAM) - (로드 전 VRAM) - (이론적 가중치 크기)
3. **분석**: 이론적 크기(`P * Q / 8`)보다 큰 경우, 레이어 간 버퍼나 마진이 추가된 것입니다.

## 2. KV Cache 회귀 분석

가장 정밀한 보정이 필요한 부분입니다.

### 측정 시나리오
- **Sample A**: Context 2,048 / Batch 1
- **Sample B**: Context 8,192 / Batch 1
- **Sample C**: Context 8,192 / Batch 4

### 보정 계산
- `ΔVRAM / ΔContext`를 통해 토큰당 실제 필요 byte를 산출합니다.
- 계산기 수식의 `1.2` 계수(Safety Factor)를 실제 비율에 맞춰 조정합니다. (예: vLLM PagedAttention 사용 시 1.05까지 하향 가능)

## 3. TPS 효율 지표 (η) 산출

### 실험
1. GPU의 이론적 대역폭 확인 (예: RTX 4090 = 1,008 GB/s)
2. 모델 크기 확인 (예: Llama-3-8B-INT4 ≈ 5.5 GB)
3. **이론적 TPS**: `1,008 / 5.5 ≈ 183 TPS`
4. **실측 TPS**: 실제 추론 시 출력되는 TPS (예: 130 TPS)
5. **결과**: `η = 130 / 183 ≈ 0.71`

## 4. 보정값 적용 Flow
1. 실측 데이터 확보 (최소 3개 이상의 하드웨어/모델 조합)
2. `app.js`의 `frameworkOverhead`, `systemReserve`, `efficiencyFactor` 변수 업데이트
3. 대시보드에서 'Real-world vs. Prediction' 오차 범위 5% 이내 확인

## 5. 멀티 GPU 및 특수 하드웨어 보정 (Advanced)

### 5.1 인터커넥트 효율 (Interconnect Efficiency)
1. **분석**: 장비 간 데이터 전송(NVLink, PCIe 등)으로 인해 노드 수가 늘어날수록 선형적으로 TPS가 증가하지 않을 수 있습니다.
2. **보정**: 노드 수가 4개 이상인 대규모 클러스터의 경우 `Efficiency Factor (η)`를 단일 장비 대비 10~15% 정도 보수적으로(낮게) 설정하여 실측값에 근정시킵니다.

### 5.2 통합 메모리(Unified Memory) 예약분
1. **분석**: HP Z2 Mini G1A 등 통합 메모리 기반 장비는 OS가 점유하는 메모리가 일반 GPU 서버보다 클 수 있습니다.
2. **보정**: `System Reserve` 값을 실제 가용 가능한 메모리(Available Memory)에서 모델 로드 전 이미 점유된 수치로 설정하여 계산 오차를 배제합니다.
