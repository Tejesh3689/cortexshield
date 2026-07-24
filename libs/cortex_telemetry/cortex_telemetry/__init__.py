import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

def setup_telemetry(service_name: str):
    """Initializes OpenTelemetry Tracer Provider and Exporter."""
    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)
    
    # We expect Tempo to be running on 4317
    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
    exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
    
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    
    return trace.get_tracer(service_name)

def inject_nats_context(headers: dict):
    """Injects current Trace Context into NATS headers for cross-service propagation."""
    propagator = TraceContextTextMapPropagator()
    propagator.inject(carrier=headers)
    return headers

def extract_nats_context(headers: dict):
    """Extracts Trace Context from NATS headers."""
    propagator = TraceContextTextMapPropagator()
    return propagator.extract(carrier=headers)
