// GPU Specifications
const GPU_SPECS = {
    "RTX 4090": { vram: 24, bandwidth: 1008 },
    "RTX 3090": { vram: 24, bandwidth: 936 },
    "A100_80GB": { vram: 80, bandwidth: 2039 },
    "H100_SXM": { vram: 80, bandwidth: 3352 }
};

// State
let vramChart = null;

// DOM Elements
const gpuSelect = document.getElementById('gpuSelect');
const modelSizeInput = document.getElementById('modelSize');
const quantizationSelect = document.getElementById('quantization');
const contextLenInput = document.getElementById('contextLen');
const contextLenVal = document.getElementById('contextLenVal');

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
    [gpuSelect, modelSizeInput, quantizationSelect, contextLenInput].forEach(el => {
        el.addEventListener('input', () => {
            if (el === contextLenInput) {
                contextLenVal.textContent = parseInt(el.value).toLocaleString();
            }
            calculate();
        });
    });

    document.getElementById('sendBtn').addEventListener('click', handleChat);
    document.getElementById('userInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChat();
    });
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
        statusMsg.textContent = '모델 로드는 가능하나, 동시 요청을 처리할 여유 메모리가 부족합니다.';
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

// Simple Chat Bot Mockup
function handleChat() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text) return;

    addChatMessage(text, 'user');
    input.value = '';

    // Simple Guide Logic
    setTimeout(() => {
        let response = "죄송합니다. 아직 학습 중인 기능입니다. 모델 크기와 GPU를 선택해 보세요!";
        
        if (text.includes("추천") || text.includes("궁금")) {
            response = "일반적인 챗봇 에이전트라면 Llama-3 8B 모델을 INT4 양자화로 사용하는 것을 권장합니다. RTX 4090 한 대로도 약 8~10명의 동시 접속자를 처리할 수 있습니다.";
        } else if (text.includes("VRAM") || text.includes("메모리")) {
            response = "VRAM은 모델의 무게와 대화의 길이(KV Cache)에 의해 결정됩니다. 대화가 길어질수록 메모리 사용량이 선형적으로 증가하니 주의하세요.";
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
