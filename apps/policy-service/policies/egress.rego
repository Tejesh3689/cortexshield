package cortexshield.egress

import data.cortexshield.tenant_egress_overrides

default action = "hard-fail"

action = "redact" {
    tenant_egress_overrides.get_override(input.tenant_id) == "redact"
}
