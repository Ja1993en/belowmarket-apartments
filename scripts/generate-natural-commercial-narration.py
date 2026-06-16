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
Apartment hunting?

Let's make the deals way easier to compare.

With Below Market Apartments, you can browse real apartment specials near you, then tap Compare on the places you actually like.

See a property you love? Add it.

Want the exact layout? Pick the floor plan too.

Now you can compare the normal rent, the estimated rent after the special, and the monthly savings side by side.

No more guessing which deal is better.

Compare properties first, floor plans next, and the details when you're ready.

Then book the tour that makes the most sense for your budget.

Below Market Apartments. Find the best apartment deals near you.
""".strip()


async def main() -> None:
    voice = sys.argv[1] if len(sys.argv) > 1 else "en-US-AriaNeural"
    communicate = edge_tts.Communicate(
        text=SCRIPT,
        voice=voice,
        rate="+11%",
        pitch="+4Hz",
    )
    await communicate.save(str(OUTPUT))
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    asyncio.run(main())
