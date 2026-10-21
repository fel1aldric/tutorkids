from pydantic import BaseModel


class ParentLoginRequest(BaseModel):
    email: str
    password: str


class ChildLoginRequest(BaseModel):
    child_id: str


class ChildPinLoginRequest(BaseModel):
    parent_email: str
    child_id: str
    pin: str
