Object.defineProperty(Vue.prototype, 'WebMidi', {value: WebMidi});
const {
    Renderer, Stave, StaveNote, Voice, Formatter, Accidental, StaveConnector, FretHandFinger, Modifier,
    KeySignature, KeyManager, StaveText, StaveModifierPosition
} = Vex.Flow;
const {Tabs, TabPane, ColorPicker} = iview
const scorePanelBaseWidthHeight = 320

var i18n = new VueI18n({
    locale: 'zh_CN',
    messages: i18nMessages
})

var app = new Vue({
    el: '#app',
    i18n,
    props: {},
    components: {
        'ITabs': Tabs,
        'ITabPane': TabPane,
        'IColorPicker': ColorPicker,
    },
    data: {
        nbKeys: 88,
        offsetKeys: 21,
        transpose: 0,
        errorMessage: null,
        selectedMidiInputId: null,
        midiInput: null,
        keys: [],
        holdPedal: false,
        pageWidth: window.innerWidth,
        pageHeight: window.innerHeight,
        keyWidth: null,
        blackKeyWidth: null,
        keyList: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B', 'Db', 'Gb', 'Cb'],
        keyScaleList: {
            'C': null, 'C#': '#', 'D': '#', 'Eb': 'b', 'E': '#', 'F': 'b', 'F#': '#', 'G': '#',
            'Ab': 'b', 'A': '#', 'Bb': 'b', 'B': '#', 'Db': 'b', 'Gb': 'b', 'Cb': 'b'
        },
        keyNoteList: {
            'C': [null, null, null, null, null, null, null],
            'C#': ['#', '#', '#', '#', '#', '#', '#'],
            'D': ['#', null, null, '#', null, null, null],
            'Eb': [null, null, 'b', null, null, 'b', 'b'],
            'E': ['#', '#', null, '#', '#', null, null],
            'F': [null, null, null, null, null, null, 'b'],
            'F#': ['#', '#', '#', '#', '#', '#', null],
            'G': [null, null, null, '#', null, null, null],
            'Ab': [null, 'b', 'b', null, null, 'b', 'b'],
            'A': ['#', null, null, '#', '#', null, null],
            'Bb': [null, null, 'b', null, null, null, 'b'],
            'B': ['#', '#', null, '#', '#', '#', null],
            'Db': [null, 'b', 'b', null, 'b', 'b', 'b'],
            'Gb': ['b', 'b', 'b', null, 'b', 'b', 'b'],
            'Cb': ['b', 'b', 'b', 'b', 'b', 'b', 'b']
        },
        keyNoteDict: {
            'C': ['c', 'c#', 'd', 'eb', 'e', 'f', 'f#', 'g', 'ab', 'a', 'bb', 'b'],
            'C#': ['cn', 'c', 'dn', 'd', 'en', 'fn', 'f', 'gn', 'g', 'an', 'a', 'bn'],
            'D': ['cn', 'c', 'd', 'd#', 'e', 'fn', 'f', 'g', 'g#', 'a', 'a#', 'b'],
            'Eb': ['c', 'db', 'd', 'e', 'en', 'f', 'gb', 'g', 'a', 'an', 'b', 'bn'],
            'E': ['cn', 'c', 'dn', 'd', 'e', 'fn', 'f', 'gn', 'g', 'a', 'a#', 'b'],
            'F': ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'b', 'bn'],
            'F#': ['cn', 'c', 'dn', 'd', 'en', 'fn', 'f', 'gn', 'g', 'an', 'a', 'b'],
            'G': ['c', 'c#', 'd', 'd#', 'e', 'fn', 'f', 'g', 'g#', 'a', 'a#', 'b'],
            'Ab': ['c', 'd', 'dn', 'e', 'en', 'f', 'gb', 'g', 'a', 'an', 'b', 'bn'],
            'A': ['cn', 'c', 'd', 'd#', 'e', 'fn', 'f', 'gn', 'g', 'a', 'a#', 'b'],
            'Bb': ['c', 'db', 'd', 'e', 'en', 'f', 'gb', 'g', 'ab', 'a', 'b', 'bn'],
            'B': ['cn', 'c', 'dn', 'd', 'e', 'fn', 'f', 'gn', 'g', 'an', 'a', 'b'],
            'Db': ['c', 'd', 'dn', 'e', 'en', 'f', 'g', 'gn', 'a', 'an', 'b', 'bn'],
            'Gb': ['cn', 'd', 'dn', 'e', 'en', 'f', 'g', 'gn', 'a', 'an', 'b', 'bn'],
            'Cb': ['cn', 'd', 'dn', 'e', 'en', 'fn', 'g', 'gn', 'a', 'an', 'b', 'bn']
        },
        keyFretDict: {
            'C': ['c', 'c#', 'd', 'eb', 'e', 'f', 'f#', 'g', 'ab', 'a', 'bb', 'b'],
            'C#': ['c♮', 'c#', 'd♮', 'd#', 'e♮', 'f♮', 'f#', 'g♮', 'g#', 'a♮', 'a#', 'b♮'],
            'D': ['c♮', 'c#', 'd', 'd#', 'e', 'f♮', 'f#', 'g', 'g#', 'a', 'a#', 'b'],
            'Eb': ['c', 'db', 'd', 'eb', 'e♮', 'f', 'gb', 'g', 'ab', 'a♮', 'bb', 'b♮'],
            'E': ['c♮', 'c#', 'd♮', 'd#', 'e', 'f♮', 'f#', 'g♮', 'g#', 'a', 'a#', 'b'],
            'F': ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b♮'],
            'F#': ['c♮', 'c#', 'd♮', 'd#', 'e♮', 'f♮', 'f#', 'g♮', 'g#', 'a♮', 'a#', 'b'],
            'G': ['c', 'c#', 'd', 'd#', 'e', 'f♮', 'f#', 'g', 'g#', 'a', 'a#', 'b'],
            'Ab': ['c', 'db', 'd♮', 'eb', 'e♮', 'f', 'gb', 'g', 'ab', 'a♮', 'bb', 'b♮'],
            'A': ['c♮', 'c#', 'd', 'd#', 'e', 'f♮', 'f#', 'g♮', 'g#', 'a', 'a#', 'b'],
            'Bb': ['c', 'db', 'd', 'eb', 'e♮', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b♮'],
            'B': ['c♮', 'c#', 'd♮', 'd#', 'e', 'f♮', 'f#', 'g♮', 'g#', 'a♮', 'a#', 'b'],
            'Db': ['c', 'db', 'd♮', 'eb', 'e♮', 'f', 'gb', 'g♮', 'ab', 'a♮', 'bb', 'b♮'],
            'Gb': ['c♮', 'db', 'd♮', 'eb', 'e♮', 'f', 'gb', 'g♮', 'ab', 'a♮', 'bb', 'b♮'],
            'Cb': ['c♮', 'db', 'd♮', 'eb', 'e♮', 'f♮', 'gb', 'g♮', 'ab', 'a♮', 'bb', 'b♮']
        },
        midiCode: [],
        keyMidiCode: [],
        keyNames: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
        lowNoteMidiArr: [],
        upNoteMidiArr: [],
        scoreContext: null,
        staveTreble: null,
        staveBass: null,
        upVoice: null,
        lowVoice: null,
        scorePanelScale: 1.3,
        scorePanelWidth: scorePanelBaseWidthHeight,
        scorePanelHeight: scorePanelBaseWidthHeight,
        noteFixX: 140,
        fretFixX: -50,
        keySigUp: null,
        keySigLow: null,
        keyTextUp: null,
        keyTextLow: null,
        instrument: "acoustic_grand_piano",
        modalSetting: false,
        languageList: [
            {
                value: 'zh_CN',
                label: i18n.t('chinese')
            },
            {
                value: 'en_US',
                label: i18n.t('english')
            },
        ],
        modelLanguage: 'zh_CN',
        switchChordDic: false,
        modalChordDic: false,
        modelKeySignature: 'C',
        switchGuitarPanel: false,
        modalGuitarPanel: false,
        keyColorReleaseSustain: 'hsl(150, 100%, 50%)',
        keyColorHoldSustain: 'hsl(200, 100%, 50%)',
        colorfulCheckbox: false,
        volumeSlider: 50,
        muteCheckbox: false,
        switchMetronomePanel: false,
        modalMetronomePanel: false,
        modelSoundLibrary: 'acoustic_grand_piano',
        soundLibraryList: [
            {
                value: 'acoustic_grand_piano',
                label: i18n.t('acoustic_grand_piano')
            },
            {
                value: 'bright_acoustic_piano',
                label: i18n.t('bright_acoustic_piano')
            },
            {
                value: 'electric_grand_piano',
                label: i18n.t('electric_grand_piano')
            },
            {
                value: 'honkytonk_piano',
                label: i18n.t('honkytonk_piano')
            },
            {
                value: 'electric_piano_1',
                label: i18n.t('electric_piano_1')
            },
            {
                value: 'electric_piano_2',
                label: i18n.t('electric_piano_2')
            },
            {
                value: 'glockenspiel',
                label: i18n.t('glockenspiel')
            },
            {
                value: 'music_box',
                label: i18n.t('music_box')
            },
            {
                value: 'tubular_bells',
                label: i18n.t('tubular_bells')
            },
            {
                value: 'dulcimer',
                label: i18n.t('dulcimer')
            },
            {
                value: 'accordion',
                label: i18n.t('accordion')
            },
            {
                value: 'harmonica',
                label: i18n.t('harmonica')
            },
            {
                value: 'acoustic_guitar_nylon',
                label: i18n.t('acoustic_guitar_nylon')
            },
            {
                value: 'acoustic_guitar_steel',
                label: i18n.t('acoustic_guitar_steel')
            },
            {
                value: 'electric_guitar_clean',
                label: i18n.t('electric_guitar_clean')
            },
            {
                value: 'acoustic_bass',
                label: i18n.t('acoustic_bass')
            },
            {
                value: 'violin',
                label: i18n.t('violin')
            },
            {
                value: 'viola',
                label: i18n.t('viola')
            },
            {
                value: 'cello',
                label: i18n.t('cello')
            },
            {
                value: 'contrabass',
                label: i18n.t('contrabass')
            },
            {
                value: 'choir_aahs',
                label: i18n.t('choir_aahs')
            },
            {
                value: 'voice_oohs',
                label: i18n.t('voice_oohs')
            },
            {
                value: 'synth_choir',
                label: i18n.t('synth_choir')
            },
            {
                value: 'orchestra_hit',
                label: i18n.t('orchestra_hit')
            },
            {
                value: 'trumpet',
                label: i18n.t('trumpet')
            },
            {
                value: 'trombone',
                label: i18n.t('trombone')
            },
            {
                value: 'tuba',
                label: i18n.t('tuba')
            },
            {
                value: 'baritone_sax',
                label: i18n.t('baritone_sax')
            },
            {
                value: 'flute',
                label: i18n.t('flute')
            },
            {
                value: 'blown_bottle',
                label: i18n.t('blown_bottle')
            },
            {
                value: 'whistle',
                label: i18n.t('whistle')
            },
            {
                value: 'kalimba',
                label: i18n.t('kalimba')
            },
            {
                value: 'steel_drums',
                label: i18n.t('steel_drums')
            },
            {
                value: 'synth_drum',
                label: i18n.t('synth_drum')
            },
        ],
    },
    created: function () {
        this.scorePanelWidth = scorePanelBaseWidthHeight * this.scorePanelScale
        this.scorePanelHeight = scorePanelBaseWidthHeight * this.scorePanelScale

        WebMidi.enable((errorMessage) => {

            if (errorMessage) {
                this.errorMessage = '' + errorMessage;
                console.log(errorMessage);
                return;
            }

            if (WebMidi.inputs.length) {
                if (WebMidi.inputs.length > 1 && WebMidi.inputs[0].name === "Session 1") {
                    this.selectedMidiInputId = WebMidi.inputs[1].id;
                } else {
                    this.selectedMidiInputId = WebMidi.inputs[0].id;
                }
            }
        });

        this.initMidi()

        this.midiCode = this.genKeyFretMidiCode(this.modelKeySignature)
        this.keyMidiCode = this.genKeyMidiCode(this.modelKeySignature)

        this.initKeyboard();

        this.initScore()
    },
    watch: {
        selectedMidiInputId(newMidiInputId) {
            if (this.midiInput) {
                this.midiInput.removeListener();
            }
            this.midiInput = WebMidi.getInputById(newMidiInputId);
            if (this.midiInput) {
                this.midiInput.addListener('noteon', 'all', (event) => {
                    var note = event.note.number - this.offsetKeys + this.transpose;
                    if (0 <= note && note < this.keys.length) {
                        this.keys[note].velocity = event.velocity;
                        this.keys[note].pushed = true;

                        this.refreshScore()
                    }

                    MIDI.setVolume(0, this.muteCheckbox ? 0 : this.volumeSlider * 3);
                    MIDI.noteOn(0, event.note.number, event.velocity * 127, 0);
                });
                this.midiInput.addListener('noteoff', 'all', (event) => {
                    var note = event.note.number - this.offsetKeys + this.transpose;
                    if (0 <= note && note < this.keys.length) {
                        if (!this.holdPedal) {
                            MIDI.noteOff(0, event.note.number, 0);
                            this.keys[note].velocity = 0;
                        }
                        this.keys[note].pushed = false;

                        this.refreshScore()
                    }
                });
                this.midiInput.addListener('controlchange', 'all', (event) => {
                    // Hold pedal
                    if (event.controller.number === 64) {
                        if (event.value > 0) {
                            this.holdPedal = true;
                        } else {
                            this.holdPedal = false;
                            for (var i = 0; i < this.keys.length; ++i) {
                                if (!this.keys[i].pushed) {
                                    MIDI.noteOff(0, i + 21, 0);
                                    this.keys[i].velocity = 0;
                                }
                            }
                        }
                    }

                    this.refreshScore()

                });
            }
        },
    },
    computed: {
        liWidth: function () {
            this.keyWidth = `${(this.pageWidth - 50) / ((this.nbKeys + 1) / 12/*keys/octaves*/ * 7/*white keys/octave*/)}`
            return `${this.keyWidth}px`;
        },
        blackLiWidth: function () {
            this.blackKeyWidth = `${(this.keyWidth) * (20 / 36)}`
            return `${this.blackKeyWidth}px`;
        },
        blackLiLeft: function () {
            return `${(this.keyWidth) * (-12 / 36)}px`;
        },
        scoreMarginLeft: function () {
            return `${((this.pageHeight) - this.scorePanelHeight - 200) / 2}px 0px`;
        },
        chordPanelWidth: function () {
            return `${this.scorePanelWidth - 100}px`;
        },
        chordPanelHeight: function () {
            return `${this.scorePanelHeight}px`;
        },
        sustainCircleColor: function () {
            if (this.holdPedal === true) {
                return '#007069'
            } else {
                return '#ffffff'
            }
        },
        preferChordFontSize: function () {
            return `${this.scorePanelScale * 30}px`;
        },
        secondaryChordFontSize: function () {
            return `${this.scorePanelScale * 15}px`;
        },
    },
    methods: {
        languageChange(event) {
            i18n.locale = event
        },
        changeSwitchChordDic(status) {
            this.modalChordDic = status
        },
        changeModalChordDic(status) {
            this.switchChordDic = status
        },
        keySignatureChange(event) {
            this.modelKeySignature = event
            this.midiCode = this.genKeyFretMidiCode(this.modelKeySignature)
            this.keyMidiCode = this.genKeyMidiCode(this.modelKeySignature)
            this.initKeyboard()
            this.refreshScore()
        },
        scorePanelScaleChange() {
            this.scorePanelWidth = scorePanelBaseWidthHeight * this.scorePanelScale
            this.scorePanelHeight = scorePanelBaseWidthHeight * this.scorePanelScale
            this.rmScore()
            this.initScore()
        },
        changeSwitchGuitarPanel(status) {
            this.modalGuitarPanel = status
        },
        changeModalGuitarPanel(status) {
            this.switchGuitarPanel = status
        },
        changeSwitchMetronomePanel(status) {
            this.modalMetronomePanel = status
        },
        changeModalMetronomePanel(status) {
            this.switchMetronomePanel = status
        },
        soundLibraryChange(event) {
            this.initMidi()
        },
        muteCheckboxChange() {
            MIDI.noteOn(0, 1, 1, 0);
        },
        initKeyboard() {
            var keys = [];
            for (var i = 0; i < this.nbKeys; ++i) {
                keys.push({
                    velocity: 0,
                    pushed: false,
                    name: this.capFirst(this.keyFretDict[this.modelKeySignature][(i + 9) % 12]),
                });
            }

            this.keys = keys;
        },

        isBlackKey(key) {
            key = (this.offsetKeys + key) % 12;
            return (key < 5) == (key % 2);
        },

        velocityCss(velocity, index, type) {
            if (velocity <= 0) {
                return {};
            }

            var alpha = velocity * 0.4 + 0.6;
            var fixColor = this.holdPedal ? this.keyColorHoldSustain.split('(')[1].split(',')[0] : this.keyColorReleaseSustain.split('(')[1].split(',')[0];
            var hue = this.colorfulCheckbox ? ((index * 7) % 12) / 12 * 360 : fixColor;
            if (type === 'color') {
                return {
                    background: `hsla(${hue},100%,50%,${alpha})`
                };
            } else {
                return {
                    color: `rgba(0, 0, 0, 1)`
                };
            }
        },

        capFirst(str) {
            return str[0].toUpperCase() + str.slice(1);
        },

        initMidi() {
            const inst = this.modelSoundLibrary
            MIDI.loadPlugin({
                api: "webaudio",
                soundfontUrl: "../soundfont/",
                instrument: inst,
                onprogress: function (state, progress) {
                    return typeof console !== "undefined" && console !== null ? console.log(state, progress) : void 0;
                },
                onerror: function (err) {
                    return typeof console !== "undefined" && console !== null ? console.error(err) : void 0;
                },
                onsuccess: function () {
                    if (typeof console !== "undefined" && console !== null) {
                        console.log("MIDI.js loaded");
                    }
                    return MIDI.programChange(0, MIDI.GM.byName[inst].number);
                }
            });
        },

        initScore() {
            const div = document.getElementById('scorePanel');
            const renderer = new Renderer(div, Renderer.Backends.SVG);

            renderer.resize(this.scorePanelWidth, this.scorePanelHeight);
            this.scoreContext = renderer.getContext();
            this.scoreContext.scale(this.scorePanelScale, this.scorePanelScale);
            this.scoreContext.setFont('Arial', 10);

            this.staveTreble = new Stave(10, 60, this.scorePanelWidth);
            this.staveBass = new Stave(10, 140, this.scorePanelWidth);

            this.staveTreble.addClef('treble')
            this.staveBass.addClef('bass')

            this.keySigUp = new KeySignature(this.modelKeySignature)
            this.keySigUp.addToStave(this.staveTreble)
            this.keySigLow = new KeySignature(this.modelKeySignature)
            this.keySigLow.addToStave(this.staveBass)

            this.keyTextUp = new StaveText(`Key: ${this.modelKeySignature}`, StaveModifierPosition.ABOVE, {justification: 0})
            this.staveTreble.addModifier(this.keyTextUp)

            const connector = new StaveConnector(this.staveTreble, this.staveBass);
            connector.setType(StaveConnector.type.SINGLE);
            connector.setContext(this.scoreContext);

            this.staveTreble.setContext(this.scoreContext).draw();
            this.staveBass.setContext(this.scoreContext).draw();
            connector.draw();
        },

        rmScore() {
            const div = document.getElementById('scorePanel');
            while (div.firstChild) {
                div.removeChild(div.firstChild);
            }
        },

        renderScore(noteArr, noteAdjustKeyArr) {
            this.rmScore()
            this.initScore()

            if (noteArr.length === 0) {
                return
            }

            const context = this.scoreContext
            const staveTreble = this.staveTreble
            const staveBass = this.staveBass

            const upNotes = []
            const lowNotes = []
            const upAdjustKeyNotes = []
            const lowAdjustKeyNotes = []
            var upStaveNote = null
            var lowStaveNote = null

            for (let i = 0; i < noteArr.length; ++i) {
                if (parseInt(noteArr[i].split('/')[1]) >= 4) {
                    upNotes.push(noteArr[i])
                    upAdjustKeyNotes.push(noteAdjustKeyArr[i])
                } else {
                    lowNotes.push(noteArr[i])
                    lowAdjustKeyNotes.push(noteAdjustKeyArr[i])
                }
            }

            const voices = [];
            var formatter = new Formatter();

            if (upNotes.length !== 0) {
                upStaveNote = new StaveNote({
                    keys: upAdjustKeyNotes,
                    duration: "w",
                })

                for (let i = 0; i < upNotes.length; ++i) {
                    if (upAdjustKeyNotes[i].split('/')[0].length > 1) {
                        upStaveNote.addModifier(new Accidental(upAdjustKeyNotes[i].split('/')[0][1]), i)
                    }
                    upStaveNote.addModifier(new FretHandFinger(this.capFirst(upNotes[i].split('/')[0])), i)
                }

                const notesUp = [
                    upStaveNote,
                ];

                this.upVoice = new Voice({num_beats: 4, beat_value: 4}).addTickables(notesUp)

                formatter.joinVoices([this.upVoice]);
                voices.push(this.upVoice)
            }

            if (lowNotes.length !== 0) {
                lowStaveNote = new StaveNote({
                    keys: lowAdjustKeyNotes,
                    duration: "w",
                    clef: 'bass',
                })

                for (let i = 0; i < lowNotes.length; ++i) {
                    if (lowAdjustKeyNotes[i].split('/')[0].length > 1) {
                        lowStaveNote.addModifier(new Accidental(lowAdjustKeyNotes[i].split('/')[0][1]), i)
                    }
                    lowStaveNote.addModifier(new FretHandFinger(this.capFirst(lowNotes[i].split('/')[0])), i)
                }

                const notesLow = [
                    lowStaveNote,
                ];

                this.lowVoice = new Voice({num_beats: 4, beat_value: 4}).addTickables(notesLow)

                formatter.joinVoices([this.lowVoice]);
                voices.push(this.lowVoice)
            }

            var startX = Math.max(staveTreble.getNoteStartX(), staveBass.getNoteStartX());
            staveTreble.setNoteStartX(startX);
            staveBass.setNoteStartX(startX);
            formatter.format(voices, 240);

            var fixKeySigNote = this.keySigUp.getWidth()
            var fixKeySigFret = 10
            // C key need adjust 10
            if (this.modelKeySignature === 'C') {
                fixKeySigNote -= 10
            }
            var fretCount = 0
            if (lowNotes.length !== 0) {
                this.lowVoice.draw(context, staveBass);

                this.lowVoice.tickables[0].attrs.el.remove()

                lowStaveNote.getModifiers().forEach((element) => {
                    if (element.getCategory() === 'Accidental') {
                        // fix note x
                        element.setXShift(lowStaveNote.getX() - this.noteFixX - element.getXShift() + fixKeySigNote)
                    } else if (element.getCategory() === 'FretHandFinger') {
                        // fix fretHandFinger x
                        element.setXShift(this.fretFixX - (fretCount % 3) * 20 + fixKeySigFret)
                        element.setPosition(Modifier.Position.RIGHT)
                        element.setFont({weight: 1})
                        fretCount += 1
                    }
                });

                lowStaveNote.setXShift(this.noteFixX - lowStaveNote.getX() - fixKeySigNote)
                lowStaveNote.draw(context, staveBass);
            }
            if (upNotes.length !== 0) {
                this.upVoice.draw(context, staveTreble);

                this.upVoice.tickables[0].attrs.el.remove()

                upStaveNote.getModifiers().forEach((element) => {
                    if (element.getCategory() === 'Accidental') {
                        // fix note x
                        element.setXShift(upStaveNote.getX() - this.noteFixX - element.getXShift() + fixKeySigNote)
                    } else if (element.getCategory() === 'FretHandFinger') {
                        // fix fretHandFinger x
                        element.setXShift(this.fretFixX - (fretCount % 3) * 20 + fixKeySigFret)
                        element.setPosition(Modifier.Position.RIGHT)
                        element.setFont({weight: 1})
                        fretCount += 1
                    }
                });

                upStaveNote.setXShift(this.noteFixX - upStaveNote.getX() - fixKeySigNote)
                upStaveNote.draw(context, staveTreble);
            }

        },

        refreshScore() {
            var noteArr = []
            var noteAdjustKeyArr = []
            for (let i = 0; i < 89; ++i) {
                if (this.keys[i] && this.keys[i].velocity !== 0) {
                    noteArr.push(this.midiCode[i])
                    noteAdjustKeyArr.push(this.keyMidiCode[i])
                }
            }
            this.renderScore(noteArr, noteAdjustKeyArr)
        },

        genKeyMidiCode(key) {
            var keyMidiCode = []
            for (let i = 0; i < 9; ++i) {
                for (let j = 0; j < 12; ++j) {
                    keyMidiCode[i * 12 + j] = `${this.keyNoteDict[key][j]}/${i}`
                }
            }
            return keyMidiCode.slice(9, 97)
        },

        genKeyFretMidiCode(key) {
            var keyFretMidiCode = []
            for (let i = 0; i < 9; ++i) {
                for (let j = 0; j < 12; ++j) {
                    keyFretMidiCode[i * 12 + j] = `${this.keyFretDict[key][j]}/${i}`
                }
            }
            return keyFretMidiCode.slice(9, 97)
        },
    }
});
