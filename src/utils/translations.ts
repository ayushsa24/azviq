import { LanguageCode } from "@/contexts/LanguageContext";

type TranslationSet = {
  dashboard: string;
  library: string;
  ai_chat: string;
  tasks: string;
  preparation: string;
  settings: string;
  logout: string;
  general: string;
  notifications: string;
  data_controls: string;
  account: string;
  parent_control: string;
  theme: string;
  dark: string;
  light: string;
  language: string;
};

export const translations: Record<LanguageCode, TranslationSet> = {
  en: {
    dashboard: "Dashboard",
    library: "Library",
    ai_chat: "AI Chat",
    tasks: "Tasks",
    preparation: "Preparation",
    settings: "Settings",
    logout: "Log Out",
    general: "General",
    notifications: "Notifications",
    data_controls: "Data Controls",
    account: "Account",
    parent_control: "Parent Control",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    language: "Language",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    library: "पुस्तकालय",
    ai_chat: "AI चैट",
    tasks: "कार्य",
    preparation: "तैयारी",
    settings: "सेटिंग्स",
    logout: "लॉग आउट",
    general: "सामान्य",
    notifications: "सूचनाएं",
    data_controls: "डेटा नियंत्रण",
    account: "खाता",
    parent_control: "अभिभावक नियंत्रण",
    theme: "थीम",
    dark: "डार्क",
    light: "लाइट",
    language: "भाषा",
  },
  kn: {
    dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    library: "ಗ್ರಂಥಾಲಯ",
    ai_chat: "AI ಚಾಟ್",
    tasks: "ಕಾರ್ಯಗಳು",
    preparation: "ತಯಾರಿ",
    settings: "ಸೆಟ್ಟಿಂಗ್‍ಗಳು",
    logout: "ಲಾಗ್ ಔಟ್",
    general: "ಸಾಮಾನ್ಯ",
    notifications: "ಅಧಿಸೂಚನೆಗಳು",
    data_controls: "ದತ್ತಾಂಶ ನಿಯಂತ್ರಣ",
    account: "ಖಾತೆ",
    parent_control: "ಪೋಷಕ ನಿಯಂತ್ರಣ",
    theme: "ಥೀಮ್",
    dark: "ಗಾಢ",
    light: "ತಿಳಿ",
    language: "ಭಾಷೆ",
  },
  ta: {
    dashboard: "டாஷ்போர்டு",
    library: "நூலகம்",
    ai_chat: "AI அரட்டை",
    tasks: "பணிகள்",
    preparation: "தயாரிப்பு",
    settings: "அமைப்புகள்",
    logout: "வெளியேறு",
    general: "பொது",
    notifications: "அறிவிப்புகள்",
    data_controls: "தரவு கட்டுப்பாடுகள்",
    account: "கணக்கு",
    parent_control: "பெற்றோர் கட்டுப்பாடு",
    theme: "தீம்",
    dark: "இருண்ட",
    light: "வெளிர்",
    language: "மொழி",
  },
  te: {
    dashboard: "డాష్‌బోర్డ్",
    library: "గ్రంథాలయం",
    ai_chat: "AI చాట్",
    tasks: "పనులు",
    preparation: "సన్నాహం",
    settings: "సెట్టింగ్‌లు",
    logout: "లాగ్ అవుట్",
    general: "సాధారణ",
    notifications: "నోటిఫికేషన్లు",
    data_controls: "డేటా నియంత్రణలు",
    account: "ఖాతా",
    parent_control: "తల్లిదండ్రుల నియంత్రణ",
    theme: "థీమ్",
    dark: "చీకటి",
    light: "వెలుతురు",
    language: "భాష",
  },
  es: {
    dashboard: "Panel",
    library: "Biblioteca",
    ai_chat: "Chat IA",
    tasks: "Tareas",
    preparation: "Preparación",
    settings: "Ajustes",
    logout: "Cerrar sesión",
    general: "General",
    notifications: "Notificaciones",
    data_controls: "Control de datos",
    account: "Cuenta",
    parent_control: "Control parental",
    theme: "Tema",
    dark: "Oscuro",
    light: "Claro",
    language: "Idioma",
  },
  fr: {
    dashboard: "Tableau de bord",
    library: "Bibliothèque",
    ai_chat: "Chat IA",
    tasks: "Tâches",
    preparation: "Préparation",
    settings: "Paramètres",
    logout: "Déconnexion",
    general: "Général",
    notifications: "Notifications",
    data_controls: "Contrôle des données",
    account: "Compte",
    parent_control: "Contrôle parental",
    theme: "Thème",
    dark: "Sombre",
    light: "Clair",
    language: "Langue",
  },
};
