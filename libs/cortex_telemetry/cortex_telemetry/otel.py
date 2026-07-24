import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

def setup_otel(service_name: str):
    """
    Sets up OpenTelemetry tracing for the given service.
    Expects OTEL_EXPORTER_OTLP_ENDPOINT to be present in the environment.
    """
    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)

    # Standard OTLP Exporter (will read endpoint from OTEL_EXPORTER_OTLP_ENDPOINT)
    otlp_exporter = OTLPSpanExporter()
    processor = BatchSpanProcessor(otlp_exporter)
    provider.add_span_processor(processor)

    trace.set_tracer_provider(provider)
