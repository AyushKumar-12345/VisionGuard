import sys

import psutil
import torch
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db

router = APIRouter()


@router.get("", summary="System Health & Diagnostic Check")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Returns comprehensive system health status, database connectivity,
    and PyTorch hardware acceleration diagnostics.
    """
    # 1. Check Database connection
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {e!s}"

    # 2. Compute resource utilization
    cpu_percent = psutil.cpu_percent(interval=None)
    memory = psutil.virtual_memory()

    # 3. Hardware inference device capability
    cuda_available = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_available else "Intel Core Ultra 9 185H (CPU Optimized)"

    return {
        "status": "online" if db_status == "healthy" else "degraded",
        "project": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "database": db_status,
        "environment": {
            "python_version": sys.version.split()[0],
            "torch_version": torch.__version__,
            "device": "cuda" if cuda_available else "cpu",
            "device_name": device_name,
            "inference_threads": torch.get_num_threads(),
        },
        "system_resources": {
            "cpu_usage_pct": cpu_percent,
            "memory_used_gb": round((memory.total - memory.available) / (1024**3), 2),
            "memory_total_gb": round(memory.total / (1024**3), 2),
            "memory_free_gb": round(memory.available / (1024**3), 2),
        }
    }
