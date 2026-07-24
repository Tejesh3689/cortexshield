import pytest
import asyncio
import time
import httpx

# These constants assume we have a PRO tenant on the shared container
# and an ENTERPRISE tenant on its dedicated container.
PROXY_URL = "http://localhost:8000/jsonrpc"
PRO_TENANT = "pro_tenant_1"
ENT_TENANT = "ent_tenant_1"

async def fire_memory_write(tenant_id, i):
    async with httpx.AsyncClient() as client:
        payload = {
            "jsonrpc": "2.0", "id": i, "method": "add_memory",
            "params": {"tenant_id": tenant_id, "subject": f"Subj_{i}", "predicate": "is", "object": "Obj"}
        }
        await client.post(PROXY_URL, json=payload)

async def measure_read_latency(tenant_id):
    start = time.perf_counter()
    async with httpx.AsyncClient() as client:
        payload = {
            "jsonrpc": "2.0", "id": 1, "method": "read_memory",
            "params": {"tenant_id": tenant_id, "subject": "Alice"}
        }
        await client.post(PROXY_URL, json=payload)
    return time.perf_counter() - start

@pytest.mark.asyncio
async def test_container_isolation_latency():
    """
    Proves that a heavy CPU load on the shared PRO container does not starve 
    the dedicated ENTERPRISE container, thanks to Docker cgroup CPU limits.
    """
    
    # 1. Baseline latency for Enterprise
    baseline_latencies = [await measure_read_latency(ENT_TENANT) for _ in range(10)]
    baseline_p99 = sorted(baseline_latencies)[int(len(baseline_latencies)*0.9)]
    
    # 2. Fire 500 concurrent writes to the PRO tenant (heavy load on shared container)
    # Start the spam task
    spam_task = asyncio.create_task(
        asyncio.gather(*[fire_memory_write(PRO_TENANT, i) for i in range(500)])
    )
    
    # Allow spam to begin saturating CPU
    await asyncio.sleep(0.5)
    
    # 3. Measure Enterprise latency while the shared container is under heavy load
    load_latencies = [await measure_read_latency(ENT_TENANT) for _ in range(10)]
    load_p99 = sorted(load_latencies)[int(len(load_latencies)*0.9)]
    
    # Wait for spam to finish
    await spam_task
    
    print(f"Enterprise Baseline P90: {baseline_p99:.4f}s")
    print(f"Enterprise Under-Load P90: {load_p99:.4f}s")
    
    # 4. Assert isolation: P99 under load should not degrade by more than 20%
    # If they shared a container without limits, this would spike by 500%+ due to JVM starvation
    assert load_p99 <= (baseline_p99 * 1.20), f"Latency spiked by {(load_p99/baseline_p99)*100:.1f}%, isolation failed!"
