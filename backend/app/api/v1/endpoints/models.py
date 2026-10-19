
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.analysis import ModelConfig
from app.schemas.model import ModelConfigResponse

router = APIRouter()


@router.get("", response_model=list[ModelConfigResponse])
async def list_models(db: AsyncSession = Depends(get_db)):
    """Lists all configured object detection models and their metadata."""
    query = select(ModelConfig).order_by(ModelConfig.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{model_id}", response_model=ModelConfigResponse)
async def get_model(model_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieves metadata for a specific model configuration."""
    query = select(ModelConfig).where(
        (ModelConfig.id == model_id) | (ModelConfig.name == model_id)
    )
    result = await db.execute(query)
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_id}' not found."
        )
    return model
