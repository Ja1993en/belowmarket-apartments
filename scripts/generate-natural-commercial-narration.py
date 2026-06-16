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
Apartment hunting can get confusing, especially when every property has a different special. Below Market Apartments helps you compare the deals in a way that actually makes sense. Browse current specials near you, tap Compare on the properties you like, and add the floor plans that fit your budget. Then you can see the normal rent, estimated rent after the special, and monthly savings side by side. It is a simpler way to decide what is worth touring, without jumping between tabs or guessing from screenshots. Compare properties first, floor plans next, and details when you're ready. Below Market Apartments. Find the best apartment deals near you, and tour with more confidence.
""".strip()


async def main() -> None:
    voice = sys.argv[1] if len(sys.argv) > 1 else "en-US-EmmaNeural"
    communicate = edge_tts.Communicate(
        text=SCRIPT,
        voice=voice,
        rate="+3%",
        pitch="+1Hz",
    )
    await communicate.save(str(OUTPUT))
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    asyncio.run(main())
