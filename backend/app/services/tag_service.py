from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Document, Tag

DEFAULT_TAGS = [
    {
        "id": "tender_gcc",
        "label": "Tender / GCC",
        "bg_class": "bg-transparent",
        "border_class": "border-[#1d4ed8]",
        "text_class": "text-[#1d4ed8]",
        "hex": "#1d4ed8",
    },
    {
        "id": "cmrs_safety",
        "label": "CMRS Safety",
        "bg_class": "bg-transparent",
        "border_class": "border-[#0e7490]",
        "text_class": "text-[#0e7490]",
        "hex": "#0e7490",
    },
    {
        "id": "high_priority",
        "label": "High Priority",
        "bg_class": "bg-transparent",
        "border_class": "border-[#dc2626]",
        "text_class": "text-[#dc2626]",
        "hex": "#dc2626",
    },
    {
        "id": "monsoon_sop",
        "label": "Monsoon SOP",
        "bg_class": "bg-transparent",
        "border_class": "border-[#d97706]",
        "text_class": "text-[#d97706]",
        "hex": "#d97706",
    },
    {
        "id": "vendor_sla",
        "label": "Vendor SLA",
        "bg_class": "bg-transparent",
        "border_class": "border-[#c2410c]",
        "text_class": "text-[#c2410c]",
        "hex": "#c2410c",
    },
]


def seed_default_tags(db: Session):
    for tag_data in DEFAULT_TAGS:
        existing = db.get(Tag, tag_data["id"])
        if not existing:
            tag = Tag(
                id=tag_data["id"],
                label=tag_data["label"],
                bg_class=tag_data["bg_class"],
                border_class=tag_data["border_class"],
                text_class=tag_data["text_class"],
                hex=tag_data["hex"],
            )
            db.add(tag)
    db.commit()


def get_all_tags(db: Session) -> list[Tag]:
    statement = select(Tag).order_by(Tag.created_at.asc())
    tags = db.execute(statement).scalars().all()
    if not tags:
        seed_default_tags(db)
        tags = db.execute(statement).scalars().all()
    return list(tags)


def create_custom_tag(db: Session, tag_data: dict) -> Tag:
    tag_id = tag_data.get("id") or tag_data.get("label", "").lower().replace(" ", "_")
    existing = db.get(Tag, tag_id)
    if existing:
        return existing

    tag = Tag(
        id=tag_id,
        label=tag_data.get("label", "Custom Tag"),
        bg_class=tag_data.get("bgClass") or tag_data.get("bg_class", "bg-transparent"),
        border_class=tag_data.get("borderClass") or tag_data.get("border_class", "border-[#1d4ed8]"),
        text_class=tag_data.get("textClass") or tag_data.get("text_class", "text-[#1d4ed8]"),
        hex=tag_data.get("hex", "#1d4ed8"),
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def delete_tag(db: Session, tag_id: str) -> bool:
    tag = db.get(Tag, tag_id)
    if not tag:
        return False

    db.delete(tag)

    # Clean up from existing documents
    docs = db.execute(select(Document)).scalars().all()
    for doc in docs:
        if doc.tags:
            filtered_tags = [t for t in doc.tags if t.get("id") != tag_id]
            if len(filtered_tags) != len(doc.tags):
                doc.tags = filtered_tags

    db.commit()
    return True
