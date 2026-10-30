import torch
from ultralytics import YOLO

from app.core.config import settings
from app.core.logging import logger

# COCO class IDs for intelligent surveillance & multi-object analytics:
# 0: person (pedestrians, athletes, subjects), 1: bicycle, 2: car, 3: motorcycle, 5: bus, 7: truck
TRAFFIC_CLASS_IDS = [0, 1, 2, 3, 5, 7]
TRAFFIC_CLASS_NAMES = {
    0: "person",
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck"
}


class ModelRegistry:
    """
    Singleton cache for loaded YOLO models.
    Prevents redundant disk I/O and memory overhead by maintaining
    an in-memory registry of initialized PyTorch models.
    """
    _loaded_models: dict[str, YOLO] = {}

    @classmethod
    def get_model(cls, model_name: str = "yolov8n") -> YOLO:
        """
        Loads and returns cached YOLO model instance.
        If weights are not found locally, downloads from official Ultralytics release.
        """
        if model_name in cls._loaded_models:
            return cls._loaded_models[model_name]

        weight_file = f"{model_name}.pt"
        weight_path = settings.WEIGHTS_DIR / weight_file

        logger.info(f"Loading YOLO model '{model_name}' from {weight_path}")

        # Ensure intra-op CPU threads are tuned for host
        if settings.DEVICE == "cpu":
            torch.set_num_threads(settings.CPU_INFERENCE_THREADS)

        # Load weights (Ultralytics auto-caches locally if needed)
        try:
            model = YOLO(str(weight_path) if weight_path.exists() else weight_file)
            # Warm up model with a dummy tensor
            model.to(settings.DEVICE)
            cls._loaded_models[model_name] = model
            logger.info(f"Model '{model_name}' loaded successfully into {settings.DEVICE}")
            return model
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            raise RuntimeError(f"Could not load model weights for '{model_name}': {e}")
