package cortexshield.tenant_overrides

import data.cortexshield.trust_thresholds.default_threshold

get_threshold(tenant_id) = threshold {
    threshold := data.tenant_overrides[tenant_id]
} else = default_threshold
