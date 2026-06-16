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
Apartment hunting can get confusing fast, especially when every listing shows a different special.

Below Market Apartments helps you slow it down and compare the numbers clearly.

Browse current specials near you, tap Compare on the properties you like, and add the floor plans that fit your budget.

Then see normal rent, estimated rent after the special, and monthly savings side by side.

It makes it easier to spot which deal is actually worth touring.

Compare properties first, floor plans next, and details when you're ready.

Below Market Apartments. Find the best apartment deals near you, and tour with more confidence.
""".strip()


async def main() -> None:
    voice = sys.argv[1] if len(sys.argv) > 1 else "en-US-AriaNeural"
    communicate = edge_tts.Communicate(
        text=SCRIPT,
        voice=voice,
        rate="+6%",
        pitch="+3Hz",
    )
    await communicate.save(str(OUTPUT))
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    asyncio.run(main())
