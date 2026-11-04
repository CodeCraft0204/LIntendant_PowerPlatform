import { LANGUAGES, useI18n } from "../i18n/index.js"

// FR / EN switch, fixed in the top-right corner of every page (sign-in
// included). The position is the .lang-toggle rule in styles/app.css.
export default function LanguageToggle() {
  const { lang, setLang, t } = useI18n()
  return (
    <div className="lang-toggle" role="group" aria-label={t("language.label")}>
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          lang={language.code}
          aria-pressed={lang === language.code}
          title={language.name}
          onClick={() => setLang(language.code)}
        >
          {language.short}
        </button>
      ))}
    </div>
  )
}
