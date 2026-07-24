package cortexshield.tenant_egress_overrides

# Returns "hard-fail" if no override is set in data.json
get_override(tenant_id) = override {
    override := data.tenant_egress_overrides[tenant_id]
} else = "hard-fail"
