"""Hermes v0.21.1 / hermes-api-server tool catalog.

Unknown tools stay denied. Catalogued tools are allowable when their
toolset is enabled and interception_verified is true (except read-class).
"""

from __future__ import annotations

from typing import Literal

Risk = Literal["read", "write", "external", "destructive"]

# Pin: documented hermes-api-server tools plus Papership action-service aliases.
TOOLS: dict[str, tuple[str, Risk]] = {
    # web
    # Hermes bridge: discovery only. `tool_call` is deliberately absent; the interceptor unwraps it.
    "tool_search": ("bridge", "read"),
    "tool_describe": ("bridge", "read"),
    "web_search": ("web", "read"),
    "web_extract": ("web", "write"),
    "x_search": ("web", "read"),
    # terminal
    "terminal": ("terminal", "write"),
    "process": ("terminal", "write"),
    "process_manage": ("terminal", "write"),
    "shell": ("terminal", "write"),
    "exec": ("terminal", "write"),
    # file
    "read_file": ("file", "read"),
    "write_file": ("file", "write"),
    "files_write": ("file", "write"),
    "patch": ("file", "write"),
    "search_files": ("file", "read"),
    # browser
    "browser": ("browser", "write"),
    "browser_navigate": ("browser", "write"),
    "browser_snapshot": ("browser", "read"),
    "browser_click": ("browser", "write"),
    "browser_type": ("browser", "write"),
    "browser_scroll": ("browser", "write"),
    "browser_back": ("browser", "write"),
    "browser_press": ("browser", "write"),
    "browser_get_images": ("browser", "read"),
    "browser_vision": ("browser", "write"),
    "browser_console": ("browser", "read"),
    "browser_cdp": ("browser", "write"),
    "browser_exec": ("browser", "write"),
    "browser_dialog": ("browser", "write"),
    "web_fetch": ("browser", "write"),
    # memory / planning
    "memory": ("memory", "write"),
    "memory_read": ("memory", "read"),
    "todo": ("todo", "write"),
    "todo_list": ("todo", "write"),
    "session_search": ("session_search", "read"),
    # skills
    "skills_list": ("skills", "read"),
    "skill_view": ("skills", "read"),
    "skill_manage": ("skills", "write"),
    # vision / media
    "vision_analyze": ("vision", "read"),
    "image_generate": ("vision", "write"),
    "video_analyze": ("vision", "read"),
    "video_generate": ("video", "write"),
    "bfl_flux3_text_to_video": ("video", "write"),
    "bfl_flux3_image_to_video": ("video", "write"),
    "bfl_flux3_keyframes_to_video": ("video", "write"),
    "bfl_flux3_video_continuation": ("video", "write"),
    "bfl_flux3_get_result": ("video", "read"),
    "bfl_flux3_prompting_guide": ("video", "read"),
    "xai_video_edit": ("video", "write"),
    "xai_video_extend": ("video", "write"),
    # code / agents
    "execute_code": ("code_execution", "write"),
    "delegate_task": ("delegation", "write"),
    "cronjob": ("cronjob", "write"),
    "cronjob_manage": ("cronjob", "write"),
    # home assistant (service tools; approval-bound)
    "ha_list_entities": ("homeassistant", "read"),
    "ha_get_state": ("homeassistant", "read"),
    "ha_list_services": ("homeassistant", "read"),
    "ha_call_service": ("homeassistant", "external"),
    # Papership action-service aliases (Hermes github/email stay routed here)
    "github": ("github", "external"),
    "git": ("github", "external"),
    "email_send": ("email_send", "external"),
    "send_email": ("email_send", "external"),
    # optional API-server omissions, catalogued if the pin later exposes them
    "clarify": ("clarify", "read"),
    "text_to_speech": ("tts", "write"),
    "computer_use": ("computer_use", "external"),
}

TOOLSETS = frozenset(toolset for toolset, _risk in TOOLS.values())
SIDE_EFFECTING_TOOLSETS = frozenset(
    toolset for toolset, risk in TOOLS.values() if risk != "read"
)


def lookup(name: str) -> tuple[str, Risk] | None:
    key = (name or "").strip().lower()
    return TOOLS.get(key)
