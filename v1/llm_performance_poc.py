import math

# params(B) -> layers x kv_heads x head_dim (공개 모델 구성 기준 근사). app.js의 KV_ELEMS와 동일.
KV_ELEMS = [(1, 8192), (3, 28672), (8, 32768), (14.7, 49152), (32.5, 65536), (70, 81920), (405, 129024)]


def kv_elems(params_b):
    p = min(max(params_b, KV_ELEMS[0][0]), KV_ELEMS[-1][0])
    for (p0, e0), (p1, e1) in zip(KV_ELEMS, KV_ELEMS[1:]):
        if p <= p1:
            t = (math.log(p) - math.log(p0)) / (math.log(p1) - math.log(p0))
            return e0 + (e1 - e0) * t
    return KV_ELEMS[-1][1]


class LLMPerformanceCalculator:
    def __init__(self):
        # Sample GPU Data (대역폭 GB/s)
        self.gpu_specs = {
            "RTX 3090": {"vram": 24, "bandwidth": 936},
            "RTX 4090": {"vram": 24, "bandwidth": 1008},
            "A100_80GB": {"vram": 80, "bandwidth": 2039},
            "H100_SXM": {"vram": 80, "bandwidth": 3352},
        }

        # Sample Correction Factors (η and C) — 실측으로 보정해야 하는 가정치
        self.calibration = {
            "default": {"efficiency": 0.7, "vram_overhead": 1.5, "kv_safety": 1.1}
        }

    def estimate_performance(self, gpu_name, model_params_b, quantization_bits, seq_len=1024,
                             system_reserve=2.0, kv_bytes=2, target_tps=20, gpu_count=1, par_eff=0.85):
        if gpu_name not in self.gpu_specs:
            return "GPU not found in registry."

        gpu = self.gpu_specs[gpu_name]
        cal = self.calibration["default"]

        total_vram = gpu["vram"] * gpu_count
        total_bw = gpu["bandwidth"] * gpu_count * (par_eff if gpu_count > 1 else 1)

        # 1. VRAM Estimation
        weight_factor = 1.1 if quantization_bits == 4 else 1.0  # INT4 스케일 등 (가정치)
        weight_memory = model_params_b * (quantization_bits / 8) * weight_factor
        # KV Cache: 2(K,V) x layers x kv_heads x head_dim x bytes x tokens
        kv_cache_one_user = cal["kv_safety"] * 2 * kv_elems(model_params_b) * kv_bytes * seq_len / 1e9

        total_vram_needed = weight_memory + kv_cache_one_user + cal["vram_overhead"]
        vram_status = "OK" if total_vram_needed <= total_vram else "OOM Risk"

        # 2. Concurrency: 메모리 기준 / 속도 기준 중 작은 값
        available_for_kv = total_vram - weight_memory - system_reserve - cal["vram_overhead"]
        by_mem = int(available_for_kv // kv_cache_one_user) if available_for_kv > 0 and kv_cache_one_user > 0 else 0

        bw_eff = total_bw * cal["efficiency"]
        speed_avail = bw_eff / target_tps - weight_memory
        by_speed = int(speed_avail // kv_cache_one_user) if speed_avail > 0 and kv_cache_one_user > 0 else 0
        max_concurrency = min(by_mem, by_speed)

        # 3. Throughput: 스텝당 가중치 1회 + 모든 사용자 KV를 읽고, 사용자마다 1토큰 생성
        n = max(1, max_concurrency)
        tps_per_user = bw_eff / (weight_memory + n * kv_cache_one_user)
        total_actual_tps = tps_per_user * n

        return {
            "GPU": gpu_name,
            "Model": f"{model_params_b}B ({quantization_bits}-bit)",
            "VRAM Needed": f"{total_vram_needed:.2f} GB",
            "Max Concurrency": f"{max_concurrency} sessions (mem {by_mem} / speed {by_speed})",
            "Total TPS": f"{total_actual_tps:.1f}",
            "TPS/User": f"{tps_per_user:.1f}",
            "Status": vram_status,
        }


# Example Usage
if __name__ == "__main__":
    calc = LLMPerformanceCalculator()

    scenarios = [
        ("RTX 3090", 8, 16, 8192),    # Llama-3 8B FP16, 8k Context
        ("RTX 4090", 8, 4, 32768),    # Llama-3 8B 4-bit, 32k Context
        ("A100_80GB", 70, 4, 8192),   # Llama-3 70B 4-bit, 8k Context
        ("H100_SXM", 70, 8, 16384),   # Llama-3 70B 8-bit, 16k Context
    ]

    print(f"{'GPU':<12} | {'Model':<15} | {'VRAM Req':<10} | {'Concurrency':<34} | {'TPS (Tot/User)'}")
    print("-" * 100)
    for gpu, p, q, s in scenarios:
        res = calc.estimate_performance(gpu, p, q, s)
        if isinstance(res, dict):
            print(f"{res['GPU']:<12} | {res['Model']:<15} | {res['VRAM Needed']:<10} | {res['Max Concurrency']:<34} | {res['Total TPS']:>5} / {res['TPS/User']:<5}")
        else:
            print(res)
