import type { Lang } from "../i18n";

// Diccionario del aviso para dispositivos móviles (MobileZoomNotice).
// El cuerpo va en segmentos (pre/zoom/mid/pct/post) porque el componente
// resalta en negrita "zoom" y el porcentaje; cada idioma redacta la frase
// respetando esa secuencia visual.
export const dict: Record<Lang, Record<string, string>> = {
  en: {
    "mobile.notice.welcome": "Welcome to",
    "mobile.notice.title": "You're on a mobile device",
    "mobile.notice.body.pre":
      "Presentia is designed for large screens. To work comfortably on your phone, ",
    "mobile.notice.body.zoom": "adjust your browser's zoom",
    "mobile.notice.body.mid":
      " until the interface fits — on some devices it's best to reduce it to ",
    "mobile.notice.body.pct": "50%",
    "mobile.notice.body.post": ".",
    "mobile.notice.hint": "Browser menu → Zoom → 50–75%",
    "mobile.notice.button": "Got it!",
    "mobile.notice.footer":
      "This notice won't be shown again on this device.",
  },
  es: {
    "mobile.notice.welcome": "Bienvenido a",
    "mobile.notice.title": "Estás en un dispositivo móvil",
    "mobile.notice.body.pre":
      "Presentia está pensada para pantallas grandes. Para trabajar cómodo desde tu teléfono, ",
    "mobile.notice.body.zoom": "ajustá el zoom del navegador",
    "mobile.notice.body.mid":
      " hasta que la interfaz se vea completa — en algunos dispositivos conviene reducirlo hasta un ",
    "mobile.notice.body.pct": "50%",
    "mobile.notice.body.post": ".",
    "mobile.notice.hint": "Menú del navegador → Zoom → 50–75%",
    "mobile.notice.button": "¡Entendido!",
    "mobile.notice.footer":
      "Este aviso no volverá a mostrarse en este dispositivo.",
  },
  fr: {
    "mobile.notice.welcome": "Bienvenue sur",
    "mobile.notice.title": "Vous êtes sur un appareil mobile",
    "mobile.notice.body.pre":
      "Presentia est conçue pour les grands écrans. Pour travailler confortablement sur votre téléphone, ",
    "mobile.notice.body.zoom": "ajustez le zoom du navigateur",
    "mobile.notice.body.mid":
      " jusqu'à ce que l'interface s'affiche entièrement — sur certains appareils, mieux vaut le réduire jusqu'à ",
    "mobile.notice.body.pct": "50 %",
    "mobile.notice.body.post": ".",
    "mobile.notice.hint": "Menu du navigateur → Zoom → 50–75 %",
    "mobile.notice.button": "Compris !",
    "mobile.notice.footer":
      "Cet avis ne s'affichera plus sur cet appareil.",
  },
  pt: {
    "mobile.notice.welcome": "Bem-vindo ao",
    "mobile.notice.title": "Você está em um dispositivo móvel",
    "mobile.notice.body.pre":
      "O Presentia foi pensado para telas grandes. Para trabalhar com conforto no seu telefone, ",
    "mobile.notice.body.zoom": "ajuste o zoom do navegador",
    "mobile.notice.body.mid":
      " até a interface aparecer por completo — em alguns aparelhos vale reduzi-lo até ",
    "mobile.notice.body.pct": "50%",
    "mobile.notice.body.post": ".",
    "mobile.notice.hint": "Menu do navegador → Zoom → 50–75%",
    "mobile.notice.button": "Entendi!",
    "mobile.notice.footer":
      "Este aviso não será mostrado novamente neste dispositivo.",
  },
  it: {
    "mobile.notice.welcome": "Benvenuto in",
    "mobile.notice.title": "Sei su un dispositivo mobile",
    "mobile.notice.body.pre":
      "Presentia è pensata per schermi grandi. Per lavorare comodamente dal telefono, ",
    "mobile.notice.body.zoom": "regola lo zoom del browser",
    "mobile.notice.body.mid":
      " finché l'interfaccia non è tutta visibile — su alcuni dispositivi conviene ridurlo fino al ",
    "mobile.notice.body.pct": "50%",
    "mobile.notice.body.post": ".",
    "mobile.notice.hint": "Menu del browser → Zoom → 50–75%",
    "mobile.notice.button": "Capito!",
    "mobile.notice.footer":
      "Questo avviso non verrà più mostrato su questo dispositivo.",
  },
  zh: {
    "mobile.notice.welcome": "欢迎使用",
    "mobile.notice.title": "您正在使用移动设备",
    "mobile.notice.body.pre":
      "Presentia 专为大屏幕设计。若要在手机上舒适使用，请",
    "mobile.notice.body.zoom": "调整浏览器的缩放",
    "mobile.notice.body.mid": "，直到界面完整显示——某些设备建议缩小到 ",
    "mobile.notice.body.pct": "50%",
    "mobile.notice.body.post": "。",
    "mobile.notice.hint": "浏览器菜单 → 缩放 → 50–75%",
    "mobile.notice.button": "知道了！",
    "mobile.notice.footer": "此提示不会在本设备上再次显示。",
  },
  ja: {
    "mobile.notice.welcome": "ようこそ",
    "mobile.notice.title": "モバイル端末をご利用中です",
    "mobile.notice.body.pre":
      "Presentia は大画面向けに設計されています。スマートフォンで快適に使うには、画面全体が収まるまで",
    "mobile.notice.body.zoom": "ブラウザのズームを調整",
    "mobile.notice.body.mid": "してください。端末によっては ",
    "mobile.notice.body.pct": "50%",
    "mobile.notice.body.post": " まで縮小するとちょうどよくなります。",
    "mobile.notice.hint": "ブラウザのメニュー → ズーム → 50–75%",
    "mobile.notice.button": "わかりました",
    "mobile.notice.footer": "このお知らせはこの端末では再表示されません。",
  },
};
