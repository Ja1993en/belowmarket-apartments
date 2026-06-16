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
Apartment hunting should not feel like solving a mystery. Every property has a different special, and renters need the real numbers. That is where Below Market Apartments comes in. Browse current specials near you, tap Compare on the properties that catch your attention, and add the floor plans that fit your budget. Now you can see normal rent, estimated rent after the special, and monthly savings side by side. That matters, because the best-looking listing is not always the best deal. Compare properties first, floor plans next, and details when you are ready. Below Market Apartments. Find the best apartment deals near you, and tour with confidence.
""".strip()


async def main() -> None:
    voice = sys.argv[1] if len(sys.argv) > 1 else "en-US-RogerNeural"
    communicate = edge_tts.Communicate(
        text=SCRIPT,
        voice=voice,
        rate="+12%",
        pitch="+2Hz",
    )
    await communicate.save(str(OUTPUT))
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    asyncio.run(main())
