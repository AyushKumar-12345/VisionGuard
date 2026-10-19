import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.core.logging import logger
from app.db.session import async_session_factory
from app.models.analysis import ModelConfig
from app.models.evaluation import EvaluationDataset


async def seed_defaults() -> None:
    """Seed initial model configurations and default dataset metadata."""
    async with async_session_factory() as session:
        # 1. Seed candidate models
        models_to_seed = [
            {
                "name": "yolov8n",
                "model_family": "YOLOv8",
                "weight_identifier": "yolov8n.pt",
                "weight_file_path": str(settings.WEIGHTS_DIR / "yolov8n.pt"),
                "input_size": 640,
                "default_conf": 0.35,
                "default_iou": 0.45,
                "is_active": True,
            },
            {
                "name": "yolov8s",
                "model_family": "YOLOv8",
                "weight_identifier": "yolov8s.pt",
                "weight_file_path": str(settings.WEIGHTS_DIR / "yolov8s.pt"),
                "input_size": 640,
                "default_conf": 0.35,
                "default_iou": 0.45,
                "is_active": True,
            },
        ]

        for m_data in models_to_seed:
            stmt = select(ModelConfig).where(ModelConfig.name == m_data["name"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                model_obj = ModelConfig(**m_data)
                session.add(model_obj)
                logger.info(f"Seeded model config: {m_data['name']}")

        # 2. Seed default evaluation dataset record
        dataset_name = "COCO-Traffic-MiniVal"
        stmt = select(EvaluationDataset).where(EvaluationDataset.name == dataset_name)
        res = await session.execute(stmt)
        existing_ds = res.scalar_one_or_none()
        if not existing_ds:
            ds_obj = EvaluationDataset(
                name=dataset_name,
                version="2017",
                split="val",
                num_samples=15,
                num_ground_truth_boxes=52,
                dataset_path=str(settings.EVALUATION_DIR / "traffic_minival"),
                license="CC-BY-4.0",
            )
            session.add(ds_obj)
            logger.info(f"Seeded evaluation dataset: {dataset_name}")

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed_defaults())
