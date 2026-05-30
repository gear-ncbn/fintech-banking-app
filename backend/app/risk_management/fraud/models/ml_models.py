"""
Machine Learning Models

Defines data structures for ML-based fraud detection.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ModelType(StrEnum):
    CLASSIFICATION = "classification"
    ANOMALY_DETECTION = "anomaly_detection"
    CLUSTERING = "clustering"
    SEQUENCE = "sequence"
    ENSEMBLE = "ensemble"


class ModelStatus(StrEnum):
    TRAINING = "training"
    VALIDATING = "validating"
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPRECATED = "deprecated"
    FAILED = "failed"


class MLModel(BaseModel):
    model_id: UUID = Field(default_factory=uuid4)
    model_name: str
    model_type: ModelType
    model_version: str

    status: ModelStatus = ModelStatus.TRAINING

    description: str
    algorithm: str
    framework: str

    features: list[str] = Field(default_factory=list)
    target_variable: str | None = None

    hyperparameters: dict[str, Any] = Field(default_factory=dict)

    training_data_start: datetime | None = None
    training_data_end: datetime | None = None
    training_samples: int = 0

    accuracy: float = 0.0
    precision: float = 0.0
    recall: float = 0.0
    f1_score: float = 0.0
    auc_roc: float = 0.0

    threshold: float = 0.5

    model_path: str | None = None
    model_size_mb: float = 0.0

    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    trained_at: datetime | None = None
    activated_at: datetime | None = None

    metadata: dict[str, Any] = Field(default_factory=dict)


class ModelPrediction(BaseModel):
    prediction_id: UUID = Field(default_factory=uuid4)
    model_id: UUID

    input_data: dict[str, Any]

    prediction: Any
    probability: float = 0.0
    confidence: float = 0.0

    features_used: dict[str, Any] = Field(default_factory=dict)
    feature_importance: dict[str, float] = Field(default_factory=dict)

    predicted_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    prediction_time_ms: float = 0.0

    is_fraud: bool = False
    fraud_score: float = 0.0


class ModelTrainingJob(BaseModel):
    job_id: UUID = Field(default_factory=uuid4)
    model_id: UUID

    status: str = "pending"

    training_config: dict[str, Any] = Field(default_factory=dict)

    started_at: datetime | None = None
    completed_at: datetime | None = None

    epochs_completed: int = 0
    total_epochs: int = 0
    current_loss: float = 0.0
    current_accuracy: float = 0.0

    error_message: str | None = None

    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ModelPerformanceMetrics(BaseModel):
    metrics_id: UUID = Field(default_factory=uuid4)
    model_id: UUID

    period_start: datetime
    period_end: datetime

    total_predictions: int = 0
    true_positives: int = 0
    false_positives: int = 0
    true_negatives: int = 0
    false_negatives: int = 0

    accuracy: float = 0.0
    precision: float = 0.0
    recall: float = 0.0
    f1_score: float = 0.0

    average_prediction_time_ms: float = 0.0

    drift_score: float = 0.0
    needs_retraining: bool = False

    calculated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class FeatureStore(BaseModel):
    feature_id: UUID = Field(default_factory=uuid4)
    feature_name: str
    feature_type: str

    description: str
    calculation_logic: str

    source_tables: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)

    refresh_frequency: str = "daily"
    last_refresh: datetime | None = None

    is_active: bool = True

    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class MLModelStatistics(BaseModel):
    total_models: int = 0
    active_models: int = 0
    by_type: dict[str, int] = Field(default_factory=dict)
    total_predictions_today: int = 0
    average_accuracy: float = 0.0
    models_requiring_retraining: int = 0
