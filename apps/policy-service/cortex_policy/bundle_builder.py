import os
import json
import tarfile
import hashlib
from .database import get_all_overrides

BUNDLE_DIR = os.getenv("BUNDLE_DIR", "/tmp/opa_bundle")
POLICIES_DIR = os.getenv("POLICIES_DIR", os.path.join(os.path.dirname(__file__), "..", "policies"))

os.makedirs(BUNDLE_DIR, exist_ok=True)

_last_hash = None

async def build_bundle_if_changed() -> bool:
    global _last_hash
    overrides = await get_all_overrides()
    
    current_hash = hashlib.sha256(json.dumps(overrides, sort_keys=True).encode()).hexdigest()
    if current_hash == _last_hash:
        return False
        
    _last_hash = current_hash
    
    data_content = {
        "tenant_overrides": overrides["thresholds"],
        "tenant_egress_overrides": overrides["egress"]
    }
    
    with open(os.path.join(POLICIES_DIR, "data.json"), "w") as f:
        json.dump(data_content, f)
        
    bundle_path = os.path.join(BUNDLE_DIR, "bundle.tar.gz")
    with tarfile.open(bundle_path, "w:gz") as tar:
        for root, _, files in os.walk(POLICIES_DIR):
            for file in files:
                if file.endswith(".rego") or file == "data.json":
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, POLICIES_DIR)
                    tar.add(file_path, arcname=arcname)
                    
    return True
