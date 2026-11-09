import type { Txt } from '../i18n';

/**
 * Signature des chauffeurs. La page reste masquée tant que `url` et `responsable`
 * ne sont pas renseignés (voir apps-script/INSTALLATION.md).
 */
export const signatureConfig = {
  /** URL du déploiement Google Apps Script (se termine par /exec) */
  url: 'https://script.google.com/macros/s/AKfycbw3t1mHElmAk2J3yNvJ5RAi_WBgRx6LY-P8sEBdgCPbblO5KTQCZtoOAkBAtAvEXydj/exec',
  /** Nom de l'entreprise qui conserve les signatures, affiché au chauffeur */
  responsable: 'SMBP',
  /**
   * À changer dès que le plan ou les consignes changent : les chauffeurs
   * peuvent alors signer la nouvelle version, et chaque signature indique
   * laquelle a été présentée.
   */
  version: '2026-11-04',
  /**
   * Boutons « Signer le plan et les consignes » de l'accueil et des plans 1 et 2.
   * Mettre `true` pour les réafficher. La page /carriere/signature/ reste accessible dans tous les cas.
   */
  boutons: false,
};

export const signatureActive = () => signatureConfig.url !== '' && signatureConfig.responsable !== '';

/** Les boutons vers la signature sont-ils affichés ? */
export const signatureButtons = () => signatureActive() && signatureConfig.boutons;

/** Textes de la page de signature */
export const sig = {
  title: { fr: 'Signature du plan et des consignes', en: 'Sign the map and safety rules', ro: 'Semnarea planului și a regulilor', pl: 'Podpis planu i zasad', pt: 'Assinatura do plano e das regras' },
  lead: {
    fr: 'Lisez le plan et les consignes, puis signez pour attester que vous en avez pris connaissance.',
    en: 'Read the map and the rules, then sign to confirm that you have read them.',
    ro: 'Citiți planul și regulile, apoi semnați pentru a confirma că ați luat la cunoștință.',
    pl: 'Przeczytaj plan i zasady, a następnie podpisz, aby potwierdzić zapoznanie się z nimi.',
    pt: 'Leia o plano e as regras e depois assine para confirmar que tomou conhecimento.',
  },
  version: { fr: 'Version', en: 'Version', ro: 'Versiunea', pl: 'Wersja', pt: 'Versão' },
  read: { fr: '1. À lire', en: '1. Please read', ro: '1. De citit', pl: '1. Do przeczytania', pt: '1. A ler' },
  map: { fr: 'Plan de circulation', en: 'Traffic plan', ro: 'Plan de circulație', pl: 'Plan ruchu', pt: 'Plano de circulação' },
  openMap: { fr: 'Ouvrir le plan complet dans un nouvel onglet', en: 'Open the full map in a new tab', ro: 'Deschideți planul complet într-o filă nouă', pl: 'Otwórz pełny plan w nowej karcie', pt: 'Abrir o plano completo num novo separador' },
  hopper: { fr: 'Poste de chargement (trémie)', en: 'Loading point (hopper)', ro: 'Punctul de încărcare (buncăr)', pl: 'Punkt załadunku (kosz zasypowy)', pt: 'Posto de carga (tremonha)' },
  sign: { fr: '2. Vos informations et votre signature', en: '2. Your details and signature', ro: '2. Datele și semnătura dumneavoastră', pl: '2. Twoje dane i podpis', pt: '2. Os seus dados e a sua assinatura' },
  name: { fr: 'Nom et prénom', en: 'Full name', ro: 'Nume și prenume', pl: 'Imię i nazwisko', pt: 'Nome completo' },
  company: { fr: 'Société', en: 'Company', ro: 'Firma', pl: 'Firma', pt: 'Empresa' },
  plate: { fr: 'Immatriculation du camion', en: 'Truck registration', ro: 'Numărul de înmatriculare', pl: 'Numer rejestracyjny', pt: 'Matrícula do camião' },
  badge: { fr: 'Numéro de badge (facultatif)', en: 'Badge number (optional)', ro: 'Numărul ecusonului (opțional)', pl: 'Numer identyfikatora (opcjonalnie)', pt: 'Número do cartão (opcional)' },
  accept: {
    fr: 'J’ai pris connaissance du plan de circulation et des consignes de sécurité, et je m’engage à les respecter.',
    en: 'I have read the traffic plan and the safety rules, and I agree to follow them.',
    ro: 'Am luat la cunoștință planul de circulație și regulile de siguranță și mă angajez să le respect.',
    pl: 'Zapoznałem(-am) się z planem ruchu i zasadami bezpieczeństwa i zobowiązuję się ich przestrzegać.',
    pt: 'Tomei conhecimento do plano de circulação e das regras de segurança e comprometo-me a respeitá-los.',
  },
  signHere: { fr: 'Signez au doigt dans le cadre', en: 'Sign with your finger in the box', ro: 'Semnați cu degetul în chenar', pl: 'Podpisz palcem w ramce', pt: 'Assine com o dedo no quadro' },
  clear: { fr: 'Effacer la signature', en: 'Clear signature', ro: 'Ștergeți semnătura', pl: 'Wyczyść podpis', pt: 'Apagar a assinatura' },
  submit: { fr: 'Signer et envoyer', en: 'Sign and send', ro: 'Semnați și trimiteți', pl: 'Podpisz i wyślij', pt: 'Assinar e enviar' },
  sending: { fr: 'Envoi en cours…', en: 'Sending…', ro: 'Se trimite…', pl: 'Wysyłanie…', pt: 'A enviar…' },
  missing: {
    fr: 'Remplissez tous les champs, cochez la case et signez.',
    en: 'Fill in all the fields, tick the box and sign.',
    ro: 'Completați toate câmpurile, bifați caseta și semnați.',
    pl: 'Wypełnij wszystkie pola, zaznacz pole wyboru i złóż podpis.',
    pt: 'Preencha todos os campos, assinale a caixa e assine.',
  },
  error: {
    fr: 'L’envoi a échoué et la signature n’est pas enregistrée. Vérifiez le réseau, puis réessayez.',
    en: 'Sending failed and the signature was not saved. Check your network and try again.',
    ro: 'Trimiterea a eșuat, iar semnătura nu a fost înregistrată. Verificați rețeaua și încercați din nou.',
    pl: 'Wysyłanie nie powiodło się, a podpis nie został zapisany. Sprawdź sieć i spróbuj ponownie.',
    pt: 'O envio falhou e a assinatura não foi guardada. Verifique a rede e tente novamente.',
  },
  privacy: {
    fr: '{r} conserve votre nom, votre société, votre immatriculation, votre badge, votre signature et la date, pour prouver que vous avez pris connaissance de ces consignes. Pour consulter, corriger ou effacer ces données, adressez-vous à la bascule.',
    en: '{r} keeps your name, company, registration, badge, signature and the date, as proof that you have read these rules. To access, correct or delete this data, ask at the weighbridge.',
    ro: '{r} păstrează numele, firma, numărul de înmatriculare, ecusonul, semnătura și data, ca dovadă că ați luat la cunoștință aceste reguli. Pentru a consulta, corecta sau șterge aceste date, adresați-vă la cântar.',
    pl: '{r} przechowuje imię i nazwisko, firmę, numer rejestracyjny, identyfikator, podpis i datę jako dowód zapoznania się z tymi zasadami. Aby uzyskać dostęp do tych danych, poprawić je lub usunąć, zgłoś się na wagę.',
    pt: '{r} conserva o seu nome, empresa, matrícula, cartão, assinatura e a data, como prova de que tomou conhecimento destas regras. Para consultar, corrigir ou apagar estes dados, dirija-se à báscula.',
  },
  /** Choix de l'entreprise : conservation sans limite de durée, dit clairement au chauffeur avant qu'il signe */
  retention: {
    fr: 'Ces données sont conservées sans limite de durée.',
    en: 'This data is kept with no time limit.',
    ro: 'Aceste date sunt păstrate fără limită de timp.',
    pl: 'Dane te są przechowywane bez ograniczenia czasowego.',
    pt: 'Estes dados são conservados sem limite de tempo.',
  },
  doneTitle: { fr: 'Signature enregistrée', en: 'Signature saved', ro: 'Semnătură înregistrată', pl: 'Podpis zapisany', pt: 'Assinatura guardada' },
  signedOn: { fr: 'Signé le', en: 'Signed on', ro: 'Semnat la', pl: 'Podpisano', pt: 'Assinado em' },
  another: { fr: 'Signer pour un autre chauffeur', en: 'Sign for another driver', ro: 'Semnați pentru alt șofer', pl: 'Podpisz dla innego kierowcy', pt: 'Assinar para outro motorista' },
  home: { fr: 'Retour à l’accueil', en: 'Back to home', ro: 'Înapoi la pagina principală', pl: 'Powrót do strony głównej', pt: 'Voltar à página inicial' },
  notActive: {
    fr: 'La signature n’est pas encore activée.',
    en: 'Signing is not available yet.',
    ro: 'Semnarea nu este încă disponibilă.',
    pl: 'Podpisywanie nie jest jeszcze dostępne.',
    pt: 'A assinatura ainda não está disponível.',
  },
  homeTitle: { fr: 'Signer le plan et les consignes', en: 'Sign the map and rules', ro: 'Semnați planul și regulile', pl: 'Podpisz plan i zasady', pt: 'Assinar o plano e as regras' },
  homeText: {
    fr: 'À faire une fois, puis à chaque nouvelle version des consignes.',
    en: 'To do once, then again for each new version of the rules.',
    ro: 'O singură dată, apoi la fiecare versiune nouă a regulilor.',
    pl: 'Raz, a potem przy każdej nowej wersji zasad.',
    pt: 'A fazer uma vez e depois a cada nova versão das regras.',
  },
  homeDone: { fr: 'Déjà signé sur ce téléphone', en: 'Already signed on this phone', ro: 'Deja semnat pe acest telefon', pl: 'Już podpisano na tym telefonie', pt: 'Já assinado neste telemóvel' },
} satisfies Record<string, Txt>;
