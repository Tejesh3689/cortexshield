package cortexshield.restricted_tools

restricted_set := {"send_webhook", "execute_shell_command", "drop_database_table", "export_pii"}

is_restricted[tool_name] {
    restricted_set[tool_name]
}
