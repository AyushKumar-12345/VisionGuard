#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Deploying VisionGuard to Kubernetes Cluster"
echo "=========================================================="

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed or not in PATH."
    exit 1
fi

echo "Applying Kubernetes manifests via Kustomize..."
kubectl apply -k k8s/

echo "Waiting for PostgreSQL database to be ready..."
kubectl rollout status deployment/visionguard-postgres -n visionguard --timeout=120s

echo "Waiting for Backend API deployments..."
kubectl rollout status deployment/visionguard-backend -n visionguard --timeout=180s

echo "Waiting for Frontend UI deployments..."
kubectl rollout status deployment/visionguard-frontend -n visionguard --timeout=120s

echo ""
echo "=========================================================="
echo "  VisionGuard Cluster Status"
echo "=========================================================="
kubectl get pods,svc,ingress -n visionguard

echo ""
echo "Deployment completed successfully!"

