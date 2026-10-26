import math

class LLMPerformanceCalculator:
    def __init__(self):
        # Sample GPU Data
        self.gpu_specs = {
            "RTX 3090": {"vram": 24, "bandwidth": 936, "tflops_fp16": 35.6},
            "RTX 4090": {"vram": 24, "bandwidth": 1008, "tflops_fp16": 82.6},
            "A100_80GB": {"vram": 80, "bandwidth": 2039, "tflops_fp16": 312.0},
            "H100_SXM": {"vram": 80, "bandwidth": 3352, "tflops_fp16": 989.0}
        }
        
        # Sample Correction Factors (η and C)
        # In a real service, these would be derived from a benchmark database
        self.calibration = {
            "default": {"efficiency": 0.7, "vram_overhead": 1.5} # 1.5GB base overhead
        }

    def estimate_performance(self, gpu_name, model_params_b, quantization_bits, seq_len=1024, system_reserve=2.0):
        if gpu_name not in self.gpu_specs:
            return "GPU not found in registry."
        
        gpu = self.gpu_specs[gpu_name]
        cal = self.calibration["default"]
        
        # 1. VRAM Estimation
        # Weight memory
        weight_memory = model_params_b * (quantization_bits / 8)
        
        # KV Cache estimation (GQA-aware heuristic)
        # Modern models (Llama-3, etc.) use GQA, roughly 1.2GB per 8B params per 8k tokens
        kv_cache_one_user = 1.2 * (model_params_b / 8) * (seq_len / 8192)
        
        # Total VRAM for 1st user
        total_vram_needed = (weight_memory + kv_cache_one_user) + cal["vram_overhead"]
        
        vram_status = "OK" if total_vram_needed <= gpu["vram"] else "OOM Risk"
        
        # 2. Concurrency Calculation
        available_for_kv = gpu["vram"] - weight_memory - system_reserve - cal["vram_overhead"]
        if available_for_kv < 0:
            max_concurrency = 0
        else:
            # How many users' KV caches can we fit in remaining space?
            max_concurrency = int(available_for_kv // kv_cache_one_user) if kv_cache_one_user > 0 else 0
        
        # 3. Throughput Estimation (TPS)
        theoretical_tps = gpu["bandwidth"] / (model_params_b * (quantization_bits / 8))
        total_actual_tps = theoretical_tps * cal["efficiency"]
        tps_per_user = total_actual_tps / max_concurrency if max_concurrency > 0 else total_actual_tps
        
        return {
            "GPU": gpu_name,
            "Model": f"{model_params_b}B ({quantization_bits}-bit)",
            "VRAM Needed": f"{total_vram_needed:.2f} GB",
            "Max Concurrency": f"{max_concurrency} sessions",
            "Total TPS": f"{total_actual_tps:.1f}",
            "TPS/User": f"{tps_per_user:.1f}",
            "Status": vram_status
        }

# Example Usage
if __name__ == "__main__":
    calc = LLMPerformanceCalculator()
    
    scenarios = [
        ("RTX 3090", 8, 16, 8192),    # Llama-3 8B FP16, 8k Context
        ("RTX 4090", 8, 4, 32768),    # Llama-3 8B 4-bit, 32k Context
        ("A100_80GB", 70, 4, 8192),   # Llama-3 70B 4-bit, 8k Context
        ("H100_SXM", 70, 8, 16384)    # Llama-3 70B 8-bit, 16k Context
    ]
    
    print(f"{'GPU':<12} | {'Model':<15} | {'VRAM Req':<10} | {'Concurrency':<12} | {'TPS (Tot/User)'}")
    print("-" * 75)
    for gpu, p, q, s in scenarios:
        res = calc.estimate_performance(gpu, p, q, s)
        if isinstance(res, dict):
            print(f"{res['GPU']:<12} | {res['Model']:<15} | {res['VRAM Needed']:<10} | {res['Max Concurrency']:<12} | {res['Total TPS']:>5} / {res['TPS/User']:<5}")
        else:
            print(res)
