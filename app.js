// GPU Specifications
const GPU_SPECS = {
    "RTX 4090": { vram: 24, bandwidth: 1008 },
    "RTX 3090": { vram: 24, bandwidth: 936 },
    "A100_80GB": { vram: 80, bandwidth: 2039 },
    "H100_SXM": { vram: 80, bandwidth: 3352 }
};

// Presets Configuration
const AGENT_PRESETS = {
    "chatbot": { params: 8, bits: 4, seq: 8192, gpu: "RTX 4090", desc: "일상적인 대화를 위한Balanced 설정입니다." },
    "test_gen": { params: 14, bits: 4, seq: 16384, gpu: "RTX 4090", desc: "복잡한 시나리오 생성을 위한 Logic-heavy 설정입니다." },
    "code_commenter": { params: 7, bits: 4, seq: 4096, gpu: "RTX 3090", desc: "빠른 코드 주석 생성을 위한 Fast-Inference 설정입니다." },
    "code_analyzer": { params: 14, bits: 4, seq: 32768, gpu: "A100_80GB", desc: "대규모 코드 분석을 위한 Long-Context 설정입니다." },
    "refactor_expert": { params: 70, bits: 4, seq: 8192, gpu: "A100_80GB", desc: "고수준 리팩토링을 위한 High-Intelligence 설정입니다." }
};

// State
let vramChart = null;

// DOM Elements
const gpuSelect = document.getElementById('gpuSelect');
const modelSizeInput = document.getElementById('modelSize');
const quantizationSelect = document.getElementById('quantization');
const contextLenInput = document.getElementById('contextLen');
const contextLenVal = document.getElementById('contextLenVal');
const agentPreset = document.getElementById('agentPreset');

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
    [agentPreset, gpuSelect, modelSizeInput, quantizationSelect, contextLenInput].forEach(el => {
        el.addEventListener('input', () => {
            if (el === contextLenInput) {
                contextLenVal.textContent = parseInt(el.value).toLocaleString();
            }
            if (el === agentPreset) {
                handlePresetChange();
            } else if (el !== agentPreset) {
                agentPreset.value = "custom";
            }
            calculate();
        });
    });

    document.getElementById('sendBtn').addEventListener('click', handleChat);
    document.getElementById('userInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChat();
    });
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
}

function calculate() {
    const gpuName = gpuSelect.value;
    const gpu = GPU_SPECS[gpuName];
    const paramsB = parseFloat(modelSizeInput.value);
    const bits = parseInt(quantizationSelect.value);
    const seqLen = parseInt(contextLenInput.value);
    const systemReserve = 2.0;
    const frameworkOverhead = 1.5;

    // 1. Memory
    const weightMem = paramsB * (bits / 8);
    const kvCacheOneUser = 1.2 * (paramsB / 8) * (seqLen / 8192);
    const totalNeededOneUser = weightMem + kvCacheOneUser + frameworkOverhead;

    // 2. Concurrency
    const availableForKv = gpu.vram - weightMem - systemReserve - frameworkOverhead;
    const maxConcurrency = availableForKv > 0 ? Math.floor(availableForKv / kvCacheOneUser) : 0;

    // 3. Throughput
    const theoreticalTps = gpu.bandwidth / weightMem;
    const actualTpsTotal = theoreticalTps * 0.7; // 70% efficiency
    const tpsPerUser = maxConcurrency > 0 ? actualTpsTotal / maxConcurrency : actualTpsTotal;

    // Update UI
    totalVramEl.textContent = `${totalNeededOneUser.toFixed(2)} GB`;
    maxConcurrencyEl.textContent = `${maxConcurrency} sessions`;
    totalTpsEl.textContent = `${actualTpsTotal.toFixed(1)} TPS`;
    userTpsEl.textContent = `${tpsPerUser.toFixed(1)} TPS`;

    updateStatus(totalNeededOneUser, gpu.vram, maxConcurrency);
    updateChart(weightMem, kvCacheOneUser, frameworkOverhead, gpu.vram);
}

function updateStatus(needed, available, concurrency) {
    statusIndicator.className = 'status-indicator';
    if (needed > available) {
        statusIndicator.classList.add('error');
        statusText.textContent = 'OOM (Out of Memory)';
        statusMsg.textContent = '선택한 모델이 GPU 메모리 용량을 초과합니다. 양자화 비트를 낮추거나 GPU를 변경하세요.';
    } else if (concurrency === 0) {
        statusIndicator.classList.add('warn');
        statusText.textContent = 'Single Session Only';
        statusMsg.textContent = '모델 로드는 가능하나, 대화 문맥(KV Cache)을 유지하며 다수 사용자를 수용할 메모리가 부족합니다.';
    } else {
        statusIndicator.classList.add('ok');
        statusText.textContent = 'Deployment Ready';
        statusMsg.textContent = `현재 설정으로 ${concurrency}명의 사용자를 동시에 안정적으로 수용할 수 있습니다.`;
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
