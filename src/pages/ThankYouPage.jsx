import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Home } from "lucide-react";

export default function ThankYouPage() {
  useEffect(() => {
    document.title = "Request Received | Below Market Apartments";

    let robotsMeta = document.querySelector('meta[name="robots"]');
    const previousRobotsContent = robotsMeta?.getAttribute("content");
    const createdRobotsMeta = !robotsMeta;

    if (!robotsMeta) {
      robotsMeta = document.createElement("meta");
      robotsMeta.setAttribute("name", "robots");
      document.head.appendChild(robotsMeta);
    }

    robotsMeta.setAttribute("content", "noindex, nofollow");

    return () => {
      if (createdRobotsMeta) {
        robotsMeta.remove();
        return;
      }

      if (previousRobotsContent) {
        robotsMeta.setAttribute("content", previousRobotsContent);
      } else {
        robotsMeta.removeAttribute("content");
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f8f1] px-6 py-8 text-[#102426]">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#173f3f] shadow-sm ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
        >
          <Home className="h-4 w-4" />
          Below Market Apartments
        </Link>

        <section className="mt-10 w-full rounded-3xl border border-[#d7e6df] bg-white p-8 shadow-sm md:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#d8efe6]">
            <CheckCircle2 className="h-8 w-8 text-[#1f6f63]" />
          </div>

          <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[#1f6f63]">
            Request Received
          </p>

          <h1 className="mt-3 text-4xl font-black text-[#102426] md:text-5xl">
            Your apartment search is in.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg font-semibold leading-8 text-[#526260]">
            We will review your preferences, match you with current Dallas apartment specials, and follow up with options that fit your search.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              to="/properties"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#173f3f] px-5 py-4 text-sm font-black text-white hover:bg-[#102426]"
            >
              Browse Current Deals
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/start"
              className="inline-flex items-center justify-center rounded-2xl bg-[#e7f3ee] px-5 py-4 text-sm font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#d7e6df]"
            >
              Start Another Search
            </Link>
          </div>

          <p className="mt-6 text-sm font-semibold text-[#637370]">
            For faster help, call or text 945-269-3768.
          </p>
        </section>
      </div>
    </main>
  );
}
