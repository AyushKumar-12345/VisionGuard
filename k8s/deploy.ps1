Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Deploying VisionGuard to Kubernetes Cluster" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Error "kubectl is not installed or not in PATH."
    exit 1
}

Write-Host "Applying Kubernetes manifests via Kustomize..." -ForegroundColor Yellow
kubectl apply -k k8s/

Write-Host "Waiting for PostgreSQL database to be ready..." -ForegroundColor Yellow
kubectl rollout status deployment/visionguard-postgres -n visionguard --timeout=120s

Write-Host "Waiting for Backend API deployments..." -ForegroundColor Yellow
kubectl rollout status deployment/visionguard-backend -n visionguard --timeout=180s

Write-Host "Waiting for Frontend UI deployments..." -ForegroundColor Yellow
kubectl rollout status deployment/visionguard-frontend -n visionguard --timeout=120s

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  VisionGuard Cluster Status" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
kubectl get pods,svc,ingress -n visionguard

Write-Host ""
Write-Host "Deployment completed successfully!" -ForegroundColor Green

