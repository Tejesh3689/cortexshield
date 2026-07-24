import mlflow
import os

# MLflow tracking URI for local development
MLFLOW_URI = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlruns.db")

def init_mlflow():
    mlflow.set_tracking_uri(MLFLOW_URI)
    mlflow.set_experiment("cortex_anomaly")

def log_global_prior(model):
    """
    Logs the sklearn global prior to MLflow.
    Note: For River models and dict-based Markov models, we serialize to custom artifacts.
    """
    with mlflow.start_run(run_name="global_prior_update"):
        import mlflow.sklearn
        mlflow.sklearn.log_model(model, "global_prior_isolation_forest")
