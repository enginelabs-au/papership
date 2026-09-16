# D-18 — Wake-word spike (specify only, T2-7)

Date: 2026-09-11  
Status: specified. **Do not ship a vendor.**

## Phrase

“Hey Papership” plus typed Ask. The desktop Hey Papership button is the R1 control.

## Entitlement

macOS: `NSMicrophoneUsageDescription` + Speech / audio-input entitlement in Tauri only after an owner vendor decision. Default is **off**. The mic affordance must read unavailable until that decision.

## Architecture

| Option | Where audio goes | Residual risk |
|---|---|---|
| On-device (preferred default) | Local speech-to-text; only the transcript hits Papership API | False wakes; still user-equivalent grants (AUTH-07) |
| Cloud speech | Audio leaves the machine | Provider data-use (H-4 class); do not enable without owner terms |

Wake-word is **not** a grant bypass. The same seat grants apply as typed Ask.

## Non-goals

No mobile wake word. No always-on cloud streaming in R1. No vendor pin in this repository.
