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
Looking for an apartment deal?

With Below Market Apartments, you can browse real specials near you.

Tap Compare on the properties you like.

Then choose the exact floor plans that fit your budget.

You can see the normal rent, the estimated rent after the special, and your monthly savings side by side.

Compare properties first, floor plans next, and details when you need them.

Then tour with confidence, knowing which deal is actually worth it.

Below Market Apartments. Find the best apartment deals near you.
""".strip()


async def main() -> None:
    voice = sys.argv[1] if len(sys.argv) > 1 else "en-US-JennyNeural"
    communicate = edge_tts.Communicate(
        text=SCRIPT,
        voice=voice,
        rate="+1%",
        pitch="+0Hz",
    )
    await communicate.save(str(OUTPUT))
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    asyncio.run(main())
