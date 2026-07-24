package cortexshield

import data.cortexshield.restricted_tools
import data.cortexshield.tenant_overrides
import data.cortexshield.trust_thresholds

default allow = false
default reason = "Default deny"

# If the tool is not restricted, allow it.
allow {
    not restricted_tools.is_restricted[input.tool_name]
}

# If the tool is restricted, check trust score.
allow {
    restricted_tools.is_restricted[input.tool_name]
    input.context_trust >= tenant_overrides.get_threshold(input.tenant_id)
}

reason = "Allowed: tool is not restricted" {
    not restricted_tools.is_restricted[input.tool_name]
}

reason = "Allowed: trust score meets threshold for restricted tool" {
    restricted_tools.is_restricted[input.tool_name]
    input.context_trust >= tenant_overrides.get_threshold(input.tenant_id)
}

reason = "Denied: trust score too low for restricted tool" {
    restricted_tools.is_restricted[input.tool_name]
    input.context_trust < tenant_overrides.get_threshold(input.tenant_id)
}
