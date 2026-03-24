"""Model registry — singleton model store loaded once at startup."""

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class ModelRegistry:
    """Holds loaded ML models. Loaded once at startup via FastAPI lifespan."""

    def __init__(self):
        self._models = {}
        self._is_loaded = False
        self._version = settings.model_version

    @property
    def version(self) -> str:
        return self._version

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    def load_models(self):
        """Load all ML models from configured path."""
        import time

        start = time.time()
        logger.info(
            "Loading models from %s (version: %s)", settings.model_path, self._version
        )

        try:
            # Placeholder — actual model loading will be implemented in Phase 3
            # from sentence_transformers import SentenceTransformer
            # self._models["embedder"] = SentenceTransformer("all-MiniLM-L6-v2")
            self._is_loaded = True
            elapsed = time.time() - start
            logger.info("Models loaded successfully in %.2fs", elapsed)
        except Exception as e:
            logger.error("Failed to load models: %s", str(e))
            self._is_loaded = False

    def unload_models(self):
        """Cleanup model resources."""
        self._models.clear()
        self._is_loaded = False
        logger.info("Models unloaded")

    def get(self, name: str):
        """Retrieve a loaded model by name."""
        if not self._is_loaded:
            raise RuntimeError("Models not yet loaded")
        return self._models.get(name)


model_registry = ModelRegistry()
