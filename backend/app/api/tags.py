from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.tag import TagCreate, TagItem, TagUpdate
from app.services.tag_service import (
    create_custom_tag,
    delete_tag,
    get_all_tags,
    update_tag,
)

router = APIRouter(
    prefix="/api/tags",
    tags=["Tags"],
)


@router.get(
    "/",
    response_model=list[TagItem],
)
def list_tags(
    db: Session = Depends(get_db),
):
    tags = get_all_tags(db)
    return [
        TagItem(
            id=t.id,
            label=t.label,
            bgClass=t.bg_class,
            borderClass=t.border_class,
            textClass=t.text_class,
            hex=t.hex,
        )
        for t in tags
    ]


@router.post(
    "/",
    response_model=TagItem,
)
def add_tag(
    payload: TagCreate,
    db: Session = Depends(get_db),
):
    tag = create_custom_tag(db, payload.model_dump())
    return TagItem(
        id=tag.id,
        label=tag.label,
        bgClass=tag.bg_class,
        borderClass=tag.border_class,
        textClass=tag.text_class,
        hex=tag.hex,
    )


@router.patch(
    "/{tag_id}",
    response_model=TagItem,
)
def edit_tag(
    tag_id: str,
    payload: TagUpdate,
    db: Session = Depends(get_db),
):
    tag = update_tag(db, tag_id, payload.model_dump(exclude_unset=True))
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found.")
    return TagItem(
        id=tag.id,
        label=tag.label,
        bgClass=tag.bg_class,
        borderClass=tag.border_class,
        textClass=tag.text_class,
        hex=tag.hex,
    )


@router.delete(
    "/{tag_id}",
)
def remove_tag(
    tag_id: str,
    db: Session = Depends(get_db),
):
    success = delete_tag(db, tag_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag not found.")
    return {"success": True, "message": f"Tag '{tag_id}' deleted successfully."}
