{{/* Common labels */}}
{{- define "app.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: "{{ .Chart.AppVersion }}"
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
env: {{ .Values.global.env }}
{{- end -}}

{{- define "app.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
component: {{ .component }}
{{- end -}}

{{- define "app.image" -}}
{{ .Values.global.image.registry }}/{{ .Values.global.image.repository }}/{{ .image.name }}:{{ .image.tag | default .Chart.AppVersion }}
{{- end -}}

{{- define "app.fullname" -}}
{{ .Release.Name }}-{{ .component }}
{{- end -}}
