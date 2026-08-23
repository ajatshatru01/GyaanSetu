from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class TagItem(BaseModel):
    id: str
    label: str
    bgClass: str = Field(default="bg-transparent", validation_alias=AliasChoices("bgClass", "bg_class"))
    borderClass: str = Field(default="border-[#1d4ed8]", validation_alias=AliasChoices("borderClass", "border_class"))
    textClass: str = Field(default="text-[#1d4ed8]", validation_alias=AliasChoices("textClass", "text_class"))
    hex: str = "#1d4ed8"

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class TagCreate(BaseModel):
    id: str | None = None
    label: str
    bgClass: str = Field(default="bg-transparent", validation_alias=AliasChoices("bgClass", "bg_class"))
    borderClass: str = Field(default="border-[#1d4ed8]", validation_alias=AliasChoices("borderClass", "border_class"))
    textClass: str = Field(default="text-[#1d4ed8]", validation_alias=AliasChoices("textClass", "text_class"))
    hex: str = "#1d4ed8"

    model_config = ConfigDict(
        populate_by_name=True,
    )
