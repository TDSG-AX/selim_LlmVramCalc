/* 
 * LLM Performance Calculator Pro
 * Copyright ⓒ 2026 Selim. All rights reserved.
 * Unauthorized reproduction or distribution is prohibited.
 */

// GPU Specifications
const GPU_SPECS = {
    // NVIDIA Data Center
    "H100_SXM": { vram: 80, bandwidth: 3352 },
    "A100_80GB": { vram: 80, bandwidth: 2039 },
    "A100_40GB": { vram: 40, bandwidth: 1555 },
    // NVIDIA Workstation
    "A6000": { vram: 48, bandwidth: 768 },
    "A4000": { vram: 16, bandwidth: 448 },
    // NVIDIA Consumer
    "RTX 4090": { vram: 24, bandwidth: 1008 },
    "RTX 3090": { vram: 24, bandwidth: 936 },
    // Apple Silicon (Unified Memory)
    "M3_MAX": { vram: 128, bandwidth: 400 },
    "M2_ULTRA": { vram: 192, bandwidth: 800 },
    // AMD Instinct
    "MI300X": { vram: 192, bandwidth: 5300 },
    "MI250X": { vram: 128, bandwidth: 3200 },
    // HP AI Workstations (Unified Memory)
    "Z2_MINI_G1A": { vram: 128, bandwidth: 256 },
    "ZGX_NANO": { vram: 128, bandwidth: 273 }
};

// 통합 메모리(UM) 장비의 GPU 사용 가능 비율 (가정치: macOS는 기본 GPU 할당 상한이 있어 약 75%, 그 외 UM 장비는 OS 점유를 감안해 90%)
const UM_USABLE_RATIO = { "M3_MAX": 0.75, "M2_ULTRA": 0.75, "Z2_MINI_G1A": 0.9, "ZGX_NANO": 0.9 };

// Presets Configuration
const AGENT_PRESETS = {
    "chatbot": { params: 8, bits: 4, seq: 8192, gpu: "RTX 4090", desc: "일상적인 대화를 위한 Balanced 설정입니다." },
    "test_gen": { params: 14, bits: 4, seq: 16384, gpu: "RTX 4090", desc: "복잡한 시나리오 생성을 위한 Logic-heavy 설정입니다." },
    "code_commenter": { params: 7, bits: 4, seq: 4096, gpu: "RTX 3090", desc: "빠른 코드 주석 생성을 위한 Fast-Inference 설정입니다." },
    "code_analyzer": { params: 14, bits: 4, seq: 32768, gpu: "A100_80GB", desc: "대규모 코드 분석을 위한 Long-Context 설정입니다." },
    "refactor_expert": { params: 70, bits: 4, seq: 8192, gpu: "A100_80GB", desc: "고수준 리팩토링을 위한 High-Intelligence 설정입니다." }
};

// State
let vramChart = null;

// DOM Elements
const gpuSelect = document.getElementById('gpuSelect');
const customHwFields = document.getElementById('customHwFields');
const customVramInput = document.getElementById('customVram');
const customBandwidthInput = document.getElementById('customBandwidth');
const modelSizeInput = document.getElementById('modelSize');
const quantizationSelect = document.getElementById('quantization');
const contextLenInput = document.getElementById('contextLen');
const contextLenVal = document.getElementById('contextLenVal');
const gpuCountInput = document.getElementById('gpuCount');
const gpuCountVal = document.getElementById('gpuCountVal');
const agentPreset = document.getElementById('agentPreset');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// Calibration Elements
const effFactorInput = document.getElementById('effFactor');
const sysReserveInput = document.getElementById('sysReserve');
const kvSafetyInput = document.getElementById('kvSafety');
const kvBytesInput = document.getElementById('kvBytes');
const targetTpsInput = document.getElementById('targetTps');
const parEffInput = document.getElementById('parEff');

const totalVramEl = document.getElementById('totalVram');
const maxConcurrencyEl = document.getElementById('maxConcurrency');
const totalTpsEl = document.getElementById('totalTps');
const userTpsEl = document.getElementById('userTps');

const statusIndicator = document.getElementById('statusIndicator');
const statusText = statusIndicator.querySelector('.status-text');
const statusMsg = document.getElementById('statusMsg');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    attachListeners();
    calculate();
});

function initChart() {
    const ctx = document.getElementById('vramChart').getContext('2d');
    vramChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Weights', 'KV Cache', 'Overhead', 'Free'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#0d6efd', '#6610f2', '#6f42c1', '#e9ecef'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function attachListeners() {
    const inputs = [
        agentPreset, gpuSelect, gpuCountInput, customVramInput,
        customBandwidthInput, modelSizeInput, quantizationSelect,
        contextLenInput, effFactorInput, sysReserveInput, kvSafetyInput,
        kvBytesInput, targetTpsInput, parEffInput
    ];

    inputs.forEach(el => {
        if (!el) return; // Defensive check
        el.addEventListener('input', () => {
            if (el === contextLenInput && contextLenVal) {
                contextLenVal.textContent = parseInt(el.value).toLocaleString();
            }
            if (el === gpuCountInput && gpuCountVal) {
                gpuCountVal.textContent = el.value;
            }
            if (el === agentPreset) {
                handlePresetChange();
            } else if (el !== agentPreset && el !== customVramInput && el !== customBandwidthInput) {
                if (agentPreset) agentPreset.value = "custom";
            }

            if (el === gpuSelect) {
                if (gpuSelect.value === 'custom_hw') {
                    customHwFields.classList.remove('hidden');
                } else {
                    customHwFields.classList.add('hidden');
                }
            }

            calculate();
        });
    });

    document.getElementById('sendBtn').addEventListener('click', handleChat);
    document.getElementById('userInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChat();
    });

    // Sidebar Toggle Listeners
    menuToggle.addEventListener('click', toggleSidebar);
    closeSidebar.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);
}

function toggleSidebar() {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
}

function handlePresetChange() {
    const preset = AGENT_PRESETS[agentPreset.value];
    if (!preset) return;

    modelSizeInput.value = preset.params;
    quantizationSelect.value = preset.bits;
    contextLenInput.value = preset.seq;
    contextLenVal.textContent = preset.seq.toLocaleString();
    gpuSelect.value = preset.gpu;

    addChatMessage(`[서비스 최적화] ${preset.desc} 권장 사양으로 자동 설정되었습니다.`, 'bot');

    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

// KV Cache 구조 테이블: params(B) -> layers × kvHeads × headDim (공개 모델 구성 기준 근사)
// 1B(16×8×64) 3B(28×8×128) 8B(32×8×128) 14.7B(48×8×128) 32.5B(64×8×128) 70B(80×8×128) 405B(126×8×128)
const KV_ELEMS = [[1, 8192], [3, 28672], [8, 32768], [14.7, 49152], [32.5, 65536], [70, 81920], [405, 129024]];

function kvElems(paramsB) {
    const p = Math.min(Math.max(paramsB, KV_ELEMS[0][0]), KV_ELEMS[KV_ELEMS.length - 1][0]);
    for (let i = 1; i < KV_ELEMS.length; i++) {
        const [p0, e0] = KV_ELEMS[i - 1];
        const [p1, e1] = KV_ELEMS[i];
        if (p <= p1) {
            const t = (Math.log(p) - Math.log(p0)) / (Math.log(p1) - Math.log(p0));
            return e0 + (e1 - e0) * t;
        }
    }
    return KV_ELEMS[KV_ELEMS.length - 1][1];
}

// 입력값 파싱: 0도 유효한 값으로 취급 (빈 값/NaN만 기본값으로 대체)
function readNum(el, def) {
    const v = el ? parseFloat(el.value) : NaN;
    return Number.isFinite(v) ? v : def;
}

function calculate() {
    try {
        const gpuName = gpuSelect.value;
        const gpuCount = Math.max(1, parseInt(gpuCountInput.value) || 1);
        let vram, bandwidth;

        if (gpuName === 'custom_hw') {
            vram = readNum(customVramInput, 0);
            bandwidth = readNum(customBandwidthInput, 0);
        } else {
            const gpu = GPU_SPECS[gpuName];
            if (!gpu) return;
            vram = gpu.vram;
            bandwidth = gpu.bandwidth;
        }

        const paramsB = readNum(modelSizeInput, 0);
        if (paramsB <= 0) return;
        const bits = parseInt(quantizationSelect.value) || 16;
        const seqLen = Math.max(1, readNum(contextLenInput, 1024));

        // Calibration Values from UI
        const systemReserve = readNum(sysReserveInput, 2.0);
        const efficiencyFactor = readNum(effFactorInput, 0.7);
        const kvSafety = Math.max(1, readNum(kvSafetyInput, 1.1));
        const kvBytes = readNum(kvBytesInput, 2);
        const targetTps = Math.max(1, readNum(targetTpsInput, 20));
        const parEff = Math.min(1, Math.max(0.1, readNum(parEffInput, 0.85)));

        const frameworkOverhead = 1.5;

        // Unified Memory (UM): GPU가 쓸 수 있는 비율 제한 + 대역폭 경쟁 (가정치)
        let effectiveEfficiency = efficiencyFactor;
        let umSystemReserve = systemReserve;
        let usableRatio = 1.0;
        const isUM = UM_USABLE_RATIO[gpuName] !== undefined;
        if (isUM) {
            usableRatio = UM_USABLE_RATIO[gpuName];
            effectiveEfficiency *= 0.85;
            if (systemReserve < 4.0) umSystemReserve = systemReserve + 1.0;
        }

        const rawVram = vram * gpuCount;
        const totalVram = rawVram * usableRatio;
        // 멀티 GPU: 대역폭은 병렬 효율을 곱해 합산 (텐서 병렬 가정)
        const totalBandwidth = bandwidth * gpuCount * (gpuCount > 1 ? parEff : 1);

        // 1. Memory
        const weightFactor = bits === 4 ? 1.1 : 1.0; // INT4 그룹 스케일/비양자화 레이어 보정 (가정치)
        const weightMem = paramsB * (bits / 8) * weightFactor;
        const kvPerToken = 2 * kvElems(paramsB) * kvBytes; // bytes
        const kvCacheOneUser = kvSafety * kvPerToken * seqLen / 1e9;
        const totalNeededOneUser = weightMem + kvCacheOneUser + frameworkOverhead;

        // 2. Concurrency (메모리 기준 / 속도 기준 중 작은 값)
        const availableForKv = totalVram - weightMem - umSystemReserve - frameworkOverhead;
        const maxByMemory = availableForKv > 0 && kvCacheOneUser > 0 ? Math.floor(availableForKv / kvCacheOneUser) : 0;

        // 3. Throughput: 한 스텝에 가중치 1회 + 모든 사용자 KV를 읽고, 사용자당 1토큰 생성
        const bwEff = totalBandwidth * effectiveEfficiency;
        const speedAvail = bwEff / targetTps - weightMem;
        const maxBySpeed = speedAvail > 0 && kvCacheOneUser > 0 ? Math.floor(speedAvail / kvCacheOneUser) : 0;
        const maxConcurrency = Math.min(maxByMemory, maxBySpeed);

        const nForTps = Math.max(1, maxConcurrency);
        const tpsPerUser = bwEff / (weightMem + nForTps * kvCacheOneUser);
        const actualTpsTotal = tpsPerUser * nForTps;
        const singleSessionTps = bwEff / (weightMem + kvCacheOneUser);

        // Update UI
        if (totalVramEl) totalVramEl.textContent = `${totalNeededOneUser.toFixed(2)} GB`;
        if (maxConcurrencyEl) maxConcurrencyEl.textContent = `${maxConcurrency} sessions`;
        if (totalTpsEl) totalTpsEl.textContent = `${actualTpsTotal.toFixed(1)} TPS`;
        if (userTpsEl) userTpsEl.textContent = `${tpsPerUser.toFixed(1)} TPS`;

        updateStatus({
            needed: totalNeededOneUser, available: totalVram, concurrency: maxConcurrency,
            maxByMemory, maxBySpeed, targetTps, singleSessionTps, count: gpuCount, isUM, usableRatio
        });
        updateChart(weightMem, kvCacheOneUser * nForTps, frameworkOverhead + umSystemReserve, totalVram, nForTps);
    } catch (e) {
        console.error("Calculation Error:", e);
    }
}

function updateStatus(s) {
    statusIndicator.className = 'status-indicator';
    const clusterText = s.count > 1 ? ` (${s.count} Nodes Cluster)` : '';
    const umNote = s.isUM ? ` [UM 특성 반영: 사용 가능 ${Math.round(s.usableRatio * 100)}%]` : '';

    if (s.needed > s.available) {
        statusIndicator.classList.add('error');
        statusText.textContent = 'OOM (Out of Memory)';
        statusMsg.textContent = `선택한 모델이 사용 가능 메모리(${s.available.toFixed(1)}GB)${clusterText}를 초과합니다. 양자화 비트를 낮추거나 노드 수를 늘리세요.${umNote}`;
    } else if (s.maxByMemory === 0) {
        statusIndicator.classList.add('warn');
        statusText.textContent = 'Single Session Only';
        statusMsg.textContent = `모델 로드는 가능하나, 대화 문맥(KV Cache)을 유지하며 다수 사용자를 수용할 메모리가 부족합니다.${umNote}`;
    } else if (s.maxBySpeed === 0) {
        statusIndicator.classList.add('warn');
        statusText.textContent = 'Below Target TPS';
        statusMsg.textContent = `메모리는 충분하나 1인 단일 세션도 약 ${s.singleSessionTps.toFixed(1)} TPS로 목표(${s.targetTps} TPS)에 못 미칩니다. 대역폭이 더 높은 장비나 더 작은/압축된 모델이 필요합니다.${umNote}`;
    } else {
        statusIndicator.classList.add('ok');
        statusText.textContent = s.count > 1 ? 'Cluster Ready' : 'Deployment Ready';
        const limiter = s.maxBySpeed < s.maxByMemory ? `속도 기준(메모리 기준 ${s.maxByMemory}명)` : `메모리 기준(속도 기준 ${s.maxBySpeed}명)`;
        statusMsg.textContent = `현재 ${s.count}대 구성으로 1인 ${s.targetTps} TPS 이상을 유지하며 ${s.concurrency}명을 동시 수용할 수 있습니다. 한계 요인: ${limiter}.${umNote}`;
    }
}

function updateChart(w, kvAll, o, total, n) {
    const free = Math.max(0, total - w - kvAll - o);
    vramChart.data.labels = ['Weights', `KV Cache (${n}명 분)`, 'Overhead/Reserve', 'Free'];
    vramChart.data.datasets[0].data = [w, kvAll, o, free];
    vramChart.update();
}

function handleChat() {
    const input = document.getElementById('userInput');
    const text = input.value.trim().toLowerCase();
    if (!text) return;

    addChatMessage(input.value, 'user');
    input.value = '';

    setTimeout(() => {
        let response = "질문 주신 에이전트 서비스에 대해 분석 중입니다. 위 대시보드의 설정값을 조정하며 실시간 지표를 확인해 보세요.";

        if (text.includes("코드 분석") || text.includes("analyzer")) {
            response = "코드 분석 에이전트는 전체 파일을 읽어야 하므로 **Context Length**가 가장 중요합니다. 32k 이상을 설정하고, 정확도를 위해 14B 이상의 모델을 추천합니다.";
        } else if (text.includes("리팩토링") || text.includes("refactor")) {
            response = "리팩토링은 고도화된 논리력이 필요하므로 **Model Size(Parameters)**가 최소 70B(예: Llama-3 70B)는 되어야 안정적인 코드를 생성합니다.";
        } else if (text.includes("주석") || text.includes("comment")) {
            response = "단순 주석 생성은 속도가 생명입니다. 8B급 모델을 4-bit 양자화로 사용하면 가장 쾌적한 TPS를 얻을 수 있습니다.";
        } else if (text.includes("테스트") || text.includes("scenario")) {
            response = "테스트 케이스 생성은 중간급 지능(14B~20B)이 적절합니다. 너무 작은 모델은 엣지 케이스를 놓칠 수 있습니다.";
        } else if (text.includes("tps") || text.includes("속도")) {
            response = "TPS는 생성 속도입니다. 15 TPS는 사람이 읽는 속도와 비슷하고, 30 TPS 이상이면 매우 빠르다고 느낍니다. 에이전트 서비스라면 20 TPS 이상 유지를 권장합니다.";
        }

        addChatMessage(response, 'bot');
    }, 600);
}

function addChatMessage(text, sender) {
    const msg = document.createElement('div');
    msg.className = `chat-message ${sender}`;
    msg.textContent = text;
    const container = document.getElementById('chatContainer');
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}
