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
    [agentPreset, gpuSelect, gpuCountInput, customVramInput, customBandwidthInput, modelSizeInput, quantizationSelect, contextLenInput, effFactorInput, sysReserveInput, kvSafetyInput].forEach(el => {
        el.addEventListener('input', () => {
            if (el === contextLenInput) {
                contextLenVal.textContent = parseInt(el.value).toLocaleString();
            }
            if (el === gpuCountInput) {
                gpuCountVal.textContent = el.value;
            }
            if (el === agentPreset) {
                handlePresetChange();
            } else if (el !== agentPreset && el !== customVramInput && el !== customBandwidthInput) {
                agentPreset.value = "custom";
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

function calculate() {
    try {
        const gpuName = gpuSelect.value;
        const gpuCount = parseInt(gpuCountInput.value) || 1;
        let vram, bandwidth;

        if (gpuName === 'custom_hw') {
            vram = parseFloat(customVramInput.value) || 0;
            bandwidth = parseFloat(customBandwidthInput.value) || 0;
        } else {
            const gpu = GPU_SPECS[gpuName];
            if (!gpu) return;
            vram = gpu.vram;
            bandwidth = gpu.bandwidth;
        }

        const totalVram = vram * gpuCount;
        const totalBandwidth = bandwidth * gpuCount;

        const paramsB = parseFloat(modelSizeInput.value) || 0;
        const bits = parseInt(quantizationSelect.value) || 16;
        const seqLen = parseInt(contextLenInput.value) || 1024;

        // Calibration Values from UI
        const systemReserve = parseFloat(sysReserveInput.value) || 2.0;
        const efficiencyFactor = parseFloat(effFactorInput.value) || 0.7;
        const kvSafety = parseFloat(kvSafetyInput.value) || 1.2;

        const frameworkOverhead = 1.5;

        // 1. Memory
        const weightMem = paramsB * (bits / 8);
        const kvCacheOneUser = kvSafety * (paramsB / 8) * (seqLen / 8192);
        const totalNeededOneUser = weightMem + kvCacheOneUser + frameworkOverhead;

        // 2. Concurrency
        const availableForKv = totalVram - weightMem - systemReserve - frameworkOverhead;
        const maxConcurrency = availableForKv > 0 ? (kvCacheOneUser > 0 ? Math.floor(availableForKv / kvCacheOneUser) : 0) : 0;

        // 3. Throughput
        const weightSizeForTps = weightMem > 0 ? weightMem : 0.001; // Avoid div by zero
        const theoreticalTps = totalBandwidth / weightSizeForTps;
        const actualTpsTotal = theoreticalTps * efficiencyFactor;
        const tpsPerUser = maxConcurrency > 0 ? actualTpsTotal / maxConcurrency : actualTpsTotal;

        // Update UI
        if (totalVramEl) totalVramEl.textContent = `${totalNeededOneUser.toFixed(2)} GB`;
        if (maxConcurrencyEl) maxConcurrencyEl.textContent = `${maxConcurrency} sessions`;
        if (totalTpsEl) totalTpsEl.textContent = `${actualTpsTotal.toFixed(1)} TPS`;
        if (userTpsEl) userTpsEl.textContent = `${tpsPerUser.toFixed(1)} TPS`;

        updateStatus(totalNeededOneUser, totalVram, maxConcurrency, gpuCount);
        updateChart(weightMem, kvCacheOneUser, frameworkOverhead, totalVram);
    } catch (e) {
        console.error("Calculation Error:", e);
    }
}

function updateStatus(needed, available, concurrency, count) {
    statusIndicator.className = 'status-indicator';
    const clusterText = count > 1 ? ` (${count} Nodes Cluster)` : '';

    if (needed > available) {
        statusIndicator.classList.add('error');
        statusText.textContent = 'OOM (Out of Memory)';
        statusMsg.textContent = `선택한 모델이 총 가용 메모리(${available.toFixed(1)}GB)${clusterText}를 초과합니다. 양자화 비트를 낮추거나 노드 수를 늘리세요.`;
    } else if (concurrency === 0) {
        statusIndicator.classList.add('warn');
        statusText.textContent = 'Single Session Only';
        statusMsg.textContent = '모델 로드는 가능하나, 대화 문맥(KV Cache)을 유지하며 다수 사용자를 수용할 메모리가 부족합니다.';
    } else {
        statusIndicator.classList.add('ok');
        statusText.textContent = count > 1 ? 'Cluster Ready' : 'Deployment Ready';
        statusMsg.textContent = `현재 ${count}대 장비 구성으로 ${concurrency}명의 사용자를 동시에 안정적으로 수용할 수 있습니다.`;
    }
}

function updateChart(w, k, o, total) {
    const free = Math.max(0, total - w - k - o);
    vramChart.data.datasets[0].data = [w, k, o, free];
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
