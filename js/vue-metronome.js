//---------------------------------------------------------------------
//
// vue-metronome.js
//
// Copyright (c) 2020 Kazuhiko Arase
//
// URL: https://github.com/kazuhikoarase/vue-metronome/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//

'use strict'

!function() {

  var createPlayer = function() {
    return {
      audioContext: null,
      audioprocessHandler: function(event) {},
      stateHandler: function(type) {},
      start: function() {

        if (!this.audioContext) {

          var bufferSize = 8192;
          var numChannels = 1;
          var audioContext = new AudioContext();

          var gainNode = audioContext.createGain();
          gainNode.gain.value = 1;
          gainNode.connect(audioContext.destination);

          var scriptNode = audioContext.
            createScriptProcessor(bufferSize, 0, numChannels);

          scriptNode.onaudioprocess = function(event) {
            this.audioprocessHandler(event);
          }.bind(this);

          scriptNode.connect(gainNode);
          this.audioContext = audioContext;
          this.stateHandler('start');
        }
      },
      stop: function() {
        if (this.audioContext) {
          this.audioContext.close();
          this.audioContext = null;
          this.stateHandler('stop');
        }
      }
    };
  };

  var components = {
    metronome: {
      template: '<span style="display:none;">metronome</span>',
      props: {
        beat: { type: Number, default: 4 },
        tempo: { type: Number, default: 120 },
        gain: { type: Number, default: -40 },
        mute: { type: Boolean, default: false }
      },
      data: function() {
        return {
          player: null,
          reset: function() {}
        };
      },
      mounted: function() {

        var player = createPlayer();
        player.stateHandler = function(type) {

          if (type == 'start') {

            var freq, vol, step, lastStep = -1;
            var outputBuffer, i, bufLen, c, chData;

            var sine = function() {
              var v = 0;
              return function(n) {
                v += Math.cos(n);
                return v;
              }
            }();
            var square = function(n) {
              return Math.sin(n) < 0? -1 : 1;
            };
            var wave = square;

            var audioContext = player.audioContext;
            var sampleRate = audioContext.sampleRate;
            var t = 0;
            var dt = 1 / sampleRate;
            var gateT = 0;
            var clickGateTime = 1000 * dt;

            this.reset = function() {
              t = 0;
            };

            player.audioprocessHandler = function(event) {

              outputBuffer = event.outputBuffer;
              bufLen = outputBuffer.length;
              chData = outputBuffer.getChannelData(0);

              for (i = 0; i < bufLen; i += 1) {

                step = Math.floor(t * this.params.stepPerTime);

                if (lastStep != step) {
                  freq = step % this.params.beat == 0?
                      this.params.freq * 2 : this.params.freq;
                  vol = this.params.vol;
                  gateT = t + clickGateTime;
                  lastStep = step;
                } else if (vol > 0 && t > gateT) {
                  vol = 0;
                }

                chData[i] = vol * wave(2 * Math.PI * freq * t);
                t += dt;
              }

            }.bind(this);

            var _this = this;
            this.$emit('start', {
              getTimestamp: function() { return t; },
              getBeat: function() { return _this.params.beat; },
              getTempo: function() { return _this.params.tempo; }
            });

          } else if (type == 'stop') {
            this.$emit('stop');
          }
        }.bind(this);
        this.player = player;
      },
      computed: {
        params: function() {
          var beat = this.beat;
          var tempo =  this.tempo;
          var mute = this.mute;
          var freq = 440 * Math.exp(/* E note */ 7 / 12 * Math.log(2) );
          var vol = mute? 0 : Math.exp(this.gain / 20 * Math.log(10) );
          var stepPerTime = tempo / 60;
          return {
            beat: beat, tempo: tempo, freq: freq, vol: vol,
            stepPerTime: stepPerTime
          };
        }
      },
      methods: {
        start: function() {
          this.player.start();
        },
        stop: function() {
          this.player.stop();
        }
      }
    },
    metronomeView: {
      template:
        '<svg xmlns="http://www.w3.org/2000/svg"' +
            ' style="overflow: hidden;"' +
            ' width="220" height="90"' +
            ' viewBox="0 0 220 90" >' +
          '<clipPath id="dspFrm">'+
            '<rect fill="#000" stroke="none"' +
            ' x="2" y="2" width="216" height="86" />' +
          '</clipPath>' +
          '<rect fill="#230" stroke="none" opacity="0.2"' +
          ' x="0" y="0" width="220" height="90" rx="8" ry="8" />' +
          '<g clip-path="url(#dspFrm)">' +
            '<circle ref="lPoint" fill="#000" stroke="none" :opacity="lOp"' +
              ' :cx="pHGap" :cy="pVGap" :r="pRadius" />' +
            '<circle ref="rPoint" fill="#000" stroke="none" :opacity="rOp"' +
              ' :cx="220 - pHGap" :cy="pVGap" :r="pRadius" />' +
            '<g v-for="bar in bars" :transform="bar.tran">' +
              '<path ref="bars" fill="#000" stroke="none" :opacity="bar.op"' +
                ' d="M-0.5 -18L-5 -84L0 -88L5 -84L0.5 -18Z" />' +
            '</g>' +
            '<circle ref="barAx" fill="#000" stroke="none" :opacity="cOp"' +
              ' cx="110" cy="90" r="12" />' +
          '</g>' +
        '</svg>',
      props: {
        intf: { type: Object, default: null }
      },
      data: function() {
        return {
          pHGap: 24, pVGap: 22, pRadius: 18,
          active: false, cOp: '0', lOp: '0', rOp: '0', bars: []
        };
      },
      mounted: function() {

        var activeOpacity = '1';
        var defaultOpacity = '0.02';

        this.cOp = this.lOp = this.rOp = defaultOpacity;

        var bars = [];
        !function() {
          var l = 5;
          for (var i = -l; i <= l; i += 1) {
            bars.push({
              n: i,
              tran: 'translate(110 95) rotate(' +
                ( (i + Math.sin(i * 0.06) ) * 8.5) + ')',
              op: defaultOpacity
            });
          }
        }();
        this.bars = bars;

        var beat, tempo;

        var frmT0 = 0, lastTs = 0, t, ts;
        var tranT, i, op;
        var cOp, lOp, rOp;
        var intf, bi0, bi1;
        var _barsLen = bars.length;
        var _2barsLen = _barsLen * 2;

        var onframe = function(frmT) {

          if (this.intf) {

            intf = this.intf;
            ts = intf.getTimestamp();
            beat = intf.getBeat();
            tempo = intf.getTempo();

            if (lastTs != ts) {
              frmT0 = frmT;
              lastTs = ts;
            }

            t =  ts + (frmT - frmT0) / 1000;
            tranT = (t * tempo / 120 + 0.75) % 1;

            cOp = activeOpacity;
            if (tranT < 0.5) {
              lOp = activeOpacity;
              rOp = defaultOpacity;
            } else {
              lOp = defaultOpacity;
              rOp = activeOpacity;
            }

            if (this.cOp !== cOp) this.cOp = cOp;
            if (this.lOp !== lOp) this.lOp = lOp;
            if (this.rOp !== rOp) this.rOp = rOp;

            bi0 = Math.floor(tranT * _2barsLen);
            bi1 = (bi0 + _2barsLen - 1) % _2barsLen;
            bi0 = bi0 >= _barsLen? _2barsLen - 1  - bi0 : bi0;
            bi1 = bi1 >= _barsLen? _2barsLen - 1  - bi1 : bi1;

            for (i = 0; i < _barsLen; i += 1) {
              op = (i == bi0 || i == bi1)? activeOpacity : defaultOpacity;
              if (bars[i].op !== op) {
                bars[i].op = op;
              };
            }

          } else {
            this.cOp = this.lOp = this.rOp = defaultOpacity;
            for (i = 0; i < bars.length; i += 1) {
              bars[i].op = defaultOpacity;
            }
          }

          if (this.active) {
            window.requestAnimationFrame(onframe);
          }
        }.bind(this);

        this.active = true;
        window.requestAnimationFrame(onframe);
      },
      beforeDestroy: function() {
        this.active = false;
      }
    }
  };

  for (var k in components) {
    Vue.component(k, components[k]);
  }
}();
