# LLM Performance Calculator Pro

LLM 서비스 기획자와 개발자를 위한 인터랙티브 성능 산출 도구입니다. 모델 파라미터, 양자화 비트, 하드웨어 사양을 기반으로 필요한 VRAM과 처리량(TPS), 동시 접속자 수를 예측합니다.

👉 **[LlmVramCalc 바로보기](https://tdsg-ax.github.io/selim_LlmVramCalc/)**
(GitHub Pages를 통해 즉시 실행됩니다)

## 🚀 서버 구동 방법

본 도구는 정적 파일(HTML/JS/CSS)로 구성되어 있어 별도의 백엔드 설치가 필요 없습니다. 다음 방법 중 하나로 실행 가능합니다.

### 1. 전용 개발 서버 사용 (추천)
Node.js가 설치되어 있다면 아래 명령어로 즉시 가동할 수 있습니다.
```bash
npx serve -l 3000 .
```
이후 브라우저에서 `http://localhost:3000`으로 접속하세요.

### 2. VS Code Live Server
Visual Studio Code를 사용 중이라면 `Live Server` 확장을 설치한 후, `index.html`에서 'Open with Live Server'를 클릭하여 실행할 수 있습니다.

### 3. 단순 브라우저 실행
`index.html` 파일을 크롬이나 엣지 브라우저에 드래그하여 바로 확인할 수 있습니다.

## 🌐 GitHub Pages 배포 (웹에서 바로 보기) ### 
GitHub 저장소 설정(Settings) -> Pages 메뉴에서 `Source`를 `Deploy from a branch`로 선택하고 `main` 브랜치의 `/` 루트 디렉토리를 지정하면, 본인의 GitHub 주소로 웹 호스팅이 즉시 활성화됩니다. (예: `https://[username].github.io/[repo-name]/`)

## 🛠️ 유지보수 및 업데이트 계획

- **모델 DB 보정 (Monthly)**: 최신 LLM(Llama, Mistral 등)의 실제 FP8/INT4 점유율 데이터를 기반으로 시뮬레이션 공식을 지속적으로 업데이트합니다.
- **하드웨어 사양 업데이트**: 신규 출시되는 NVIDIA Blackwell(B100/B200), AMD MI 시리즈의 세부 사양을 데이터베이스에 정기 반영합니다.
- **사용자 피드백 반영**: 실측값과 예측값의 오차 보고를 기반으로 `Efficiency Factor`를 미세 조정합니다.

## 📁 파일 구성 및 관계

| 파일명 | 구분 | 설명 |
| :--- | :--- | :--- |
| **[index.html](index.html)** | **메인 서비스** | 웹 기반 인터랙티브 GUI 대시보드. |
| **[concept_study_report.md](concept_study_report.md)** | **핵심 보고서** | Roofline 모델, PagedAttention 등 기술적 근거와 상술된 수식 정리. |
| **[llm_performance_poc.py](llm_performance_poc.py)** | **PoC 스크립트** | 파이썬 기반 성능 계산기 프로토타입. |
| **[walkthrough.md](walkthrough.md)** | **매뉴얼/워크스루** | 주요 기능 스크린샷 가이드 및 결과 요약. |

## ⚠️ 안내 사항
- 본 도구는 이론적 공식과 하드웨어 사양을 기반으로 한 **예측값**을 제공합니다.
- 실제 배포 시에는 OS 점유 메모리, 프레임워크(vLLM, TensorRT-LLM)의 최적화 수준에 따라 실제 결과가 다를 수 있습니다.
- 모든 수치는 **참고용**이며, 상용 환경 배포 전 반드시 실제 벤치마크 테스트를 권장합니다.
