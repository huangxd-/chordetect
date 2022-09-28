Object.defineProperty(Vue.prototype, 'WebMidi', { value: WebMidi });

var app = new Vue({
    el: '#app',
    props: {
    },
    data:  {
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
        keyWidth: null
    },
    created: function () {

        this.initKeyboard();

        WebMidi.enable((errorMessage) => {

            if (errorMessage) {
                this.errorMessage = '' + errorMessage;
                console.log(errorMessage);
                return;
            }

            if(WebMidi.inputs.length) {
                this.selectedMidiInputId = WebMidi.inputs[0].id;
            }
        });
    },
    watch: {
        selectedMidiInputId(newMidiInputId) {
            if(this.midiInput) {
                this.midiInput.removeListener();
            }
            this.midiInput = WebMidi.getInputById(newMidiInputId);
            if(this.midiInput) {
                this.midiInput.addListener('noteon', 'all', (event) => {
                    var note = event.note.number - this.offsetKeys + this.transpose;
                    if(0 <= note && note < this.keys.length) {
                        this.keys[note].velocity = event.velocity;
                        this.keys[note].pushed = true;
                    }
                });
                this.midiInput.addListener('noteoff', 'all', (event) => {
                    var note = event.note.number - this.offsetKeys + this.transpose;
                    if(0 <= note && note < this.keys.length) {
                        if(!this.holdPedal) {
                            this.keys[note].velocity = 0;
                        }
                        this.keys[note].pushed = false;
                    }
                });
                this.midiInput.addListener('controlchange', 'all', (event) => {
                    // Hold pedal
                    if(event.controller.number == 64) {
                        if(event.value > 0) {
                            this.holdPedal = true;
                        } else {
                            this.holdPedal = false;
                            for(var i =0; i<this.keys.length; ++i) {
                                if(!this.keys[i].pushed) {
                                    this.keys[i].velocity = 0;
                                }
                            }
                        }
                    }

                });
            }
        }
    },
    computed: {
        liWidth: function() {
            this.keyWidth = `${(this.pageWidth - 50) / ((this.nbKeys + 1) / 12/*keys/octaves*/ * 7/*white keys/octave*/)}`
            return `${this.keyWidth}px`;
        },
    },
    methods: {
        initKeyboard() {

            var keys = [];
            for(var i = 0; i<this.nbKeys; ++i) {
                keys.push({
                    velocity: 0,
                    pushed: false
                });
            }

            this.keys = keys;
        },

        isBlackKey(key) {
            key = (this.offsetKeys + key) % 12;
            return (key < 5) == (key % 2);
        },

        velocityCss(velocity, index) {
            if(velocity <= 0) {
                return {};
            }

            var alpha = velocity * 0.4 + 0.6;
            var hue = this.colors ? ((index*7)%12) / 12 * 360 : 120;
            return {
                background: `hsla(${hue},100%,50%,${alpha})`
            };
        },
    }
});
