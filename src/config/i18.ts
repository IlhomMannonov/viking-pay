import i18n from 'i18n';
import path from 'path';

i18n.configure({
    locales: ['uz', 'ru'],             // mavjud tillar
    directory: path.join(__dirname, '../../lang'), // tarjima fayllar joyi
    defaultLocale: 'uz',                     // standart til
    queryParameter: 'lang',                  // ?lang=uz orqali til uzatish
    autoReload: true,                        // fayl o‘zgarsa reload qilinadi (dev uchun)
    objectNotation: true,                    // nested object qo‘llab-quvvatlansin
    register: global                         // __() ni globalga ro‘yxatga olish
});

export default i18n;
