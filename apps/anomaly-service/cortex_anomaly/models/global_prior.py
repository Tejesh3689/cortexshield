from sklearn.ensemble import IsolationForest
import numpy as np
import pickle
import os

MODEL_PATH = os.getenv("GLOBAL_PRIOR_PATH", "/tmp/global_prior.pkl")

def train_global_prior():
    # Synthetic baseline of generic, safe tool calls
    # Features could be: [time_of_day, length_of_args, trust_score_context]
    # For simplicity, we just use a dummy feature set to initialize the forest
    X_train = np.random.normal(loc=0.5, scale=0.1, size=(1000, 3))
    
    clf = IsolationForest(random_state=42, contamination=0.01)
    clf.fit(X_train)
    
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(clf, f)

def get_global_prior():
    if not os.path.exists(MODEL_PATH):
        train_global_prior()
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)

def score_global(features: list) -> float:
    clf = get_global_prior()
    # sklearn returns -1 for anomaly, 1 for normal.
    # We want a score between 0.0 and 1.0 (1.0 being highly anomalous)
    decision = clf.decision_function([features])[0]
    # decision_function gives lower values (negative) for anomalies.
    # Normalize approx: -0.5 to 0.5 -> 0.0 to 1.0 reversed
    score = 0.5 - (decision * 2.0)
    return max(0.0, min(1.0, score))
