import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] px-6 text-center">
      <div className="max-w-md">
        <p className="text-sm font-medium text-zinc-400">404</p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-100">
          Page not found
        </h1>

        <p className="mt-4 text-base text-zinc-400">
          Sorry, the page you’re looking for doesn’t exist or has been moved.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            to="/"
            className="rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
          >
            Go home
          </Link>

          <button
            onClick={() => window.history.back()}
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
