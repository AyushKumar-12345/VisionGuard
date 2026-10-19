import asyncio
from datetime import UTC, datetime

from sqlalchemy import select

from app.core.config import settings
from app.core.logging import logger
from app.db.session import async_session_factory
from app.models.analysis import ModelConfig
from app.models.evaluation import EvaluationDataset, EvaluationRun
from app.services.cv.evaluator import EvaluationHarness


async def benchmark_models():
    """
    Executes formal, reproducible evaluation runs for YOLOv8n and YOLOv8s
    on the ground-truth benchmark and persists actual measured metrics into PostgreSQL/DB.
    """
    dataset_path = settings.EVALUATION_DIR / "traffic_minival"
    harness = EvaluationHarness(dataset_path)

    async with async_session_factory() as session:
        # Load dataset
        stmt_ds = select(EvaluationDataset).where(EvaluationDataset.name == "Traffic-Evaluation-MiniVal")
        res_ds = await session.execute(stmt_ds)
        dataset = res_ds.scalar_one_or_none()
        if not dataset:
            # Fallback to first available dataset
            res_ds = await session.execute(select(EvaluationDataset))
            dataset = res_ds.scalars().first()

        if not dataset:
            logger.error("No evaluation dataset found in database.")
            return

        models_to_evaluate = ["yolov8n", "yolov8s"]

        for model_name in models_to_evaluate:
            # Check model config
            stmt_m = select(ModelConfig).where(ModelConfig.name == model_name)
            res_m = await session.execute(stmt_m)
            model_cfg = res_m.scalar_one_or_none()
            if not model_cfg:
                logger.error(f"ModelConfig '{model_name}' not found.")
                continue

            logger.info(f"--- Running Reproducible Benchmark for {model_name} ---")

            # Execute evaluation harness
            metrics = harness.evaluate_model(
                model_name=model_name,
                conf_threshold=0.25,
                iou_threshold=0.50,
                input_size=640
            )

            # Persist run
            run_obj = EvaluationRun(
                dataset_id=dataset.id,
                model_config_id=model_cfg.id,
                status="COMPLETED",
                conf_threshold=0.25,
                iou_threshold=0.50,
                input_size=640,
                device=settings.DEVICE,
                precision=metrics["precision"],
                recall=metrics["recall"],
                map50=metrics["map50"],
                map50_95=metrics["map50_95"],
                f1_score=metrics["f1_score"],
                latency_ms=metrics["avg_latency_ms"],
                throughput_fps=metrics["throughput_fps"],
                class_metrics=metrics["class_metrics"],
                hardware_info=metrics["hardware_info"],
                started_at=datetime.now(UTC),
                completed_at=datetime.now(UTC)
            )
            session.add(run_obj)
            await session.commit()

            logger.info(
                f"Completed Benchmark for {model_name}: "
                f"Precision={metrics['precision']:.3f}, Recall={metrics['recall']:.3f}, "
                f"mAP@0.5={metrics['map50']:.3f}, Latency={metrics['avg_latency_ms']:.1f}ms, "
                f"Throughput={metrics['throughput_fps']:.1f} FPS"
            )


if __name__ == "__main__":
    asyncio.run(benchmark_models())
