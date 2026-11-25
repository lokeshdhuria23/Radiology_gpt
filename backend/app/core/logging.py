import logging
import os
import re
import sys
from pathlib import Path

# Regular expressions for scrubbing Protected Health Information (PHI) and PII from logs
SENSITIVE_PATTERNS = [
    # Social Security Numbers (e.g. 123-45-6789)
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[SSN REDACTED]"),
    # Medical Record Numbers (MRN: 12345, MRN#12345, MRN-12345) - negative lookahead to prevent double-redaction
    (
        re.compile(r"(?i)\b(mrn|medical record number)[:#\s-]*(?!\[MRN REDACTED\])\s*([a-z0-9\-]+)"),
        r"\1: [MRN REDACTED]",
    ),
    # US / Standard Phone Numbers
    (
        re.compile(r"\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),
        "[PHONE REDACTED]",
    ),
    # Credit Card Numbers
    (re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"), "[CARD REDACTED]"),
    # Date of Birth patterns
    (
        re.compile(r"(?i)\b(dob|date of birth)[:#\s-]*(?!\[DOB REDACTED\])\s*(\d{1,4}[-/]\d{1,2}[-/]\d{1,4})"),
        r"\1: [DOB REDACTED]",
    ),
]


def mask_sensitive_data(text: str) -> str:
    """Mask sensitive patient health information and PII from log messages."""
    if not isinstance(text, str):
        return text
    result = text
    for pattern, replacement in SENSITIVE_PATTERNS:
        result = pattern.sub(replacement, result)
    return result


class SensitiveDataFilter(logging.Filter):
    """Logging filter to prevent sensitive medical or personal data from appearing in logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        # Check if record has already been sanitized to avoid duplicate processing across handlers
        if getattr(record, "_is_sanitized", False):
            return True

        if isinstance(record.msg, str):
            record.msg = mask_sensitive_data(record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = {
                    k: (mask_sensitive_data(v) if isinstance(v, str) else v)
                    for k, v in record.args.items()
                }
            elif isinstance(record.args, tuple):
                record.args = tuple(
                    mask_sensitive_data(arg) if isinstance(arg, str) else arg
                    for arg in record.args
                )
        record._is_sanitized = True
        return True


# Global initialization flag
_is_logging_configured = False


def setup_logging(
    log_level: str = "INFO",
    log_dir: str = "logs",
    log_filename: str = "cdss.log",
) -> None:
    """
    Configure Python logging with structured format, console handler, and file handler.
    Log format: "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    """
    global _is_logging_configured

    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)
    log_file = log_path / log_filename

    log_format = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    formatter = logging.Formatter(fmt=log_format, datefmt="%Y-%m-%d %H:%M:%S")

    sensitive_filter = SensitiveDataFilter()

    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    if not _is_logging_configured:
        # Console Handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(numeric_level)
        console_handler.setFormatter(formatter)
        console_handler.addFilter(sensitive_filter)
        root_logger.addHandler(console_handler)

        # File Handler (logs/cdss.log)
        try:
            file_handler = logging.FileHandler(log_file, encoding="utf-8")
            file_handler.setLevel(numeric_level)
            file_handler.setFormatter(formatter)
            file_handler.addFilter(sensitive_filter)
            root_logger.addHandler(file_handler)
        except Exception as e:
            sys.stderr.write(f"Failed to create file handler for {log_file}: {e}\n")

        _is_logging_configured = True


def get_logger(name: str) -> logging.Logger:
    """Retrieve a configured structured logger by name."""
    if not _is_logging_configured:
        level = os.getenv("LOG_LEVEL", "INFO")
        setup_logging(log_level=level)

    return logging.getLogger(name)
