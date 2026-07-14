import { useAuth } from "../auth";
import { useLanguage } from "../i18n";
import { usePersona } from "../persona";
import { Link, useLocation } from "react-router-dom";

/**
 * Fixed red header when JWT marks admin / gestor.
 */
export default function AdminBanner() {
  const { isAdmin, user } = useAuth();
  const { t } = useLanguage();
  const { slug, persona } = usePersona();
  const location = useLocation();

  if (!isAdmin) return null;

  const name = user?.name || user?.fullName || user?.email || "";
  const onAdminPick = location.pathname.startsWith("/admin");

  return (
    <div
      role="status"
      className="sticky top-0 z-[99950] border-b-2 border-red-800 bg-red-600 px-3 py-2 text-white shadow-lg"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold leading-snug sm:text-base">
          ⚠ {t("adminBanner")}
          {name ? (
            <span className="ml-1 font-semibold opacity-90">
              ({name})
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold sm:text-sm">
          {slug && (
            <span className="rounded-full bg-red-800/50 px-2.5 py-1">
              {t("adminPersona")}: {persona?.name || slug}
            </span>
          )}
          {!onAdminPick && (
            <Link
              to="/admin"
              className="rounded-full bg-white px-3 py-1 font-extrabold text-red-700 shadow hover:bg-red-50"
            >
              {t("adminChangePersona")}
            </Link>
          )}
        </div>
      </div>
      <p className="mx-auto mt-1 max-w-5xl text-[11px] font-semibold leading-snug text-red-100 sm:text-xs">
        {t("adminBannerHint")}
      </p>
    </div>
  );
}
