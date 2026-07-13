import { useNavigate } from "react-router-dom";
import Shell, { Loading, ErrorBox, CardButton, ScreenPrompt } from "../components/Shell";
import { LanguageSwitcher, useLanguage } from "../i18n";
import { useAuth } from "../auth";
import { THEMES } from "../themes";
import { IconBody, IconStar } from "../icons";

export default function SessionMode() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { loading, authBlock, error, demo, setHasTutor } = useAuth();

  // Same playground background as year / matter / explore
  const shellProps = {
    showLang: false,
    wide: true, // max-w-5xl
    themeUrl: THEMES.parque,
    overlay: "soft",
  };

  if (loading) {
    return (
      <Shell {...shellProps}>
        <Loading />
      </Shell>
    );
  }

  if (authBlock === "sondagem") {
    return (
      <Shell {...shellProps}>
        <ErrorBox message={t("sondagemWait")} />
        <p className="mt-3 text-center text-sm font-semibold text-slate-500">{t("sondagemHint")}</p>
      </Shell>
    );
  }

  if (authBlock === "invalid") {
    return (
      <Shell {...shellProps}>
        <ErrorBox message={error || t("loginRequired")} />
        <a
          href="https://painel.inclusivamentemaiseduca.com.br"
          className="btn-pop mt-5 block bg-violet-600 py-4 text-center text-lg text-white"
        >
          {t("goPanel")}
        </a>
      </Shell>
    );
  }

  function choose(withTutor) {
    setHasTutor(withTutor);
    navigate("/y");
  }

  return (
    <Shell {...shellProps}>
      {demo && (
        <p className="mb-4 rounded-xl bg-amber-100 px-3 py-2 text-center text-xs font-bold text-amber-900">
          {t("demoMode")}
        </p>
      )}

      <ScreenPrompt>{t("pickTutorMode")}</ScreenPrompt>

      <div className="grid gap-3 sm:grid-cols-2">
        <CardButton color="#7C3AED" large onClick={() => choose(true)}>
          <div className="flex flex-col items-center gap-2.5 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <IconBody className="h-9 w-9" />
            </span>
            <span className="text-xl font-black sm:text-2xl">{t("withTutor")}</span>
            <span className="text-sm font-semibold opacity-90">{t("withTutorHint")}</span>
          </div>
        </CardButton>

        <CardButton color="#059669" large onClick={() => choose(false)}>
          <div className="flex flex-col items-center gap-2.5 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <IconStar className="h-9 w-9" />
            </span>
            <span className="text-xl font-black sm:text-2xl">{t("withoutTutor")}</span>
            <span className="text-sm font-semibold opacity-90">{t("withoutTutorHint")}</span>
          </div>
        </CardButton>
      </div>

      {/* Language at bottom — not floating on the art */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <p className="mb-2 text-center text-xs font-bold text-slate-500 sm:text-sm">
          {t("langChangeTip")}
        </p>
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </Shell>
  );
}
