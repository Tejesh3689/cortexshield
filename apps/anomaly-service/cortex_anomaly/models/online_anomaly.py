from river import anomaly
import pickle

PER_TENANT_MODEL_MIN_SAMPLES = 100

class TenantModelStore:
    def __init__(self):
        self.models = {}
        self.counts = {}
        
    def get_model(self, tenant_id: str):
        if tenant_id not in self.models:
            self.models[tenant_id] = anomaly.HalfSpaceTrees(seed=42)
            self.counts[tenant_id] = 0
        return self.models[tenant_id]

    def observe(self, tenant_id: str, features: dict):
        model = self.get_model(tenant_id)
        model.learn_one(features)
        self.counts[tenant_id] += 1

    def score(self, tenant_id: str, features: dict) -> float:
        if self.counts.get(tenant_id, 0) < PER_TENANT_MODEL_MIN_SAMPLES:
            # Fall back to global prior if not enough samples
            from .global_prior import score_global
            return score_global(list(features.values()))
            
        model = self.get_model(tenant_id)
        # river returns anomaly score between 0 and 1
        return model.score_one(features)

_store = TenantModelStore()

def get_tenant_store():
    return _store
