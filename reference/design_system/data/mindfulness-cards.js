/* Musie clickdummy — prototype data.
 *
 * PLACEHOLDER CONTENT. The authoritative source is the Mindfulness Cards
 * Google Sheet, which was not connected when this was built. Every string and
 * link below is stand-in copy written to the shape the flow needs; swapping in
 * the real sheet is one edit to this file and nothing else.
 *
 * Audio is SELF-HOSTED as of MVP 0.3. The Spotify hand-off is gone: its embed
 * serves 30 seconds on mobile, its policy forbids hiding the track, and its
 * Play Button may not be used commercially — all three fatal to a paid product
 * whose premise is a listener who is not primed by the track name.
 *
 * spotify is KEPT, and only for the superseded snapshots: MVP 0.2 and the
 * original clickdummy gate their Listen step on clicking that link, so dropping
 * the field would leave them with a dead primary CTA and no way forward. MVP 0.3
 * contains no reference to it — that is where "delete every reference" applies.
 *
 * audio.src points at a file musie serves. No files are bundled yet, so the
 * paths below are the shape the flow needs and the transport falls back to a
 * simulated clock when one 404s. audio.title and audio.artist are ANSWERS:
 * they must never render before the listener asks for the reveal. duration is
 * in seconds, so a countdown can render before the file has loaded.
 *
 * Images: assets/web/method-card.png stands in for every card and method
 * visual until the real artwork exists.
 */
window.MUSIE_DATA = {
  user: { name: 'Lucy', email: 'ldamn@nitz.com' },

  /* imageAlt is required per option by RadioGroupImage: the picture is how the
     option is recognised, so alt="" must not be reachable. All four point at
     the same placeholder until the real artwork lands. */
  userTypes: [
    { id: 'by-myself', label: 'By myself', implemented: true, imageAlt: 'Placeholder artwork for using Musie by yourself' },
    { id: 'with-a-group', label: 'With a group', implemented: false, imageAlt: 'Placeholder artwork for using Musie with a group' },
    { id: 'with-my-partner', label: 'With my partner', implemented: false, imageAlt: 'Placeholder artwork for using Musie with your partner' },
    { id: 'with-a-patient', label: 'With a patient', implemented: false, imageAlt: 'Placeholder artwork for using Musie with a patient' },
  ],

  situations: [
    { id: 'feel-feelings', label: 'Feel my feelings' },
    { id: 'get-day-started', label: 'Get the day started' },
    { id: 'relax-busy-day', label: 'Relax during a busy day' },
  ],

  methods: [
    {
      id: 'mindfulness-cards',
      name: 'Quick Mindfulness Break',
      description: 'Nine paper cards, one feeling each. Scan the card you relate to and listen to the track behind it.',
      /* CONDITIONS, as data rather than prose. The card renders these as
         glyphs; timeframeMin/Max are minutes and are what "time needed"
         means — a range, because the reflection has no fixed length. */
      timeframeMin: 2,
      timeframeMax: 12,
      needsCards: true,
      needsSound: true,
      image: 'assets/web/method-card.png',
      imageAlt: 'The Mindfulness Cards deck laid out on a table',
      implemented: true,
      needs: 'Your physical Mindfulness Cards deck',
      guideline: 'Work with the card you are drawn to, not the one you think you should pick.',
      duration: 'About 15 minutes',
    },
    {
      id: 'breathing-score',
      name: 'Breathing Score',
      description: 'A slow score that follows your breath, for settling before anything else.',
      timeframeMin: 5,
      timeframeMax: 8,
      needsCards: false,
      needsSound: true,
      image: 'assets/web/method-card.png',
      imageAlt: 'Placeholder artwork for the Breathing Score Method',
      implemented: false,
    },
    {
      id: 'body-scan-soundwalk',
      name: 'Body Scan Soundwalk',
      description: 'A guided walk through the body, one sound at a time.',
      timeframeMin: 15,
      timeframeMax: 20,
      needsCards: false,
      needsSound: true,
      image: 'assets/web/method-card.png',
      imageAlt: 'Placeholder artwork for the Body Scan Soundwalk Method',
      implemented: false,
    },
  ],

  /** Which Methods each Situation surfaces. Mindfulness Cards is in all three
   *  because it is the one implemented path. */
  matches: {
    'feel-feelings': ['mindfulness-cards', 'breathing-score'],
    'get-day-started': ['mindfulness-cards', 'body-scan-soundwalk'],
    'relax-busy-day': ['mindfulness-cards', 'breathing-score', 'body-scan-soundwalk'],
  },

  /** The 3 x 3 grid. Every card carries a QR code on the paper original. */
  cards: [
    {
      id: 'mc-01', code: 'MC-01', feeling: 'Joy',
      listening: 'Play it once through without doing anything else. Notice where in your body the joy sits.',
      audio: { src: 'assets/audio/mc-01-joy.mp3', title: 'Morgenlicht', artist: 'Ida Sperber', duration: 196 },
      spotify: 'https://open.spotify.com/search/joyful%20piano',   // superseded snapshots only
      question: 'Where did you feel the joy in your body?',
    },
    {
      id: 'mc-02', code: 'MC-02', feeling: 'Sadness',
      listening: 'Let the track run to the end, even if it gets uncomfortable. You do not have to do anything with it.',
      audio: { src: 'assets/audio/mc-02-sadness.mp3', title: 'Langsames Wasser', artist: 'Ensemble Nord', duration: 241 },
      spotify: 'https://open.spotify.com/search/melancholy%20strings',   // superseded snapshots only
      question: 'What did the sadness want you to know?',
    },
    {
      id: 'mc-03', code: 'MC-03', feeling: 'Anger',
      listening: 'Listen loudly if you can. Let the volume carry it instead of holding it.',
      audio: { src: 'assets/audio/mc-03-anger.mp3', title: 'Schwere Luft', artist: 'Kollektiv Rau', duration: 178 },
      spotify: 'https://open.spotify.com/search/intense%20percussion',   // superseded snapshots only
      question: 'What is the anger protecting?',
    },
    {
      id: 'mc-04', code: 'MC-04', feeling: 'Fear',
      listening: 'Sit with your back supported. Breathe out longer than you breathe in while it plays.',
      audio: { src: 'assets/audio/mc-04-fear.mp3', title: 'Unter der Decke', artist: 'Mara Vogt', duration: 263 },
      spotify: 'https://open.spotify.com/search/ambient%20calm',   // superseded snapshots only
      question: 'What would make this feel one step safer?',
    },
    {
      id: 'mc-05', code: 'MC-05', feeling: 'Calm',
      listening: 'Close your eyes for the first minute. Open them when you are ready.',
      audio: { src: 'assets/audio/mc-05-calm.mp3', title: 'Stiller Raum', artist: 'Jonas Leie', duration: 228 },
      spotify: 'https://open.spotify.com/search/peaceful%20piano',   // superseded snapshots only
      question: 'What helped the calm arrive?',
    },
    {
      id: 'mc-06', code: 'MC-06', feeling: 'Longing',
      listening: 'Let yourself picture whoever or whatever comes up. Do not push it away.',
      audio: { src: 'assets/audio/mc-06-longing.mp3', title: 'Weiter Weg', artist: 'Trio Halbmond', duration: 254 },
      spotify: 'https://open.spotify.com/search/nostalgic%20cello',   // superseded snapshots only
      question: 'Who or what came up while you listened?',
    },
    {
      id: 'mc-07', code: 'MC-07', feeling: 'Gratitude',
      listening: 'Listen while looking out of a window, if you have one.',
      audio: { src: 'assets/audio/mc-07-gratitude.mp3', title: 'Kalte Sonne', artist: 'Ben Aster', duration: 214 },
      spotify: 'https://open.spotify.com/search/warm%20acoustic%20guitar',   // superseded snapshots only
      question: 'What are you grateful for right now?',
    },
    {
      id: 'mc-08', code: 'MC-08', feeling: 'Loneliness',
      listening: 'Put the card where you can see it. The track is company, not a fix.',
      audio: { src: 'assets/audio/mc-08-loneliness.mp3', title: 'Ein Stuhl am Fenster', artist: 'Ida Sperber', duration: 205 },
      spotify: 'https://open.spotify.com/search/quiet%20solo%20piano',   // superseded snapshots only
      question: 'What kind of company would help most today?',
    },
    {
      id: 'mc-09', code: 'MC-09', feeling: 'Hope',
      listening: 'Listen standing up. Move if you want to.',
      audio: { src: 'assets/audio/mc-09-hope.mp3', title: 'Aufgehen', artist: 'Ensemble Nord', duration: 187 },
      spotify: 'https://open.spotify.com/search/uplifting%20ambient',   // superseded snapshots only
      question: 'What are you hoping for?',
    },
  ],
};
