import logging
import os


def setup_logging(level: str = "INFO") -> None:
    log_level = os.getenv("LOG_LEVEL", level).upper()
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler()],
    )


def get_logger(name: str) -> logging.Logger:
    if not logging.root.handlers:
        setup_logging()
    return logging.getLogger(name)


setup_logging()


