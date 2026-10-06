"""Trial rate card (D-35). Charges stay off until ENGINE_BILLING_CHARGES_ENABLED=1."""

from __future__ import annotations

from typing import Any

# Owner-directed 2026-09-13: competitor-average trial. USD list (research basis).
# Token pools step ~4× (mid of the 2–5× industry band). Max is the 5× seat analogue.
PLAN_ORDER = ("free", "pro", "max", "enterprise")

PLANS: list[dict[str, Any]] = [
    {
        "id": "free",
        "label": "Free",
        "usd_month": 0,
        "billing": "included",
        "seats": "1",
        "tokens_month": 50_000,
        "token_scope": "organisation",
        "overage": "none",
        "overage_usd_per_100k": None,
        "note": "Try Hey Papership. Hard stop at the pool — add Pro to continue.",
    },
    {
        "id": "pro",
        "label": "Pro",
        "usd_month": 24,
        "billing": "per_seat",
        "seats": "1+",
        "tokens_month": 200_000,
        "token_scope": "per_seat",
        "overage": "credits",
        "overage_usd_per_100k": 8,
        "note": "Paid operator seat for one founder/solo operator. All Papership domains. Charges stay off until enabled.",
    },
    {
        "id": "max",
        "label": "Max",
        "usd_month": 120,
        "billing": "per_seat",
        "seats": "1+",
        "tokens_month": 800_000,
        "token_scope": "per_seat",
        "overage": "credits",
        "overage_usd_per_100k": 6,
        "note": "Power seat (5× Pro price, 4× Pro tokens). Cheaper overage than Pro.",
    },
    {
        "id": "enterprise",
        "label": "Enterprise",
        "usd_month": 32,
        "billing": "per_seat_pooled",
        "seats": "5 minimum",
        "tokens_month": 400_000,
        "token_scope": "per_seat_pooled",
        "overage": "credits",
        "overage_usd_per_100k": 5,
        "note": "Affordable org seats. Tokens pool across the tenant. Floor 5 × $32 = $160 / month.",
    },
]

USAGE_TIERS: list[dict[str, Any]] = [
    {"id": "usage_1", "label": "Usage 1", "overage_cap_multiple": 1, "unlock": "Default after the first paid invoice or credit purchase."},
    {"id": "usage_2", "label": "Usage 2", "overage_cap_multiple": 2, "unlock": "$50 usage credits purchased and 7 days on a paid plan."},
    {"id": "usage_3", "label": "Usage 3", "overage_cap_multiple": 4, "unlock": "$150 usage credits purchased and 7 days on a paid plan."},
    {"id": "usage_4", "label": "Usage 4", "overage_cap_multiple": 8, "unlock": "$500 usage credits purchased and 14 days on a paid plan."},
    {"id": "usage_5", "label": "Usage 5", "overage_cap_multiple": 16, "unlock": "$1,000 usage credits purchased and 30 days on a paid plan."},
]


def trial_rate_card(*, charges_enabled: bool) -> dict[str, Any]:
    return {
        "version": 2,
        "published": True,
        "trial": True,
        "charges_enabled": bool(charges_enabled),
        "currency": "USD",
        "aud_per_usd": 1.5,
        "credit_increment_usd": 10,
        "plans": [dict(row) for row in PLANS],
        "usage_tiers": [dict(row) for row in USAGE_TIERS],
        "notes": [
            "Trial publication (D-35). Charges stay off until ENGINE_BILLING_CHARGES_ENABLED=1.",
            "Seat price and tokens are separate figures.",
            "Usage tiers raise the monthly overage ceiling, not the included pool.",
            "Free has no overage. Paid plans add $10 credit packs at the plan overage rate.",
        ],
    }
