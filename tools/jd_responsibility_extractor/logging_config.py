import logging
import os

_configured = False


def setup_logging(level: str | None = None) -> None:
    global _configured
    if _configured:
        return
    log_level = (level or os.getenv("LOG_LEVEL", "INFO")).upper()
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s - %(message)s", "%Y-%m-%dT%H:%M:%S%z")
    root = logging.getLogger()
    if not root.handlers:
        h = logging.StreamHandler()
        h.setFormatter(fmt)
        root.addHandler(h)
    root.setLevel(log_level)
    _configured = True


def get_logger(name: str) -> logging.Logger:
    setup_logging()
    return logging.getLogger(name)


