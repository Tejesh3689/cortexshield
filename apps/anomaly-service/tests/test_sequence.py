import pytest
from cortex_anomaly.models.markov_sequence import get_markov_model

def test_tc3_sequence_attack():
    """
    Simulate a known anomalous sequence:
    read_env_secrets -> query_user_db -> send_webhook
    
    We simulate training a tenant model on normal behavior, then executing the attack.
    """
    markov = get_markov_model()
    tenant = "tenant_test"
    
    # Train normal behaviors
    # Agent usually does: query_user_db -> analyze_data -> respond
    for _ in range(50):
        markov.observe_transition(tenant, "query_user_db", "analyze_data")
        markov.observe_transition(tenant, "analyze_data", "respond")
        
    # Agent usually does: read_env_secrets -> configure_client
    for _ in range(20):
        markov.observe_transition(tenant, "read_env_secrets", "configure_client")
        
    # Attack Sequence Step 1: read_env_secrets -> query_user_db
    # This transition has never been seen.
    score_step1 = markov.get_sequence_score(tenant, "read_env_secrets", "query_user_db")
    assert score_step1 == 1.0 # Highly anomalous
    
    # Update model (attacker pushes through)
    markov.observe_transition(tenant, "read_env_secrets", "query_user_db")
    
    # Attack Sequence Step 2: query_user_db -> send_webhook
    # Also never seen.
    score_step2 = markov.get_sequence_score(tenant, "query_user_db", "send_webhook")
    assert score_step2 == 1.0 # Highly anomalous
    
def test_isolated_calls():
    """
    Feeding the same three calls in isolation across unrelated sessions does not trigger a flag.
    """
    markov = get_markov_model()
    tenant = "tenant_test2"
    
    # Same training
    for _ in range(50):
        markov.observe_transition(tenant, "query_user_db", "analyze_data")
        
    # Isolated call 1: New session (last_tool is None) -> read_env_secrets
    score1 = markov.get_sequence_score(tenant, None, "read_env_secrets")
    assert score1 == 0.0 # First call in session is never a sequence anomaly
    
    # Isolated call 2: New session -> query_user_db
    score2 = markov.get_sequence_score(tenant, None, "query_user_db")
    assert score2 == 0.0
