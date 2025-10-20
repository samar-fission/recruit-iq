import json
from typing import Any, Dict


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
    text = "".join(text_chunks).strip()
    print(text)
    return text


def extract_required_skill_names(skills_obj: Any) -> list[str]:
    """Extract list of required skill names from a nested skills object.

    Accepts either the nested categories/verticals/skills structure or a list of strings.
    Returns an empty list on unrecognized shapes.
    """
    # If it is already a list of strings, return as-is
    if isinstance(skills_obj, list) and all(isinstance(s, str) for s in skills_obj):
        return list(skills_obj)

    required: list[str] = []
    try:
        categories = skills_obj.get("categories") if isinstance(skills_obj, dict) else None
        if not isinstance(categories, list):
            categories = []
        for category in categories:
            verticals = category.get("verticals") if isinstance(category, dict) else None
            if not isinstance(verticals, list):
                continue
            for vertical in verticals:
                skills = vertical.get("skills") if isinstance(vertical, dict) else None
                if not isinstance(skills, list):
                    continue
                for skill_item in skills:
                    if not isinstance(skill_item, dict):
                        continue
                    if skill_item.get("required") is True:
                        name = skill_item.get("skill")
                        if isinstance(name, str) and name:
                            required.append(name)
        # Also parse optional top-level skills_unclassified
        unclassified = skills_obj.get("skills_unclassified") if isinstance(skills_obj, dict) else None
        if isinstance(unclassified, list):
            for skill_item in unclassified:
                if not isinstance(skill_item, dict):
                    continue
                if skill_item.get("required") is True:
                    name = skill_item.get("skill")
                    if isinstance(name, str) and name:
                        required.append(name)
    except Exception:
        return []
    return required


def _denormalize_attr(value: Any) -> Any:
    """Convert DynamoDB AttributeValue shapes to native Python types recursively."""
    if isinstance(value, dict):
        # AttributeValue single-key forms
        if len(value) == 1:
            key = next(iter(value))
            val = value[key]
            if key == "S":
                return val
            if key == "N":
                # Keep as string to preserve formatting; caller may cast
                return str(val)
            if key == "BOOL":
                return bool(val)
            if key == "NULL":
                return None
            if key == "L":
                return [_denormalize_attr(v) for v in (val or [])]
            if key == "M":
                return {k: _denormalize_attr(v) for k, v in (val or {}).items()}
        # Otherwise treat as normal map and recurse
        return {k: _denormalize_attr(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_denormalize_attr(v) for v in value]
    return value


def denormalize_dynamodb_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """Best-effort conversion of a DynamoDB item that may be in AttributeValue form.

    If item values look like {"S": ...}, {"N": ...}, {"M": ...}, {"L": ...}, this
    will convert the entire object to plain Python types. If already plain, it is
    returned unchanged.
    """
    if not isinstance(item, Dict):
        return item
    # Heuristic: if any top-level value matches AV shapes, convert all
    needs = any(
        isinstance(v, dict) and any(k in v for k in ("S", "N", "M", "L", "BOOL", "NULL"))
        for v in item.values()
    )
    return {k: _denormalize_attr(v) for k, v in item.items()} if needs else item


