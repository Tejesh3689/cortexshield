const fs = require('fs');
const path = require('path');

const rootDir = "D:\\cortexshield";

const files = {
    // =========================================================================
    // 1. PROXY ENGINE CHART (Standard CPU HPA)
    // =========================================================================
    "infra/k8s/helm/proxy-engine/Chart.yaml": `apiVersion: v2
name: proxy-engine
description: CortexShield API Gateway
version: 0.1.0
`,
    "infra/k8s/helm/proxy-engine/values.yaml": `
replicaCount: 2
image:
  repository: cortexshield/proxy-engine
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8000

env:
  SERVICE_NAME: proxy-engine
  LOG_LEVEL: info

resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "1000m"
    memory: "512Mi"

hpa:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
`,
    "infra/k8s/helm/proxy-engine/templates/deployment.yaml": `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-proxy-engine
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: proxy-engine
  template:
    metadata:
      labels:
        app: proxy-engine
    spec:
      containers:
        - name: proxy-engine
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.port }}
          envFrom:
            - configMapRef:
                name: {{ .Release.Name }}-proxy-engine-config
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
`,
    "infra/k8s/helm/proxy-engine/templates/service.yaml": `
apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}-proxy-engine
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.port }}
      protocol: TCP
  selector:
    app: proxy-engine
`,
    "infra/k8s/helm/proxy-engine/templates/configmap.yaml": `
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-proxy-engine-config
data:
  {{- range $key, $val := .Values.env }}
  {{ $key }}: {{ $val | quote }}
  {{- end }}
`,
    "infra/k8s/helm/proxy-engine/templates/hpa.yaml": `
{{- if .Values.hpa.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ .Release.Name }}-proxy-engine
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ .Release.Name }}-proxy-engine
  minReplicas: {{ .Values.hpa.minReplicas }}
  maxReplicas: {{ .Values.hpa.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.hpa.targetCPUUtilizationPercentage }}
{{- end }}
`,

    // =========================================================================
    // 2. HEALING WORKER CHART (KEDA NATS JetStream HPA)
    // =========================================================================
    "infra/k8s/helm/healing-worker/Chart.yaml": `apiVersion: v2
name: healing-worker
description: CortexShield Async Self-Healing Worker
version: 0.1.0
`,
    "infra/k8s/helm/healing-worker/values.yaml": `
replicaCount: 1
image:
  repository: cortexshield/healing-worker
  tag: latest

env:
  SERVICE_NAME: healing-worker
  NATS_STREAM_NAME: MEMORY_WRITES
  NATS_CONSUMER_NAME: healing-worker-consumer

keda:
  enabled: true
  minReplicaCount: 1
  maxReplicaCount: 20
  natsServerAddress: nats.internal.svc.cluster.local:4222
  stream: MEMORY_WRITES
  consumer: healing-worker-consumer
  lagThreshold: "50"
`,
    "infra/k8s/helm/healing-worker/templates/deployment.yaml": `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-healing-worker
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: healing-worker
  template:
    metadata:
      labels:
        app: healing-worker
    spec:
      containers:
        - name: healing-worker
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          envFrom:
            - configMapRef:
                name: {{ .Release.Name }}-healing-worker-config
`,
    "infra/k8s/helm/healing-worker/templates/configmap.yaml": `
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-healing-worker-config
data:
  {{- range $key, $val := .Values.env }}
  {{ $key }}: {{ $val | quote }}
  {{- end }}
`,
    "infra/k8s/helm/healing-worker/templates/scaledobject.yaml": `
{{- if .Values.keda.enabled }}
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: {{ .Release.Name }}-healing-worker-scaler
spec:
  scaleTargetRef:
    name: {{ .Release.Name }}-healing-worker
  minReplicaCount: {{ .Values.keda.minReplicaCount }}
  maxReplicaCount: {{ .Values.keda.maxReplicaCount }}
  triggers:
    - type: nats-jetstream
      metadata:
        natsServerMonitoringEndpoint: "{{ .Values.keda.natsServerAddress }}"
        stream: "{{ .Values.keda.stream }}"
        consumer: "{{ .Values.keda.consumer }}"
        lagThreshold: "{{ .Values.keda.lagThreshold }}"
{{- end }}
`,

    // =========================================================================
    // 3. ANOMALY SERVICE CHART (KEDA NATS JetStream HPA)
    // =========================================================================
    "infra/k8s/helm/anomaly-service/Chart.yaml": `apiVersion: v2
name: anomaly-service
description: CortexShield ML Anomaly Engine
version: 0.1.0
`,
    "infra/k8s/helm/anomaly-service/values.yaml": `
replicaCount: 1
image:
  repository: cortexshield/anomaly-service
  tag: latest

service:
  type: ClusterIP
  port: 8100

env:
  SERVICE_NAME: anomaly-service
  MODEL_RETRAIN_INTERVAL_MINUTES: "60"

keda:
  enabled: true
  minReplicaCount: 1
  maxReplicaCount: 15
  natsServerAddress: nats.internal.svc.cluster.local:4222
  stream: ANOMALY_SCORING
  consumer: anomaly-worker-consumer
  lagThreshold: "100"
`,
    "infra/k8s/helm/anomaly-service/templates/deployment.yaml": `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-anomaly-service
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: anomaly-service
  template:
    metadata:
      labels:
        app: anomaly-service
    spec:
      containers:
        - name: anomaly-service
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: {{ .Values.service.port }}
          envFrom:
            - configMapRef:
                name: {{ .Release.Name }}-anomaly-service-config
`,
    "infra/k8s/helm/anomaly-service/templates/service.yaml": `
apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}-anomaly-service
spec:
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.port }}
  selector:
    app: anomaly-service
`,
    "infra/k8s/helm/anomaly-service/templates/configmap.yaml": `
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-anomaly-service-config
data:
  {{- range $key, $val := .Values.env }}
  {{ $key }}: {{ $val | quote }}
  {{- end }}
`,
    "infra/k8s/helm/anomaly-service/templates/scaledobject.yaml": `
{{- if .Values.keda.enabled }}
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: {{ .Release.Name }}-anomaly-service-scaler
spec:
  scaleTargetRef:
    name: {{ .Release.Name }}-anomaly-service
  minReplicaCount: {{ .Values.keda.minReplicaCount }}
  maxReplicaCount: {{ .Values.keda.maxReplicaCount }}
  triggers:
    - type: nats-jetstream
      metadata:
        natsServerMonitoringEndpoint: "{{ .Values.keda.natsServerAddress }}"
        stream: "{{ .Values.keda.stream }}"
        consumer: "{{ .Values.keda.consumer }}"
        lagThreshold: "{{ .Values.keda.lagThreshold }}"
{{- end }}
`,

    // =========================================================================
    // 4. POLICY SERVICE CHART (Standard CPU HPA)
    // =========================================================================
    "infra/k8s/helm/policy-service/Chart.yaml": `apiVersion: v2
name: policy-service
description: CortexShield OPA Policy Server
version: 0.1.0
`,
    "infra/k8s/helm/policy-service/values.yaml": `
replicaCount: 2
image:
  repository: cortexshield/policy-service
  tag: latest

service:
  type: ClusterIP
  port: 8181

env:
  SERVICE_NAME: policy-service
  OPA_BUNDLE_POLL_INTERVAL_SECONDS: "30"

resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"

hpa:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
`,
    "infra/k8s/helm/policy-service/templates/deployment.yaml": `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-policy-service
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: policy-service
  template:
    metadata:
      labels:
        app: policy-service
    spec:
      containers:
        - name: policy-service
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: {{ .Values.service.port }}
          envFrom:
            - configMapRef:
                name: {{ .Release.Name }}-policy-service-config
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
`,
    "infra/k8s/helm/policy-service/templates/service.yaml": `
apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}-policy-service
spec:
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.port }}
  selector:
    app: policy-service
`,
    "infra/k8s/helm/policy-service/templates/configmap.yaml": `
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-policy-service-config
data:
  {{- range $key, $val := .Values.env }}
  {{ $key }}: {{ $val | quote }}
  {{- end }}
`,
    "infra/k8s/helm/policy-service/templates/hpa.yaml": `
{{- if .Values.hpa.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ .Release.Name }}-policy-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ .Release.Name }}-policy-service
  minReplicas: {{ .Values.hpa.minReplicas }}
  maxReplicas: {{ .Values.hpa.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.hpa.targetCPUUtilizationPercentage }}
{{- end }}
`,

    // =========================================================================
    // 5. ARGOCD APP-OF-APPS
    // =========================================================================
    "infra/k8s/argocd/cortexshield-apps.yaml": `
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cortexshield-dev-cluster
  namespace: argocd
spec:
  project: default
  source:
    repoURL: 'https://github.com/cortexshield/cortexshield.git'
    path: infra/k8s/argocd/apps
    targetRevision: HEAD
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
`,
    "infra/k8s/argocd/apps/proxy-engine.yaml": `
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: proxy-engine-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: 'https://github.com/cortexshield/cortexshield.git'
    path: infra/k8s/helm/proxy-engine
    targetRevision: HEAD
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: cortexshield-dev
`,
    "infra/k8s/argocd/apps/healing-worker.yaml": `
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: healing-worker-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: 'https://github.com/cortexshield/cortexshield.git'
    path: infra/k8s/helm/healing-worker
    targetRevision: HEAD
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: cortexshield-dev
`,
    "infra/k8s/argocd/apps/anomaly-service.yaml": `
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: anomaly-service-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: 'https://github.com/cortexshield/cortexshield.git'
    path: infra/k8s/helm/anomaly-service
    targetRevision: HEAD
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: cortexshield-dev
`,
    "infra/k8s/argocd/apps/policy-service.yaml": `
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: policy-service-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: 'https://github.com/cortexshield/cortexshield.git'
    path: infra/k8s/helm/policy-service
    targetRevision: HEAD
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: cortexshield-dev
`
};

for (const [filepath, content] of Object.entries(files)) {
    const fullPath = path.join(rootDir, filepath);
    const parent = path.dirname(fullPath);
    if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
}

console.log("Milestone 12.6 files created successfully.");
