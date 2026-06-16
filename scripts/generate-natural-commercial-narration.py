import asyncio
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError as exc:
    raise SystemExit(
        "edge-tts is required. Install it with: python3 -m pip install edge-tts"
    ) from exc


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT_ROOT / "public" / "marketing" / "bma-compare-commercial-narration.mp3"

SCRIPT = """
Still scrolling listings, trying to find the real apartment deal?

Meet Below Market Apartments.

Browse current specials near you, tap Compare on the properties that catch your eye, and add the floor plans that fit your budget.

In seconds, see normal rent, rent after the special, and monthly savings side by side.

No more guessing. No more jumping between tabs.

Compare properties first, floor plans next, then tour the deal that actually makes sense.

Below Market Apartments. Find the best apartment deals near you.
""".strip()


async def main() -> None:
    voice = sys.argv[1] if len(sys.argv) > 1 else "en-US-AriaNeural"
    communicate = edge_tts.Communicate(
        text=SCRIPT,
        voice=voice,
        rate="+8%",
        pitch="+5Hz",
    )
    await communicate.save(str(OUTPUT))
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    asyncio.run(main())
