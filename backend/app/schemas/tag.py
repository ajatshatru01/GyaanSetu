from typing import Annotated
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class TagItem(BaseModel):
    id: str
    label: str
    bgClass: str = Field(default="bg-transparent", alias="bg_class")
    borderClass: str = Field(default="border-[#1d4ed8]", alias="border_class")
    textClass: str = Field(default="text-[#1d4ed8]", alias="text_class")
    hex: str = "#1d4ed8"

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class TagCreate(BaseModel):
    id: str | None = None
    label: str
    bgClass: str = Field(default="bg-transparent", alias="bg_class")
    borderClass: str = Field(default="border-[#1d4ed8]", alias="border_class")
    textClass: str = Field(default="text-[#1d4ed8]", alias="text_class")
    hex: str = "#1d4ed8"

    model_config = ConfigDict(
        populate_by_name=True,
    )


class TagUpdate(BaseModel):
    label: str | None = None
    bgClass: str | None = Field(default=None, alias="bg_class")
    borderClass: str | None = Field(default=None, alias="border_class")
    textClass: str | None = Field(default=None, alias="text_class")
    hex: str | None = None

    model_config = ConfigDict(
        populate_by_name=True,
    )
