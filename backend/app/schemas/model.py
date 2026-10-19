from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ModelConfigResponse(BaseModel):
    id: str
    name: str
    model_family: str
    weight_identifier: str
    input_size: int
    default_conf: float
    default_iou: float
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
