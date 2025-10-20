import json
from typing import Any, Dict
from decimal import Decimal


def safe_json_loads(text: str) -> Any:
    try:
        return json.loads(text)
    except Exception:
        import re
        m = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
        if m:
            return json.loads(m.group(1))
        raise


def extract_tool_text(result: Dict[str, Any]) -> str:
    contents = result.get("content", [])
    text_chunks = [c.get("text", "") for c in contents if isinstance(c, dict)]
    return "".join(text_chunks).strip()


def _denormalize_attr(value: Any) -> Any:
    if isinstance(value, dict):
        if len(value) == 1:
            key = next(iter(value))
            val = value[key]
            if key == "S":
                return val
            if key == "N":
                return str(val)
            if key == "BOOL":
                return bool(val)
            if key == "NULL":
                return None
            if key == "L":
                return [_denormalize_attr(v) for v in (val or [])]
            if key == "M":
                return {k: _denormalize_attr(v) for k, v in (val or {}).items()}
        return {k: _denormalize_attr(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_denormalize_attr(v) for v in value]
    return value


def denormalize_dynamodb_item(item: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(item, Dict):
        return item
    needs = any(
        isinstance(v, dict) and any(k in v for k in ("S", "N", "M", "L", "BOOL", "NULL"))
        for v in item.values()
    )
    return {k: _denormalize_attr(v) for k, v in item.items()} if needs else item


def to_dynamodb_compatible(value: Any) -> Any:
    """Recursively convert floats to Decimal and leave other types as-is for DynamoDB.

    - dict: convert values
    - list/tuple: convert each item
    - float: Decimal(str(x)) to avoid binary float issues
    - int/str/bool/None: unchanged
    """
    if isinstance(value, dict):
        return {k: to_dynamodb_compatible(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_dynamodb_compatible(v) for v in value]
    if isinstance(value, tuple):
        return tuple(to_dynamodb_compatible(v) for v in value)
    if isinstance(value, float):
        return Decimal(str(value))
    return value


