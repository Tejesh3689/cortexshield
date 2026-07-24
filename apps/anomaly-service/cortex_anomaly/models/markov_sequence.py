from collections import defaultdict

class MarkovSequenceModel:
    def __init__(self):
        # tenant_id -> { tool_from -> { tool_to -> count } }
        self.transitions = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
        # tenant_id -> { tool_from -> total_outbound_transitions }
        self.totals = defaultdict(lambda: defaultdict(int))
        
    def observe_transition(self, tenant_id: str, tool_from: str, tool_to: str):
        if tool_from is None:
            return # First call in session
        self.transitions[tenant_id][tool_from][tool_to] += 1
        self.totals[tenant_id][tool_from] += 1
        
    def get_sequence_score(self, tenant_id: str, tool_from: str, tool_to: str) -> float:
        if tool_from is None:
            return 0.0 # No sequence context yet
            
        total = self.totals[tenant_id][tool_from]
        if total == 0:
            # Never seen this state before -> highly anomalous transition
            return 1.0
            
        count = self.transitions[tenant_id][tool_from][tool_to]
        probability = count / total
        
        # Anomaly score is inverse of probability
        return 1.0 - probability

_markov = MarkovSequenceModel()

def get_markov_model():
    return _markov
