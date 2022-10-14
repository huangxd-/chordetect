Object.defineProperty(Vue.prototype, 'WebMidi', {value: WebMidi});
const {Renderer, Stave, StaveNote, Voice, Formatter, Accidental, StaveConnector, FretHandFinger, Modifier,
    KeySignature, KeyManager, StaveText, StaveModifierPosition} = Vex.Flow;
const scorePanelScale = 1.3

var app = new Vue({
    el: '#app',
    props: {},
    data: {
        nbKeys: 88,
        offsetKeys: 21,
        transpose: 0,
        colors: false,
        errorMessage: null,
        selectedMidiInputId: null,
        midiInput: null,
        keys: [],
        holdPedal: false,
        pageWidth: window.innerWidth,
        pageHeight: window.innerHeight,
        keyWidth: null,
        blackKeyWidth: null,
        keyList: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
        midiCode: ['a/0', 'a#/0', 'b/0',
            'c/1', 'c#/1', 'd/1', 'eb/1', 'e/1', 'f/1', 'f#/1', 'g/1', 'ab/1', 'a/1', 'bb/1', 'b/1',
            'c/2', 'c#/2', 'd/2', 'eb/2', 'e/2', 'f/2', 'f#/2', 'g/2', 'ab/2', 'a/2', 'bb/2', 'b/2',
            'c/3', 'c#/3', 'd/3', 'eb/3', 'e/3', 'f/3', 'f#/3', 'g/3', 'ab/3', 'a/3', 'bb/3', 'b/3',
            'c/4', 'c#/4', 'd/4', 'eb/4', 'e/4', 'f/4', 'f#/4', 'g/4', 'ab/4', 'a/4', 'bb/4', 'b/4',
            'c/5', 'c#/5', 'd/5', 'eb/5', 'e/5', 'f/5', 'f#/5', 'g/5', 'ab/5', 'a/5', 'bb/5', 'b/5',
            'c/6', 'c#/6', 'd/6', 'eb/6', 'e/6', 'f/6', 'f#/6', 'g/6', 'ab/6', 'a/6', 'bb/6', 'b/6',
            'c/7', 'c#/7', 'd/7', 'eb/7', 'e/7', 'f/7', 'f#/7', 'g/7', 'ab/7', 'a/7', 'bb/7', 'b/7',
            'c/8'],
        keyNames: ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab'],
        lowNoteMidiArr: [],
        upNoteMidiArr: [],
        scoreContext: null,
        staveTreble: null,
        staveBass: null,
        upVoice: null,
        lowVoice: null,
        scorePanelWidth: 320 * scorePanelScale,
        scorePanelHeight: 320 * scorePanelScale,
        noteFixX: 140,
        fretFixX: -50,
        keyStr: 'C',
        keySigUp: null,
        keySigLow: null,
        keyTextUp: null,
        keyTextLow: null,
    },
    created: function () {

        this.initKeyboard();

        WebMidi.enable((errorMessage) => {

            if (errorMessage) {
                this.errorMessage = '' + errorMessage;
                console.log(errorMessage);
                return;
            }

            if (WebMidi.inputs.length) {
                this.selectedMidiInputId = WebMidi.inputs[0].id;
            }
        });

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
                });
                this.midiInput.addListener('noteoff', 'all', (event) => {
                    var note = event.note.number - this.offsetKeys + this.transpose;
                    if (0 <= note && note < this.keys.length) {
                        if (!this.holdPedal) {
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
                                    this.keys[i].velocity = 0;
                                }
                            }
                        }
                    }

                    this.refreshScore()

                });
            }
        },

        keyStr() {
            this.refreshScore()
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
    },
    methods: {
        initKeyboard() {
            var keys = [];
            for (var i = 0; i < this.nbKeys; ++i) {
                keys.push({
                    velocity: 0,
                    pushed: false,
                    name: this.keyNames[i % 12],
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
            var hue = this.colors ? ((index * 7) % 12) / 12 * 360 : 120;
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

        initScore() {
            const div = document.getElementById('scorePanel');
            const renderer = new Renderer(div, Renderer.Backends.SVG);

            renderer.resize(this.scorePanelWidth, this.scorePanelHeight);
            this.scoreContext = renderer.getContext();
            this.scoreContext.scale(scorePanelScale, scorePanelScale);
            this.scoreContext.setFont('Arial', 10);

            this.staveTreble = new Stave(10, 60, this.scorePanelWidth);
            this.staveBass = new Stave(10, 140, this.scorePanelWidth);

            this.staveTreble.addClef('treble')
            this.staveBass.addClef('bass')

            this.keySigUp = new KeySignature(this.keyStr)
            this.keySigUp.addToStave(this.staveTreble)
            this.keySigLow = new KeySignature(this.keyStr)
            this.keySigLow.addToStave(this.staveBass)

            this.keyTextUp = new StaveText(`Key: ${this.keyStr}`, StaveModifierPosition.ABOVE, { justification: 0 } )
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

        renderScore(noteArr) {
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
            var upStaveNote = null
            var lowStaveNote = null

            noteArr.forEach(function (key) {
                if (parseInt(key.split('/')[1]) >= 4) {
                    upNotes.push(key)
                } else {
                    lowNotes.push(key)
                }
            })

            const voices = [];
            var formatter = new Formatter();

            if (upNotes.length !== 0) {
                upStaveNote = new StaveNote({
                    keys: upNotes,
                    duration: "w",
                })

                for (let i = 0; i < upNotes.length; ++i) {
                    if (upNotes[i].split('/')[0].length > 1) {
                        upStaveNote.addModifier(new Accidental(upNotes[i].split('/')[0][1]), i)
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
                    keys: lowNotes,
                    duration: "w",
                    clef: 'bass',
                })

                for (let i = 0; i < lowNotes.length; ++i) {
                    if (lowNotes[i].split('/')[0].length > 1) {
                        lowStaveNote.addModifier(new Accidental(lowNotes[i].split('/')[0][1]), i)
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
            // C调需要调整10
            if (this.keyStr === 'C') {
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

                lowStaveNote.setXShift(this.noteFixX - lowStaveNote.getX()- fixKeySigNote)
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

                upStaveNote.setXShift(this.noteFixX - upStaveNote.getX()- fixKeySigNote)
                upStaveNote.draw(context, staveTreble);
            }

        },

        refreshScore() {
            var noteArr = []
            for (let i = 0; i < 89; ++i) {
                if (this.keys[i] && this.keys[i].velocity !== 0) {
                    noteArr.push(this.midiCode[i])
                }
            }
            this.renderScore(noteArr)
        }
    }
});
