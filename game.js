/**
 * ============================================================================
 * NEON FLAPPY 80s — ARCADE BOSS RUSH
 * 100% Original Retro Synthwave / Cyberpunk 2D Canvas Engine
 * Pure Vanilla JavaScript • Web Audio API • 5 Stages • 5 Bosses with 3 Phases
 * ============================================================================
 */

(function () {
  'use strict';

  /* ==========================================================================
     CONSTANTES & CONFIGURAÇÕES GERAIS
     ========================================================================== */
  const CANVAS_WIDTH = 960;
  const CANVAS_HEIGHT = 600;
  const MAX_PARTICLES = 600;

  // Estados do Jogo
  const STATES = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    WAVE_CLEAR: 'WAVE_CLEAR',
    BOSS_INTRO: 'BOSS_INTRO',
    BOSS_FIGHT: 'BOSS_FIGHT',
    STAGE_CLEAR: 'STAGE_CLEAR',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
    VICTORY: 'VICTORY'
  };

  // Definição das 5 Fases
  const STAGES_DATA = [
    {
      id: 1,
      name: 'NEON CITY',
      bossName: 'NEON OVERLORD',
      bossMaxHp: 1200,
      skyTop: '#12002b',
      skyBottom: '#2d004d',
      gridColor: 'rgba(0, 234, 255, 0.4)',
      horizonColor: '#ff00cc',
      sunColor: '#ff2a6d',
      envType: 'city',
      enemyTypes: ['drone', 'rusher']
    },
    {
      id: 2,
      name: 'CYBER HIGHWAY',
      bossName: 'ROAD PHANTOM',
      bossMaxHp: 1800,
      skyTop: '#0a001a',
      skyBottom: '#3b0066',
      gridColor: 'rgba(255, 42, 109, 0.45)',
      horizonColor: '#00eaff',
      sunColor: '#ff00cc',
      envType: 'highway',
      enemyTypes: ['rusher', 'drone', 'shooter']
    },
    {
      id: 3,
      name: 'DIGITAL TEMPLE',
      bossName: 'CYBER ORACLE',
      bossMaxHp: 2500,
      skyTop: '#001a24',
      skyBottom: '#003d52',
      gridColor: 'rgba(0, 255, 200, 0.45)',
      horizonColor: '#7a00ff',
      sunColor: '#00eaff',
      envType: 'temple',
      enemyTypes: ['shooter', 'drone', 'special']
    },
    {
      id: 4,
      name: 'SYNTHWAVE VOID',
      bossName: 'VOID MASTER',
      bossMaxHp: 3200,
      skyTop: '#050014',
      skyBottom: '#180033',
      gridColor: 'rgba(122, 0, 255, 0.5)',
      horizonColor: '#ff00cc',
      sunColor: '#7a00ff',
      envType: 'void',
      enemyTypes: ['shooter', 'tank', 'special']
    },
    {
      id: 5,
      name: 'NEON CORE',
      bossName: 'THE NEON CORE',
      bossMaxHp: 4200,
      skyTop: '#1f000d',
      skyBottom: '#4a0020',
      gridColor: 'rgba(255, 0, 85, 0.5)',
      horizonColor: '#ffe600',
      sunColor: '#ff0055',
      envType: 'core',
      enemyTypes: ['drone', 'rusher', 'shooter', 'tank', 'special']
    }
  ];

  /* ==========================================================================
     SISTEMA DE ÁUDIO PROCEDURAL (WEB AUDIO API)
     Sintetiza todos os efeitos e a trilha sonora synthwave em tempo real
     ========================================================================== */
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.isMuted = false;
      this.bgmPlaying = false;
      this.bgmTimer = null;
      this.currentBassStep = 0;
      this.tempo = 124; // BPM Synthwave clássico
    }

    init() {
      if (this.ctx) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.35;
        this.masterGain.connect(this.ctx.destination);
      } catch (e) {
        console.warn('Web Audio API não inicializada:', e);
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      if (this.masterGain) {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx ? this.ctx.currentTime : 0);
      }
      return this.isMuted;
    }

    // Som de Disparo do Jogador
    playLaser() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.13);
    }

    // Som de Impacto no Inimigo
    playHit() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.09);
    }

    // Explosão Procedural com Ruído Filtrado
    playExplosion(isBoss = false) {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const duration = isBoss ? 0.9 : 0.35;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isBoss ? 450 : 600, t);
      filter.frequency.exponentialRampToValueAtTime(30, t + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isBoss ? 0.6 : 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      whiteNoise.start(t);
      whiteNoise.stop(t + duration);
    }

    // Efeito Sonoro do Dash
    playDash() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(520, t + 0.18);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, t);
      filter.frequency.exponentialRampToValueAtTime(1400, t + 0.18);
      filter.Q.value = 3;

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.21);
    }

    // Coleta de Power-up (Arpeggio Ascendente)
    playPowerup() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteStart = t + idx * 0.05;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.2, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(noteStart);
        osc.stop(noteStart + 0.14);
      });
    }

    // Alerta de Chegada do Chefão
    playBossWarning() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.linearRampToValueAtTime(440, t + 0.25);
      osc.frequency.linearRampToValueAtTime(220, t + 0.5);
      osc.frequency.linearRampToValueAtTime(440, t + 0.75);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.9);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.95);
    }

    // Mudança de Fase do Chefão
    playBossPhaseChange() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.35);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.55);
    }

    // Game Over
    playGameOver() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const notes = [293.66, 261.63, 220.0, 164.81]; // D4, C4, A3, E3
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = t + idx * 0.16;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(startTime);
        osc.stop(startTime + 0.28);
      });
    }

    // Vitória Final
    playVictory() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880, 739.99, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = t + idx * 0.14;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.28, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(startTime);
        osc.stop(startTime + 0.26);
      });
    }

    // Trilha Sonora Synthwave Procedural (Bassline + Arpeggio em loop)
    startBGM() {
      if (this.bgmPlaying) return;
      this.bgmPlaying = true;
      this.currentBassStep = 0;
      this.scheduleBGMStep();
    }

    stopBGM() {
      this.bgmPlaying = false;
      if (this.bgmTimer) {
        clearTimeout(this.bgmTimer);
        this.bgmTimer = null;
      }
    }

    scheduleBGMStep() {
      if (!this.bgmPlaying) return;

      const stepTimeMs = (60 / this.tempo / 4) * 1000; // semicolcheia
      if (this.ctx && !this.isMuted && this.ctx.state === 'running') {
        const t = this.ctx.currentTime;
        // Padrão de Baixo Synthwave em Am (A, F, G, E)
        const chordIndex = Math.floor(this.currentBassStep / 16) % 4;
        const roots = [110, 87.31, 98.0, 82.41]; // A2, F2, G2, E2
        const root = roots[chordIndex];

        // Pulso de baixo nas semicolcheias pares
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(root, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, t);
        filter.frequency.exponentialRampToValueAtTime(150, t + 0.08);

        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.005, t + 0.09);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.1);

        // Hi-hat sutil a cada 2 tempos
        if (this.currentBassStep % 4 === 2) {
          this.playHiHat(t);
        }
      }

      this.currentBassStep = (this.currentBassStep + 1) % 64;
      this.bgmTimer = setTimeout(() => this.scheduleBGMStep(), stepTimeMs);
    }

    playHiHat(t) {
      const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.03), this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.035, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      src.start(t);
      src.stop(t + 0.035);
    }
  }

  /* ==========================================================================
     SISTEMA DE PARTÍCULAS
     Partículas de alta performance limitadas a MAX_PARTICLES
     ========================================================================== */
  class ParticleSystem {
    constructor() {
      this.particles = [];
    }

    add(x, y, color, vx, vy, life, size = 3, type = 'square') {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift(); // Recicla mais antiga
      }
      this.particles.push({
        x,
        y,
        color,
        vx,
        vy,
        life,
        maxLife: life,
        size,
        type
      });
    }

    // Explosão circular de partículas
    burst(x, y, color, count = 20, speed = 4) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = (Math.random() * 0.8 + 0.2) * speed;
        this.add(
          x,
          y,
          color,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd,
          Math.random() * 0.4 + 0.2,
          Math.random() * 3 + 2
        );
      }
    }

    // Texto de dano ou pontuação flutuante
    addFloatingText(x, y, text, color = '#00eaff') {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      this.particles.push({
        x,
        y,
        text,
        color,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -2,
        life: 0.8,
        maxLife: 0.8,
        type: 'text'
      });
    }

    update(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
      }
    }

    draw(ctx) {
      ctx.save();
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;

        if (p.type === 'text') {
          ctx.font = 'bold 14px monospace';
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fillText(p.text, p.x, p.y);
        } else if (p.type === 'circle') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * alpha, p.size * alpha);
        }
      }
      ctx.restore();
    }

    clear() {
      this.particles.length = 0;
    }
  }

  /* ==========================================================================
     CLASSE DO JOGADOR (MASCOTE NEON / CYBER-SHIP)
     100% Original, com rastro, cockpit com olho neon, inclinação e dash
     ========================================================================== */
  class Player {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = 120;
      this.y = CANVAS_HEIGHT / 2;
      this.width = 46;
      this.height = 30;
      this.speed = 340;
      this.hp = 100;
      this.maxHp = 100;
      this.tilt = 0;
      this.invulnerableTimer = 0;
      this.dashCooldown = 0;
      this.dashMaxCooldown = 1.6;
      this.isDashing = false;
      this.dashDuration = 0.22;
      this.dashTimer = 0;
      this.dashSpeedMultiplier = 3.2;
      this.shootCooldown = 0;
      this.rapidFireTimer = 0;
      this.shieldTimer = 0;
      this.ghosts = []; // Rastro de fantasmas do dash
    }

    get isInvulnerable() {
      return this.invulnerableTimer > 0 || this.isDashing || this.shieldTimer > 0;
    }

    dash(moveX, moveY, audio) {
      if (this.dashCooldown <= 0 && !this.isDashing) {
        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        this.dashCooldown = this.dashMaxCooldown;
        this.invulnerableTimer = this.dashDuration + 0.1; // Pequena folga

        // Se parado, dá dash para a direita
        this.dashVx = moveX !== 0 || moveY !== 0 ? moveX : 1;
        this.dashVy = moveY;

        // Normalização
        const mag = Math.hypot(this.dashVx, this.dashVy);
        if (mag > 0) {
          this.dashVx /= mag;
          this.dashVy /= mag;
        }

        audio.playDash();
      }
    }

    takeDamage(amount, audio, particleSys) {
      if (this.isInvulnerable) return false;
      this.hp = Math.max(0, this.hp - amount);
      this.invulnerableTimer = 1.0; // 1 segundo de i-frames
      audio.playHit();
      particleSys.burst(this.x, this.y, '#ff2a6d', 25, 5);
      return true;
    }

    update(dt, input, audio, particleSys) {
      // Cooldowns
      if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);
      if (this.invulnerableTimer > 0) this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
      if (this.shootCooldown > 0) this.shootCooldown = Math.max(0, this.shootCooldown - dt);
      if (this.rapidFireTimer > 0) this.rapidFireTimer = Math.max(0, this.rapidFireTimer - dt);
      if (this.shieldTimer > 0) this.shieldTimer = Math.max(0, this.shieldTimer - dt);

      // Movimentação
      let vx = 0;
      let vy = 0;

      if (this.isDashing) {
        this.dashTimer -= dt;
        vx = this.dashVx * this.speed * this.dashSpeedMultiplier;
        vy = this.dashVy * this.speed * this.dashSpeedMultiplier;

        // Grava fantasmas de rastro neon
        if (Math.random() < 0.6) {
          this.ghosts.push({ x: this.x, y: this.y, tilt: this.tilt, alpha: 0.7 });
        }

        if (this.dashTimer <= 0) {
          this.isDashing = false;
        }
      } else {
        if (input.up) vy -= 1;
        if (input.down) vy += 1;
        if (input.left) vx -= 1;
        if (input.right) vx += 1;

        // Normalização diagonal
        const mag = Math.hypot(vx, vy);
        if (mag > 0) {
          vx = (vx / mag) * this.speed;
          vy = (vy / mag) * this.speed;
        }
      }

      this.x += vx * dt;
      this.y += vy * dt;

      // Limites estritos da arena
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      this.x = Math.max(halfW, Math.min(CANVAS_WIDTH - halfW, this.x));
      this.y = Math.max(halfH, Math.min(CANVAS_HEIGHT - halfH, this.y));

      // Inclinação suave baseada no movimento vertical
      const targetTilt = vy !== 0 ? (vy > 0 ? 0.35 : -0.35) : 0;
      this.tilt += (targetTilt - this.tilt) * 12 * dt;

      // Partículas contínuas de propulsão do motor traseiro
      if (Math.random() < 0.7) {
        const jetColor = this.isDashing ? '#ff00cc' : '#00eaff';
        particleSys.add(
          this.x - 22,
          this.y + (Math.random() - 0.5) * 6,
          jetColor,
          -Math.random() * 3 - 2,
          (Math.random() - 0.5) * 1.5,
          0.25,
          Math.random() * 3 + 2
        );
      }

      // Atualiza fantasmas
      for (let i = this.ghosts.length - 1; i >= 0; i--) {
        this.ghosts[i].alpha -= dt * 3.5;
        if (this.ghosts[i].alpha <= 0) this.ghosts.splice(i, 1);
      }
    }

    draw(ctx) {
      ctx.save();

      // Desenha fantasmas de dash primeiro
      for (let g of this.ghosts) {
        ctx.save();
        ctx.globalAlpha = g.alpha;
        ctx.translate(g.x, g.y);
        ctx.rotate(g.tilt);
        this.renderShipBody(ctx, '#ff00cc', '#00eaff', true);
        ctx.restore();
      }

      // Efeito de piscar se invulnerável
      if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
        ctx.globalAlpha = 0.35;
      }

      ctx.translate(this.x, this.y);
      ctx.rotate(this.tilt);

      // Renderiza a nave original
      const mainColor = this.isDashing ? '#ff00cc' : '#00eaff';
      const accentColor = '#ff2a6d';
      this.renderShipBody(ctx, mainColor, accentColor, false);

      // Escudo visual caso ativo
      if (this.shieldTimer > 0) {
        ctx.save();
        ctx.rotate(-this.tilt);
        ctx.strokeStyle = '#00eaff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00eaff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }

    renderShipBody(ctx, mainColor, accentColor, isGhost) {
      // Asas e Casco Geométrico
      ctx.beginPath();
      ctx.moveTo(24, 0);       // Bico frontal
      ctx.lineTo(-14, -16);    // Asa superior
      ctx.lineTo(-8, -6);      // Reentrância
      ctx.lineTo(-20, 0);      // Propulsor central
      ctx.lineTo(-8, 6);       // Reentrância inferior
      ctx.lineTo(-14, 16);     // Asa inferior
      ctx.closePath();

      ctx.fillStyle = isGhost ? mainColor : '#0f0026';
      ctx.fill();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = mainColor;
      ctx.shadowColor = mainColor;
      ctx.shadowBlur = isGhost ? 8 : 12;
      ctx.stroke();

      if (!isGhost) {
        // Detalhes em Magenta / Rosa
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-6, -8);
        ctx.lineTo(-6, 8);
        ctx.closePath();
        ctx.fillStyle = accentColor;
        ctx.fill();

        // Olho Neon no Cockpit
        ctx.beginPath();
        ctx.arc(4, 0, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#00eaff';
        ctx.shadowColor = '#00eaff';
        ctx.shadowBlur = 10;
        ctx.fill();

        // Detalhe de luz da pupila
        ctx.beginPath();
        ctx.arc(5, 0, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }
  }

  /* ==========================================================================
     PROJÉTEIS (DO JOGADOR E DOS INIMIGOS)
     ========================================================================== */
  class Projectile {
    constructor(x, y, vx, vy, isEnemy = false, damage = 10, color = '#00eaff', size = 5, isHoming = false) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.isEnemy = isEnemy;
      this.damage = damage;
      this.color = color;
      this.size = size;
      this.isHoming = isHoming;
      this.homingTimer = 1.8;
      this.dead = false;
    }

    update(dt, playerPos) {
      if (this.isHoming && playerPos && this.homingTimer > 0) {
        this.homingTimer -= dt;
        const angle = Math.atan2(playerPos.y - this.y, playerPos.x - this.x);
        const currentAngle = Math.atan2(this.vy, this.vx);
        const diff = angle - currentAngle;
        const speed = Math.hypot(this.vx, this.vy);
        const newAngle = currentAngle + Math.sin(diff) * 3 * dt;
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Fora da tela
      if (
        this.x < -60 ||
        this.x > CANVAS_WIDTH + 60 ||
        this.y < -60 ||
        this.y > CANVAS_HEIGHT + 60
      ) {
        this.dead = true;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;

      if (!this.isEnemy) {
        // Dardo neon de alta velocidade
        ctx.fillRect(this.x - 7, this.y - 2.5, 14, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x - 3, this.y - 1, 8, 2);
      } else {
        // Orbe energético inimigo
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ==========================================================================
     INIMIGOS (DRONE, RUSHER, SHOOTER, TANK, SPECIAL)
     ========================================================================== */
  class Enemy {
    constructor(type, x, y, stage) {
      this.type = type;
      this.x = x;
      this.y = y;
      this.stage = stage;
      this.dead = false;
      this.shootTimer = Math.random() * 1.5 + 1.0;
      this.dashTimer = 2.0;
      this.animTime = Math.random() * 10;

      switch (type) {
        case 'rusher':
          this.hp = 25 + stage * 5;
          this.maxHp = this.hp;
          this.speed = 220 + stage * 18;
          this.scoreVal = 40;
          this.color = '#ff2a6d';
          this.size = 18;
          break;
        case 'shooter':
          this.hp = 45 + stage * 8;
          this.maxHp = this.hp;
          this.speed = 110 + stage * 10;
          this.scoreVal = 50;
          this.color = '#ff00cc';
          this.size = 22;
          this.strafeDir = Math.random() < 0.5 ? 1 : -1;
          break;
        case 'tank':
          this.hp = 140 + stage * 25;
          this.maxHp = this.hp;
          this.speed = 65 + stage * 6;
          this.scoreVal = 80;
          this.color = '#7a00ff';
          this.size = 32;
          break;
        case 'special':
          this.hp = 80 + stage * 12;
          this.maxHp = this.hp;
          this.speed = 140 + stage * 12;
          this.scoreVal = 100;
          this.color = '#ffe600';
          this.size = 24;
          break;
        case 'drone':
        default:
          this.hp = 20 + stage * 5;
          this.maxHp = this.hp;
          this.speed = 130 + stage * 10;
          this.scoreVal = 30;
          this.color = '#00eaff';
          this.size = 16;
          break;
      }
    }

    update(dt, player, projectiles) {
      this.animTime += dt;

      switch (this.type) {
        case 'drone': {
          // Movimento senoidal para a esquerda
          this.x -= this.speed * dt;
          this.y += Math.sin(this.animTime * 3.5) * 120 * dt;
          break;
        }

        case 'rusher': {
          // Mira diretamente no jogador e acelera
          const angle = Math.atan2(player.y - this.y, player.x - this.x);
          this.x += Math.cos(angle) * this.speed * dt;
          this.y += Math.sin(angle) * this.speed * dt;
          break;
        }

        case 'shooter': {
          // Mantém distância no terço direito e faz strafe vertical
          const targetX = CANVAS_WIDTH - 200;
          if (this.x > targetX) this.x -= this.speed * dt;
          this.y += this.strafeDir * this.speed * 0.9 * dt;

          if (this.y < 60) this.strafeDir = 1;
          if (this.y > CANVAS_HEIGHT - 60) this.strafeDir = -1;

          // Disparo de projéteis retos em direção ao jogador
          this.shootTimer -= dt;
          if (this.shootTimer <= 0) {
            this.shootTimer = 1.6 - Math.min(0.6, this.stage * 0.08);
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            projectiles.push(
              new Projectile(this.x, this.y, Math.cos(angle) * 320, Math.sin(angle) * 320, true, 12, '#ff00cc', 6)
            );
          }
          break;
        }

        case 'tank': {
          // Avança lentamente e dispara orbes duplos pesados
          this.x -= this.speed * dt;
          this.shootTimer -= dt;
          if (this.shootTimer <= 0) {
            this.shootTimer = 2.2;
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            projectiles.push(
              new Projectile(this.x, this.y - 12, Math.cos(angle - 0.2) * 240, Math.sin(angle - 0.2) * 240, true, 20, '#7a00ff', 8)
            );
            projectiles.push(
              new Projectile(this.x, this.y + 12, Math.cos(angle + 0.2) * 240, Math.sin(angle + 0.2) * 240, true, 20, '#7a00ff', 8)
            );
          }
          break;
        }

        case 'special': {
          // Movimento em zigue-zague com dash e disparos radiais
          this.x += Math.sin(this.animTime * 2) * 90 * dt - this.speed * 0.5 * dt;
          this.y += Math.cos(this.animTime * 3) * 110 * dt;

          this.shootTimer -= dt;
          if (this.shootTimer <= 0) {
            this.shootTimer = 2.5;
            // Disparo quádruplo em cruz
            for (let i = 0; i < 4; i++) {
              const a = (i * Math.PI) / 2 + this.animTime;
              projectiles.push(
                new Projectile(this.x, this.y, Math.cos(a) * 220, Math.sin(a) * 220, true, 14, '#ffe600', 6)
              );
            }
          }
          break;
        }
      }

      // Limite de saída da tela
      if (this.x < -80 || this.y < -80 || this.y > CANVAS_HEIGHT + 80) {
        this.dead = true;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = this.color;
      ctx.fillStyle = '#0a001a';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;

      switch (this.type) {
        case 'drone': {
          // Hexágono giratório
          ctx.rotate(this.animTime * 2);
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const px = Math.cos(angle) * this.size;
            const py = Math.sin(angle) * this.size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fillStyle = this.color;
          ctx.fill();
          break;
        }

        case 'rusher': {
          // Triângulo agressivo voltado para a direção de movimento
          ctx.beginPath();
          ctx.moveTo(-this.size, -this.size * 0.7);
          ctx.lineTo(this.size * 0.9, 0);
          ctx.lineTo(-this.size, this.size * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Núcleo pulsante
          ctx.beginPath();
          ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          break;
        }

        case 'shooter': {
          // Losango com canhões laterais
          ctx.beginPath();
          ctx.moveTo(0, -this.size);
          ctx.lineTo(this.size * 1.2, 0);
          ctx.lineTo(0, this.size);
          ctx.lineTo(-this.size * 1.2, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Canhões
          ctx.fillStyle = '#ff00cc';
          ctx.fillRect(-6, -this.size - 4, 12, 4);
          ctx.fillRect(-6, this.size, 12, 4);
          break;
        }

        case 'tank': {
          // Octógono blindado
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            const px = Math.cos(a) * this.size;
            const py = Math.sin(a) * this.size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Escudo interno
          ctx.beginPath();
          ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        case 'special': {
          // Cruz cibernética pulsante
          ctx.rotate(this.animTime * 1.5);
          const s = this.size;
          ctx.beginPath();
          ctx.rect(-s / 3, -s, (s * 2) / 3, s * 2);
          ctx.rect(-s, -s / 3, s * 2, (s * 2) / 3);
          ctx.fill();
          ctx.stroke();
          break;
        }
      }

      ctx.restore();
    }
  }

  /* ==========================================================================
     SISTEMA DE POWER-UPS
     Heal, Rapid Fire, Shield
     ========================================================================== */
  class PowerUp {
    constructor(x, y, type) {
      this.x = x;
      this.y = y;
      this.type = type; // 'heal', 'rapid', 'shield'
      this.size = 18;
      this.dead = false;
      this.animTime = 0;
      this.vy = (Math.random() - 0.5) * 40;
      this.vx = -70; // Desloca suavemente para a esquerda

      switch (type) {
        case 'heal':
          this.color = '#00ff66';
          this.symbol = '❤️';
          break;
        case 'rapid':
          this.color = '#ffe600';
          this.symbol = '⚡';
          break;
        case 'shield':
        default:
          this.color = '#00eaff';
          this.symbol = '🛡️';
          break;
      }
    }

    update(dt) {
      this.animTime += dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt + Math.sin(this.animTime * 4) * 20 * dt;
      if (this.x < -40) this.dead = true;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(18, 0, 43, 0.85)';

      // Caixa de energia pulsante
      const s = this.size + Math.sin(this.animTime * 6) * 2;
      ctx.strokeRect(-s / 2, -s / 2, s, s);
      ctx.fillRect(-s / 2, -s / 2, s, s);

      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.symbol, 0, 1);
      ctx.restore();
    }
  }

  /* ==========================================================================
     SISTEMA DE CHEFÕES (5 CHEFÕES COLOSSAIS COM 3 FASES CADA)
     1. NEON OVERLORD   (Stage 1)
     2. ROAD PHANTOM    (Stage 2)
     3. CYBER ORACLE    (Stage 3)
     4. VOID MASTER     (Stage 4)
     5. THE NEON CORE   (Stage 5 - Final Boss)
     ========================================================================== */
  class Boss {
    constructor(stageData) {
      this.stageId = stageData.id;
      this.name = stageData.bossName;
      this.maxHp = stageData.bossMaxHp;
      this.hp = this.maxHp;
      this.phase = 1; // 1: 100%-66%, 2: 66%-33%, 3: 33%-0%
      this.x = CANVAS_WIDTH + 140;
      this.targetX = CANVAS_WIDTH - 180;
      this.y = CANVAS_HEIGHT / 2;
      this.width = 110;
      this.height = 110;
      this.animTime = 0;
      this.attackTimer = 2.0;
      this.laserWarningTimer = 0;
      this.laserActiveTimer = 0;
      this.laserY = 0;
      this.dead = false;
      this.chargeMode = false;
      this.chargeTargetX = 0;
      this.chargeTargetY = 0;
    }

    update(dt, player, projectiles, audio, particleSys, setScreenShake) {
      this.animTime += dt;

      // Entrada suave
      if (this.x > this.targetX) {
        this.x -= 160 * dt;
        return;
      }

      // Verificação de Transição de Fase
      const hpPercent = this.hp / this.maxHp;
      let newPhase = 1;
      if (hpPercent <= 0.33) newPhase = 3;
      else if (hpPercent <= 0.66) newPhase = 2;

      if (newPhase !== this.phase) {
        this.phase = newPhase;
        audio.playBossPhaseChange();
        setScreenShake(14, 0.4);
        particleSys.burst(this.x, this.y, '#ffe600', 50, 8);
        particleSys.addFloatingText(this.x, this.y - 60, `PHASE ${this.phase}!`, '#ffe600');
      }

      // Laser telegraph timer
      if (this.laserWarningTimer > 0) {
        this.laserWarningTimer -= dt;
        if (this.laserWarningTimer <= 0) {
          // Dispara laser de fato
          this.laserActiveTimer = 0.55;
          setScreenShake(8, 0.3);
          audio.playLaser();
        }
      }
      if (this.laserActiveTimer > 0) {
        this.laserActiveTimer -= dt;
        // Colisão contínua com laser
        if (Math.abs(player.y - this.laserY) < 28 && player.x < this.x) {
          player.takeDamage(25 * dt * 2, audio, particleSys);
        }
      }

      // Movimentação baseada no boss e fase
      this.updateMovement(dt, player);

      // Máquina de Ataques
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.executeAttackPattern(player, projectiles, audio);
        // Intervalo de ataque reduz com a fase
        const baseCooldown = Math.max(1.1, 2.6 - this.phase * 0.45 - this.stageId * 0.1);
        this.attackTimer = baseCooldown;
      }
    }

    updateMovement(dt, player) {
      const speedMod = 1 + (this.phase - 1) * 0.35;

      switch (this.stageId) {
        case 1: // Neon Overlord: Flutuação vertical suave
          this.y = CANVAS_HEIGHT / 2 + Math.sin(this.animTime * 2 * speedMod) * 160;
          break;

        case 2: // Road Phantom: Investidas horizontais periódicas
          this.y = CANVAS_HEIGHT / 2 + Math.sin(this.animTime * 2.8 * speedMod) * 180;
          this.x = this.targetX + Math.cos(this.animTime * 3) * 60;
          break;

        case 3: // Cyber Oracle: Movimento em 8 (infinito)
          this.x = this.targetX + Math.sin(this.animTime * 2 * speedMod) * 70;
          this.y = CANVAS_HEIGHT / 2 + Math.sin(this.animTime * 4 * speedMod) * 150;
          break;

        case 4: // Void Master: Teleporte e oscilação gravítica
          this.y = CANVAS_HEIGHT / 2 + Math.sin(this.animTime * 2.5 * speedMod) * 170;
          this.x = this.targetX + Math.sin(this.animTime * 1.5) * 50;
          break;

        case 5: // The Neon Core: Centro da arena com expansões
          this.x = this.targetX + Math.cos(this.animTime * 2.5) * 35;
          this.y = CANVAS_HEIGHT / 2 + Math.sin(this.animTime * 3) * 160;
          break;
      }
    }

    executeAttackPattern(player, projectiles, audio) {
      const p = this.phase;
      audio.playLaser();

      switch (this.stageId) {
        case 1: // NEON OVERLORD
          // Ataque 1: Rajada em Leque
          for (let i = -2; i <= 2; i++) {
            const angle = Math.PI + i * 0.18;
            projectiles.push(
              new Projectile(this.x - 40, this.y, Math.cos(angle) * 300, Math.sin(angle) * 300, true, 15, '#ff00cc', 6)
            );
          }
          // Fase 2+: Disparo telegrafado de laser
          if (p >= 2 && Math.random() < 0.6) {
            this.laserWarningTimer = 0.8;
            this.laserY = player.y;
          }
          // Fase 3: Chuva de fagulhas superiores
          if (p === 3) {
            for (let i = 0; i < 4; i++) {
              const xPos = Math.random() * (CANVAS_WIDTH - 250) + 100;
              projectiles.push(new Projectile(xPos, 0, 0, 260, true, 12, '#00eaff', 5));
            }
          }
          break;

        case 2: // ROAD PHANTOM
          // Ataque Radial de Projéteis
          const count = 10 + p * 2;
          for (let i = 0; i < count; i++) {
            const angle = (i * Math.PI * 2) / count + this.animTime;
            projectiles.push(
              new Projectile(this.x, this.y, Math.cos(angle) * 260, Math.sin(angle) * 260, true, 14, '#ff2a6d', 6)
            );
          }
          // Fase 2+: Projéteis teleguiados
          if (p >= 2) {
            projectiles.push(new Projectile(this.x - 30, this.y, -280, 0, true, 16, '#ffe600', 7, true));
          }
          // Fase 3: Laser horizontal veloz
          if (p === 3 && Math.random() < 0.5) {
            this.laserWarningTimer = 0.6;
            this.laserY = player.y;
          }
          break;

        case 3: // CYBER ORACLE
          // Espiral de Dados
          for (let i = 0; i < 6; i++) {
            const angle = this.animTime * 3 + (i * Math.PI) / 3;
            projectiles.push(
              new Projectile(this.x, this.y, Math.cos(angle) * 240, Math.sin(angle) * 240, true, 14, '#00ffc8', 6)
            );
          }
          // Homing Orbs
          if (p >= 2) {
            projectiles.push(new Projectile(this.x, this.y - 40, -220, -100, true, 15, '#00eaff', 7, true));
            projectiles.push(new Projectile(this.x, this.y + 40, -220, 100, true, 15, '#00eaff', 7, true));
          }
          if (p === 3) {
            this.laserWarningTimer = 0.7;
            this.laserY = player.y;
          }
          break;

        case 4: // VOID MASTER
          // Buraco Negro de Balas
          for (let i = 0; i < 12; i++) {
            const angle = Math.PI + (i - 6) * 0.22;
            projectiles.push(
              new Projectile(this.x - 40, this.y, Math.cos(angle) * 290, Math.sin(angle) * 290, true, 16, '#7a00ff', 7)
            );
          }
          if (p >= 2) {
            this.laserWarningTimer = 0.7;
            this.laserY = player.y;
          }
          if (p === 3) {
            // Chuva estelar densa
            for (let i = 0; i < 5; i++) {
              const xPos = Math.random() * (CANVAS_WIDTH - 200) + 80;
              projectiles.push(new Projectile(xPos, 0, (Math.random() - 0.5) * 80, 280, true, 14, '#ff00cc', 6));
            }
          }
          break;

        case 5: // THE NEON CORE (FINAL BOSS)
          // Padrão Cataclísmico
          const coreCount = 16 + p * 4;
          for (let i = 0; i < coreCount; i++) {
            const angle = (i * Math.PI * 2) / coreCount + this.animTime * 2;
            projectiles.push(
              new Projectile(this.x, this.y, Math.cos(angle) * 270, Math.sin(angle) * 270, true, 15, '#ff0055', 6)
            );
          }
          // Teleguiados duplos
          projectiles.push(new Projectile(this.x - 20, this.y - 30, -320, -50, true, 18, '#ffe600', 8, true));
          projectiles.push(new Projectile(this.x - 20, this.y + 30, -320, 50, true, 18, '#ffe600', 8, true));

          // Laser constante nas fases 2 e 3
          if (p >= 2 && this.laserWarningTimer <= 0 && this.laserActiveTimer <= 0) {
            this.laserWarningTimer = 0.65;
            this.laserY = player.y;
          }
          break;
      }
    }

    takeDamage(amount, audio, particleSys) {
      this.hp = Math.max(0, this.hp - amount);
      audio.playHit();
      particleSys.burst(this.x, this.y, '#ffe600', 6, 4);

      if (this.hp <= 0) {
        this.dead = true;
      }
    }

    draw(ctx) {
      ctx.save();

      // Aviso Visual do Laser (Linha Telegrafada Vermelha Pontilhada)
      if (this.laserWarningTimer > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 42, 109, 0.75)';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(this.x, this.laserY);
        ctx.lineTo(0, this.laserY);
        ctx.stroke();

        // Ponto de aviso no jogador
        ctx.fillStyle = '#ff2a6d';
        ctx.beginPath();
        ctx.arc(60, this.laserY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Laser Disparando (Feixe Colossal)
      if (this.laserActiveTimer > 0) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 18;
        ctx.shadowColor = '#ff00cc';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.moveTo(this.x, this.laserY);
        ctx.lineTo(0, this.laserY);
        ctx.stroke();

        ctx.strokeStyle = '#ff2a6d';
        ctx.lineWidth = 32;
        ctx.stroke();
        ctx.restore();
      }

      // Renderização do Boss no Espaço
      ctx.translate(this.x, this.y);

      // Cor de acordo com o estágio
      let strokeColor = '#ff00cc';
      if (this.stageId === 2) strokeColor = '#00eaff';
      if (this.stageId === 3) strokeColor = '#00ffc8';
      if (this.stageId === 4) strokeColor = '#7a00ff';
      if (this.stageId === 5) strokeColor = '#ff0055';

      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = '#080017';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 18;

      // Desenho de cada Boss Único
      switch (this.stageId) {
        case 1: // NEON OVERLORD (Fortaleza Dreadnought)
          ctx.beginPath();
          ctx.moveTo(-60, 0);
          ctx.lineTo(-20, -50);
          ctx.lineTo(50, -65);
          ctx.lineTo(65, 0);
          ctx.lineTo(50, 65);
          ctx.lineTo(-20, 50);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Canhões laterais
          ctx.strokeRect(-40, -55, 30, 14);
          ctx.strokeRect(-40, 41, 30, 14);

          // Núcleo central pulsante
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.fillStyle = '#ff2a6d';
          ctx.fill();
          break;

        case 2: // ROAD PHANTOM (Nave Fantasma Supersônica)
          ctx.beginPath();
          ctx.moveTo(-80, 0);
          ctx.lineTo(50, -45);
          ctx.lineTo(30, 0);
          ctx.lineTo(50, 45);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Barbatanas aerodinâmicas
          ctx.beginPath();
          ctx.moveTo(10, -45);
          ctx.lineTo(50, -75);
          ctx.lineTo(30, -40);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(10, 45);
          ctx.lineTo(50, 75);
          ctx.lineTo(30, 40);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;

        case 3: // CYBER ORACLE (Mente Quântica com Anéis Giratórios)
          // 3 anéis concêntricos girando em direções opostas
          for (let r = 1; r <= 3; r++) {
            ctx.save();
            ctx.rotate(this.animTime * (r % 2 === 0 ? 1.5 : -1.5) + r);
            ctx.beginPath();
            ctx.arc(0, 0, r * 22, 0, Math.PI * 2);
            ctx.setLineDash([16, 8]);
            ctx.stroke();
            ctx.restore();
          }
          // Núcleo
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fillStyle = '#00ffc8';
          ctx.fill();
          break;

        case 4: // VOID MASTER (Monolito Dimensional)
          ctx.save();
          ctx.rotate(Math.sin(this.animTime * 1.5) * 0.2);
          ctx.strokeRect(-35, -70, 70, 140);
          ctx.fillRect(-35, -70, 70, 140);

          // Runa central de vácuo
          ctx.beginPath();
          ctx.moveTo(0, -40);
          ctx.lineTo(24, 0);
          ctx.lineTo(0, 40);
          ctx.lineTo(-24, 0);
          ctx.closePath();
          ctx.fillStyle = '#ff00cc';
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          break;

        case 5: // THE NEON CORE (Reator de Fusão Cataclísmico)
          // Escudos orbitais
          for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate(this.animTime * 3 + (i * Math.PI) / 2);
            ctx.beginPath();
            ctx.arc(60, 0, 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#ffe600';
            ctx.fill();
            ctx.restore();
          }
          // Núcleo de fusão
          ctx.beginPath();
          ctx.arc(0, 0, 38 + Math.sin(this.animTime * 8) * 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ff0055';
          ctx.fill();
          ctx.stroke();
          break;
      }

      ctx.restore();
    }
  }

  /* ==========================================================================
     MOTOR DO CENÁRIO SYNTHWAVE 80s
     Sol Neon Fatiado, Montanhas Geométricas em Parallax, Grid 3D de Perspectiva
     ========================================================================== */
  class SynthwaveBackground {
    constructor() {
      this.gridOffset = 0;
      this.stars = [];
      this.initStars();
    }

    initStars() {
      this.stars = [];
      for (let i = 0; i < 80; i++) {
        this.stars.push({
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * (CANVAS_HEIGHT * 0.65),
          size: Math.random() * 2 + 0.8,
          speed: Math.random() * 15 + 8,
          twinkle: Math.random() * Math.PI * 2
        });
      }
    }

    update(dt) {
      // Movimento contínuo do grid e das estrelas
      this.gridOffset = (this.gridOffset + 180 * dt) % 40;
      for (let s of this.stars) {
        s.x -= s.speed * dt;
        s.twinkle += dt * 3;
        if (s.x < 0) {
          s.x = CANVAS_WIDTH;
          s.y = Math.random() * (CANVAS_HEIGHT * 0.65);
        }
      }
    }

    draw(ctx, stageData) {
      const horizonY = CANVAS_HEIGHT * 0.62;

      // 1. Céu em Degradê Synthwave
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, stageData.skyTop);
      skyGrad.addColorStop(1, stageData.skyBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, horizonY);

      // 2. Estrelas Cintilantes
      ctx.save();
      for (let s of this.stars) {
        const alpha = 0.4 + Math.sin(s.twinkle) * 0.4;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
      ctx.restore();

      // 3. Sol Neon com Fatias Horizontais Clássicas dos anos 80
      this.drawRetroSun(ctx, horizonY, stageData.sunColor);

      // 4. Cenário Parallax do Horizonte (Prédios, Montanhas ou Linhas)
      this.drawHorizonEnvironment(ctx, horizonY, stageData);

      // 5. Grid de Perspectiva 3D no Chão
      this.drawPerspectiveGrid(ctx, horizonY, stageData.gridColor);

      // 6. Linha Brilhante do Horizonte
      ctx.save();
      ctx.strokeStyle = stageData.horizonColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = stageData.horizonColor;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(CANVAS_WIDTH, horizonY);
      ctx.stroke();
      ctx.restore();
    }

    drawRetroSun(ctx, horizonY, sunColor) {
      const sunX = CANVAS_WIDTH * 0.55;
      const sunY = horizonY - 40;
      const sunRadius = 75;

      ctx.save();
      // Gradiente do Sol
      const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
      sunGrad.addColorStop(0, '#ffe600');
      sunGrad.addColorStop(0.5, sunColor);
      sunGrad.addColorStop(1, '#ff00cc');

      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fillStyle = sunGrad;
      ctx.shadowColor = sunColor;
      ctx.shadowBlur = 30;
      ctx.fill();

      // Fatias Horizontais (Stripes) cortando a parte inferior do sol
      ctx.fillStyle = '#050014';
      ctx.shadowBlur = 0;
      const sliceCount = 7;
      for (let i = 0; i < sliceCount; i++) {
        const sliceY = sunY + 10 + i * 9;
        const sliceHeight = 1.5 + i * 0.8;
        if (sliceY < sunY + sunRadius) {
          ctx.fillRect(sunX - sunRadius, sliceY, sunRadius * 2, sliceHeight);
        }
      }
      ctx.restore();
    }

    drawHorizonEnvironment(ctx, horizonY, stageData) {
      ctx.save();
      ctx.fillStyle = '#070014';
      ctx.strokeStyle = stageData.horizonColor;
      ctx.lineWidth = 1.5;

      if (stageData.envType === 'city') {
        // Silhueta de Arranha-Céus Cyberpunk
        const buildings = [
          { x: 30, w: 50, h: 80 }, { x: 85, w: 40, h: 120 }, { x: 130, w: 70, h: 95 },
          { x: 210, w: 45, h: 140 }, { x: 260, w: 60, h: 85 }, { x: 330, w: 80, h: 160 },
          { x: 650, w: 55, h: 130 }, { x: 710, w: 70, h: 90 }, { x: 790, w: 60, h: 150 },
          { x: 860, w: 75, h: 110 }
        ];
        for (let b of buildings) {
          ctx.fillRect(b.x, horizonY - b.h, b.w, b.h);
          ctx.strokeRect(b.x, horizonY - b.h, b.w, b.h);
        }
      } else {
        // Montanhas Geométricas Wireframe
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(80, horizonY - 70);
        ctx.lineTo(160, horizonY - 30);
        ctx.lineTo(260, horizonY - 100);
        ctx.lineTo(360, horizonY - 40);
        ctx.lineTo(440, horizonY - 80);
        ctx.lineTo(600, horizonY);
        ctx.lineTo(680, horizonY - 90);
        ctx.lineTo(780, horizonY - 35);
        ctx.lineTo(880, horizonY - 110);
        ctx.lineTo(CANVAS_WIDTH, horizonY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    drawPerspectiveGrid(ctx, horizonY, gridColor) {
      ctx.save();
      const floorGrad = ctx.createLinearGradient(0, horizonY, 0, CANVAS_HEIGHT);
      floorGrad.addColorStop(0, '#0a001a');
      floorGrad.addColorStop(1, '#050010');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, horizonY, CANVAS_WIDTH, CANVAS_HEIGHT - horizonY);

      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1.2;

      // Linhas de perspectiva divergentes
      const vanishingX = CANVAS_WIDTH / 2;
      const numLines = 24;
      for (let i = -numLines; i <= numLines; i++) {
        const bottomX = vanishingX + i * 75;
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo(bottomX, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // Linhas horizontais em movimento com escala exponencial de profundidade
      const numHorizontal = 10;
      for (let i = 0; i < numHorizontal; i++) {
        const p = ((i * 40 + this.gridOffset) % 400) / 400;
        const y = horizonY + Math.pow(p, 2.2) * (CANVAS_HEIGHT - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ==========================================================================
     GERENCIADOR PRINCIPAL DO JOGO (GAME ENGINE)
     ========================================================================== */
  class GameEngine {
    constructor() {
      // Elementos DOM
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');

      this.hudScore = document.getElementById('hud-score');
      this.hudBest = document.getElementById('hud-best');
      this.hudStage = document.getElementById('hud-stage');
      this.hudWave = document.getElementById('hud-wave');
      this.hudCombo = document.getElementById('hud-combo');
      this.hpBarFill = document.getElementById('hp-bar-fill');
      this.hpText = document.getElementById('hp-text');
      this.dashBarFill = document.getElementById('dash-bar-fill');
      this.dashText = document.getElementById('dash-text');

      this.bossHud = document.getElementById('boss-hud');
      this.bossNameText = document.getElementById('boss-name');
      this.bossHpFill = document.getElementById('boss-hp-fill');
      this.phaseTags = [
        document.getElementById('phase-tag-1'),
        document.getElementById('phase-tag-2'),
        document.getElementById('phase-tag-3')
      ];

      this.centerBanner = document.getElementById('center-banner');
      this.bannerTitle = document.getElementById('banner-title');
      this.bannerSubtitle = document.getElementById('banner-subtitle');

      this.menuOverlay = document.getElementById('menu-overlay');
      this.pauseOverlay = document.getElementById('pause-overlay');
      this.gameoverOverlay = document.getElementById('gameover-overlay');
      this.victoryOverlay = document.getElementById('victory-overlay');

      this.goScore = document.getElementById('go-score');
      this.goBest = document.getElementById('go-best');
      this.goStage = document.getElementById('go-stage');

      this.vicScore = document.getElementById('vic-score');
      this.vicBest = document.getElementById('vic-best');

      this.btnAudio = document.getElementById('btn-audio');
      this.audioIcon = document.getElementById('audio-icon');
      this.btnPause = document.getElementById('btn-pause');

      // Sistemas
      this.audio = new AudioEngine();
      this.particles = new ParticleSystem();
      this.player = new Player();
      this.bg = new SynthwaveBackground();

      // Entidades
      this.projectiles = [];
      this.enemies = [];
      this.powerups = [];
      this.boss = null;

      // Estado do Jogo
      this.state = STATES.MENU;
      this.currentStageIndex = 0; // 0 a 4 (Fases 1 a 5)
      this.currentWave = 1;       // 1 a 3
      this.maxWavesPerStage = 3;
      this.waveTimer = 0;
      this.waveClearTimer = 0;
      this.stageClearTimer = 0;
      this.enemiesToSpawn = 0;
      this.spawnCooldown = 0;

      // Pontuação e Combos
      this.score = 0;
      this.bestScore = 0;
      this.highestStage = 1;
      this.combo = 1;
      this.comboTimer = 0;

      // Efeitos de Tela
      this.shakeIntensity = 0;
      this.shakeDuration = 0;
      this.flashAlpha = 0;

      // Entrada (Teclado, Mouse e Toque)
      this.input = {
        up: false,
        down: false,
        left: false,
        right: false,
        shoot: false,
        dash: false
      };

      this.lastTime = 0;
      this.loadStorage();
      this.bindEvents();
    }

    /* ========================================================================
       PERSISTÊNCIA LOCALSTORAGE
       ======================================================================== */
    loadStorage() {
      try {
        const savedBest = localStorage.getItem('neonflappy_best_score');
        const savedStage = localStorage.getItem('neonflappy_highest_stage');
        if (savedBest) this.bestScore = parseInt(savedBest, 10) || 0;
        if (savedStage) this.highestStage = parseInt(savedStage, 10) || 1;
      } catch (e) {
        console.warn('Erro ao carregar localStorage:', e);
      }
      this.updateHud();
    }

    saveStorage() {
      try {
        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          localStorage.setItem('neonflappy_best_score', this.bestScore.toString());
        }
        const stageNum = this.currentStageIndex + 1;
        if (stageNum > this.highestStage) {
          this.highestStage = stageNum;
          localStorage.setItem('neonflappy_highest_stage', this.highestStage.toString());
        }
      } catch (e) {
        console.warn('Erro ao salvar localStorage:', e);
      }
    }

    /* ========================================================================
       EVENT LISTENERS (TECLADO, MOUSE, TOUCH E BOTÕES)
       ======================================================================== */
    bindEvents() {
      // 1. Teclado
      window.addEventListener('keydown', (e) => {
        this.audio.init();
        this.audio.resume();

        switch (e.code) {
          case 'KeyW':
          case 'ArrowUp':
            this.input.up = true;
            break;
          case 'KeyS':
          case 'ArrowDown':
            this.input.down = true;
            break;
          case 'KeyA':
          case 'ArrowLeft':
            this.input.left = true;
            break;
          case 'KeyD':
          case 'ArrowRight':
            this.input.right = true;
            break;
          case 'Space':
            this.input.shoot = true;
            if (this.state === STATES.MENU || this.state === STATES.GAME_OVER) {
              this.startGame();
            }
            e.preventDefault();
            break;
          case 'ShiftLeft':
          case 'ShiftRight':
            this.triggerDash();
            e.preventDefault();
            break;
          case 'Escape':
            this.togglePause();
            e.preventDefault();
            break;
          case 'Enter':
            if (this.state === STATES.MENU || this.state === STATES.GAME_OVER || this.state === STATES.VICTORY) {
              this.startGame();
            }
            e.preventDefault();
            break;
        }
      });

      window.addEventListener('keyup', (e) => {
        switch (e.code) {
          case 'KeyW':
          case 'ArrowUp':
            this.input.up = false;
            break;
          case 'KeyS':
          case 'ArrowDown':
            this.input.down = false;
            break;
          case 'KeyA':
          case 'ArrowLeft':
            this.input.left = false;
            break;
          case 'KeyD':
          case 'ArrowRight':
            this.input.right = false;
            break;
          case 'Space':
            this.input.shoot = false;
            break;
        }
      });

      // 2. Mouse (Disparo com clique esquerdo)
      this.canvas.addEventListener('mousedown', (e) => {
        this.audio.init();
        this.audio.resume();
        if (e.button === 0) this.input.shoot = true;
      });
      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.input.shoot = false;
      });

      // 3. Controles Touch Virtuais para Mobile
      const bindTouchBtn = (elemId, onPress, onRelease) => {
        const btn = document.getElementById(elemId);
        if (!btn) return;
        const handleStart = (ev) => {
          ev.preventDefault();
          this.audio.init();
          this.audio.resume();
          btn.classList.add('active');
          onPress();
        };
        const handleEnd = (ev) => {
          ev.preventDefault();
          btn.classList.remove('active');
          if (onRelease) onRelease();
        };
        btn.addEventListener('touchstart', handleStart, { passive: false });
        btn.addEventListener('touchend', handleEnd, { passive: false });
        btn.addEventListener('touchcancel', handleEnd, { passive: false });
      };

      bindTouchBtn('touch-up', () => (this.input.up = true), () => (this.input.up = false));
      bindTouchBtn('touch-down', () => (this.input.down = true), () => (this.input.down = false));
      bindTouchBtn('touch-left', () => (this.input.left = true), () => (this.input.left = false));
      bindTouchBtn('touch-right', () => (this.input.right = true), () => (this.input.right = false));
      bindTouchBtn('touch-shoot', () => (this.input.shoot = true), () => (this.input.shoot = false));
      bindTouchBtn('touch-dash', () => this.triggerDash());

      // 4. Botões de Interface
      document.getElementById('btn-start').addEventListener('click', () => {
        this.audio.init();
        this.audio.resume();
        this.startGame();
      });
      document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
      document.getElementById('btn-restart-pause').addEventListener('click', () => this.startGame());
      document.getElementById('btn-retry').addEventListener('click', () => this.startGame());
      document.getElementById('btn-play-again').addEventListener('click', () => this.startGame());

      this.btnAudio.addEventListener('click', () => {
        this.audio.init();
        const muted = this.audio.toggleMute();
        this.audioIcon.textContent = muted ? '🔇' : '🔊';
      });

      this.btnPause.addEventListener('click', () => this.togglePause());
    }

    triggerDash() {
      if (this.state === STATES.PLAYING || this.state === STATES.BOSS_FIGHT) {
        let mx = 0;
        let my = 0;
        if (this.input.left) mx -= 1;
        if (this.input.right) mx += 1;
        if (this.input.up) my -= 1;
        if (this.input.down) my += 1;
        this.player.dash(mx, my, this.audio);
      }
    }

    /* ========================================================================
       GERENCIAMENTO DE ESTADOS E TRANSIÇÕES
       ======================================================================== */
    startGame() {
      this.state = STATES.PLAYING;
      this.currentStageIndex = 0;
      this.currentWave = 1;
      this.score = 0;
      this.combo = 1;
      this.comboTimer = 0;

      this.player.reset();
      this.projectiles.length = 0;
      this.enemies.length = 0;
      this.powerups.length = 0;
      this.particles.clear();
      this.boss = null;

      this.menuOverlay.classList.add('hidden');
      this.pauseOverlay.classList.add('hidden');
      this.gameoverOverlay.classList.add('hidden');
      this.victoryOverlay.classList.add('hidden');
      this.bossHud.classList.add('hidden');

      this.audio.startBGM();
      this.startWave(1);
      this.showBanner(`STAGE 1: ${STAGES_DATA[0].name}`, 'SURVIVE THE NEON WAVES', 2.2);
    }

    startWave(waveNum) {
      this.state = STATES.PLAYING;
      this.currentWave = waveNum;
      // Dificuldade progressiva de inimigos por onda
      const baseEnemies = 8 + this.currentStageIndex * 4;
      this.enemiesToSpawn = baseEnemies + (waveNum - 1) * 3;
      this.spawnCooldown = 0.5;
      this.updateHud();
    }

    startBoss() {
      this.state = STATES.BOSS_INTRO;
      const stageData = STAGES_DATA[this.currentStageIndex];
      this.boss = new Boss(stageData);

      // HUD do Boss
      this.bossHud.classList.remove('hidden');
      this.bossNameText.textContent = this.boss.name;
      this.updateBossHud();

      this.audio.playBossWarning();
      this.setScreenShake(10, 1.2);
      this.showBanner('WARNING! BOSS DETECTED', this.boss.name, 2.5);

      setTimeout(() => {
        if (this.state === STATES.BOSS_INTRO) {
          this.state = STATES.BOSS_FIGHT;
        }
      }, 2500);
    }

    onWaveClear() {
      this.state = STATES.WAVE_CLEAR;
      this.addScore(100);
      this.audio.playPowerup();
      this.showBanner('WAVE CLEAR!', '+100 BONUS POINTS', 1.8);

      setTimeout(() => {
        if (this.state === STATES.WAVE_CLEAR) {
          if (this.currentWave < this.maxWavesPerStage) {
            this.startWave(this.currentWave + 1);
          } else {
            this.startBoss();
          }
        }
      }, 1900);
    }

    onBossDefeated() {
      this.state = STATES.STAGE_CLEAR;
      this.addScore(500);
      this.audio.playExplosion(true);
      this.setScreenShake(20, 1.5);
      this.bossHud.classList.add('hidden');
      this.particles.burst(this.boss.x, this.boss.y, '#ffe600', 80, 9);
      this.boss = null;

      // Drop garantido de cura e powerup
      this.powerups.push(new PowerUp(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'heal'));
      this.powerups.push(new PowerUp(CANVAS_WIDTH / 2 + 50, CANVAS_HEIGHT / 2, 'rapid'));

      this.showBanner('BOSS DEFEATED!', '+500 VICTORY BONUS', 2.4);

      setTimeout(() => {
        if (this.state === STATES.STAGE_CLEAR) {
          if (this.currentStageIndex < STAGES_DATA.length - 1) {
            this.nextStage();
          } else {
            this.victory();
          }
        }
      }, 2500);
    }

    nextStage() {
      this.currentStageIndex++;
      this.saveStorage();
      const stage = STAGES_DATA[this.currentStageIndex];
      this.showBanner(`STAGE ${stage.id}: ${stage.name}`, 'INCOMING THREATS', 2.2);
      this.startWave(1);
    }

    togglePause() {
      if (this.state === STATES.MENU || this.state === STATES.GAME_OVER || this.state === STATES.VICTORY) return;

      if (this.state === STATES.PAUSED) {
        this.state = this.previousState;
        this.pauseOverlay.classList.add('hidden');
      } else {
        this.previousState = this.state;
        this.state = STATES.PAUSED;
        this.pauseOverlay.classList.remove('hidden');
      }
    }

    gameOver() {
      this.state = STATES.GAME_OVER;
      this.saveStorage();
      this.audio.playGameOver();
      this.bossHud.classList.add('hidden');

      this.goScore.textContent = this.score.toString().padStart(6, '0');
      this.goBest.textContent = this.bestScore.toString().padStart(6, '0');
      this.goStage.textContent = `STAGE ${this.currentStageIndex + 1}`;

      this.gameoverOverlay.classList.remove('hidden');
    }

    victory() {
      this.state = STATES.VICTORY;
      this.saveStorage();
      this.audio.playVictory();
      this.bossHud.classList.add('hidden');

      this.vicScore.textContent = this.score.toString().padStart(6, '0');
      this.vicBest.textContent = this.bestScore.toString().padStart(6, '0');

      this.victoryOverlay.classList.remove('hidden');
      // Explosão de confetes neon
      for (let i = 0; i < 150; i++) {
        this.particles.add(
          Math.random() * CANVAS_WIDTH,
          Math.random() * CANVAS_HEIGHT,
          ['#ff00cc', '#00eaff', '#ffe600', '#ff2a6d'][Math.floor(Math.random() * 4)],
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          3.0,
          Math.random() * 4 + 2
        );
      }
    }

    showBanner(title, subtitle, duration = 2.0) {
      this.bannerTitle.textContent = title;
      this.bannerSubtitle.textContent = subtitle;
      this.centerBanner.classList.remove('hidden');
      clearTimeout(this.bannerTimeout);
      this.bannerTimeout = setTimeout(() => {
        this.centerBanner.classList.add('hidden');
      }, duration * 1000);
    }

    addScore(val) {
      const earned = val * this.combo;
      this.score += earned;
      if (this.score > this.bestScore) this.bestScore = this.score;
      this.updateHud();
    }

    incrementCombo() {
      this.combo = Math.min(10, this.combo + 1);
      this.comboTimer = 4.0; // 4 segundos para manter o combo
      this.updateHud();
    }

    resetCombo() {
      this.combo = 1;
      this.comboTimer = 0;
      this.updateHud();
    }

    setScreenShake(intensity, duration) {
      this.shakeIntensity = intensity;
      this.shakeDuration = duration;
    }

    /* ========================================================================
       DISPARO DO JOGADOR
       ======================================================================== */
    handlePlayerShooting(dt) {
      if (!this.input.shoot || this.player.shootCooldown > 0) return;

      const isRapid = this.player.rapidFireTimer > 0;
      this.player.shootCooldown = isRapid ? 0.1 : 0.19;
      this.audio.playLaser();

      const px = this.player.x + 22;
      const py = this.player.y;

      if (!isRapid) {
        // Canhão duplo paralelo
        this.projectiles.push(new Projectile(px, py - 6, 760, 0, false, 15, '#00eaff', 5));
        this.projectiles.push(new Projectile(px, py + 6, 760, 0, false, 15, '#00eaff', 5));
      } else {
        // Modo Rapid Fire Quádruplo em leque sutil
        this.projectiles.push(new Projectile(px, py - 10, 850, -40, false, 12, '#ffe600', 5));
        this.projectiles.push(new Projectile(px, py - 4, 850, 0, false, 14, '#00eaff', 5));
        this.projectiles.push(new Projectile(px, py + 4, 850, 0, false, 14, '#00eaff', 5));
        this.projectiles.push(new Projectile(px, py + 10, 850, 40, false, 12, '#ffe600', 5));
      }
    }

    /* ========================================================================
       SPAWNER DE INIMIGOS
       ======================================================================== */
    updateSpawning(dt) {
      if (this.state !== STATES.PLAYING) return;

      if (this.enemiesToSpawn > 0) {
        this.spawnCooldown -= dt;
        if (this.spawnCooldown <= 0) {
          this.spawnCooldown = Math.max(0.6, 1.4 - this.currentStageIndex * 0.15);
          this.enemiesToSpawn--;

          const stageData = STAGES_DATA[this.currentStageIndex];
          const availableTypes = stageData.enemyTypes;
          const chosenType = availableTypes[Math.floor(Math.random() * availableTypes.length)];

          const spawnY = Math.random() * (CANVAS_HEIGHT - 120) + 60;
          this.enemies.push(new Enemy(chosenType, CANVAS_WIDTH + 40, spawnY, this.currentStageIndex + 1));
        }
      } else if (this.enemies.length === 0) {
        // Todos os inimigos da onda foram derrotados!
        this.onWaveClear();
      }
    }

    /* ========================================================================
       DETECÇÃO DE COLISÕES
       ======================================================================== */
    checkCollisions() {
      // 1. Projéteis do Jogador atingem Inimigos
      for (let p of this.projectiles) {
        if (p.dead || p.isEnemy) continue;

        // Contra Inimigos Comuns
        for (let e of this.enemies) {
          if (e.dead) continue;
          const dist = Math.hypot(p.x - e.x, p.y - e.y);
          if (dist < e.size + p.size + 4) {
            p.dead = true;
            e.hp -= p.damage;
            this.particles.burst(p.x, p.y, e.color, 8, 3);
            this.audio.playHit();

            if (e.hp <= 0) {
              e.dead = true;
              this.addScore(e.scoreVal);
              this.incrementCombo();
              this.audio.playExplosion(false);
              this.particles.burst(e.x, e.y, e.color, 22, 5);
              this.particles.addFloatingText(e.x, e.y, `+${e.scoreVal * this.combo}`, '#00eaff');

              // Chance de drop de PowerUp (14%)
              if (Math.random() < 0.14) {
                const types = ['heal', 'rapid', 'shield'];
                const pType = types[Math.floor(Math.random() * types.length)];
                this.powerups.push(new PowerUp(e.x, e.y, pType));
              }
            }
            break;
          }
        }

        // Contra o Chefão
        if (this.boss && !this.boss.dead && !p.dead) {
          const distBoss = Math.hypot(p.x - this.boss.x, p.y - this.boss.y);
          if (distBoss < this.boss.width * 0.55 + p.size) {
            p.dead = true;
            this.boss.takeDamage(p.damage, this.audio, this.particles);
            this.addScore(5); // +5 por acerto no boss
            this.updateBossHud();
            if (this.boss.dead) {
              this.onBossDefeated();
            }
          }
        }
      }

      // 2. Projéteis Inimigos atingem o Jogador
      for (let p of this.projectiles) {
        if (p.dead || !p.isEnemy) continue;

        const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (dist < 18 + p.size) {
          p.dead = true;
          const damaged = this.player.takeDamage(p.damage, this.audio, this.particles);
          if (damaged) {
            this.resetCombo();
            this.setScreenShake(10, 0.25);
            if (this.player.hp <= 0) this.gameOver();
          }
        }
      }

      // 3. Colisão Direta Inimigo <-> Jogador
      for (let e of this.enemies) {
        if (e.dead) continue;
        const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (dist < e.size + 16) {
          e.dead = true;
          this.particles.burst(e.x, e.y, e.color, 18, 4);
          const damaged = this.player.takeDamage(20, this.audio, this.particles);
          if (damaged) {
            this.resetCombo();
            this.setScreenShake(12, 0.3);
            if (this.player.hp <= 0) this.gameOver();
          }
        }
      }

      // 4. Coleta de Power-ups pelo Jogador
      for (let pu of this.powerups) {
        if (pu.dead) continue;
        const dist = Math.hypot(pu.x - this.player.x, pu.y - this.player.y);
        if (dist < pu.size + 20) {
          pu.dead = true;
          this.audio.playPowerup();

          if (pu.type === 'heal') {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
            this.particles.addFloatingText(this.player.x, this.player.y - 30, '+35 HP', '#00ff66');
          } else if (pu.type === 'rapid') {
            this.player.rapidFireTimer = 8.0;
            this.particles.addFloatingText(this.player.x, this.player.y - 30, 'RAPID FIRE!', '#ffe600');
          } else if (pu.type === 'shield') {
            this.player.shieldTimer = 6.0;
            this.particles.addFloatingText(this.player.x, this.player.y - 30, 'SHIELD ON!', '#00eaff');
          }
          this.updateHud();
        }
      }
    }

    /* ========================================================================
       ATUALIZAÇÃO GERAL (UPDATE)
       ======================================================================== */
    update(dt) {
      if (this.state === STATES.PAUSED) return;

      // Atualiza fundo Synthwave
      const stageData = STAGES_DATA[this.currentStageIndex];
      this.bg.update(dt);

      // Atualiza Partículas
      this.particles.update(dt);

      // Decaimento de Screen Shake
      if (this.shakeDuration > 0) {
        this.shakeDuration -= dt;
        if (this.shakeDuration <= 0) this.shakeIntensity = 0;
      }

      // Timer de Combo
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.resetCombo();
      }

      // Atualiza Jogador se em jogo ou batalha
      if (
        this.state === STATES.PLAYING ||
        this.state === STATES.WAVE_CLEAR ||
        this.state === STATES.BOSS_INTRO ||
        this.state === STATES.BOSS_FIGHT ||
        this.state === STATES.STAGE_CLEAR
      ) {
        this.player.update(dt, this.input, this.audio, this.particles);
        this.handlePlayerShooting(dt);
        this.updateSpawning(dt);
      }

      // Atualiza Projéteis
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.update(dt, { x: this.player.x, y: this.player.y });
        if (p.dead) this.projectiles.splice(i, 1);
      }

      // Atualiza Inimigos
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.update(dt, this.player, this.projectiles);
        if (e.dead) this.enemies.splice(i, 1);
      }

      // Atualiza Power-ups
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const pu = this.powerups[i];
        pu.update(dt);
        if (pu.dead) this.powerups.splice(i, 1);
      }

      // Atualiza Boss se presente
      if (this.boss && !this.boss.dead) {
        this.boss.update(
          dt,
          this.player,
          this.projectiles,
          this.audio,
          this.particles,
          (int, dur) => this.setScreenShake(int, dur)
        );
      }

      // Checa Colisões
      if (this.state === STATES.PLAYING || this.state === STATES.BOSS_FIGHT) {
        this.checkCollisions();
      }

      // Atualiza Barras do HUD
      this.updateHudBars();
    }

    /* ========================================================================
       RENDERIZAÇÃO GERAL (DRAW)
       ======================================================================== */
    draw() {
      this.ctx.save();

      // Aplica Screen Shake
      if (this.shakeIntensity > 0) {
        const sx = (Math.random() - 0.5) * this.shakeIntensity;
        const sy = (Math.random() - 0.5) * this.shakeIntensity;
        this.ctx.translate(sx, sy);
      }

      // 1. Cenário Retro Synthwave
      const stageData = STAGES_DATA[this.currentStageIndex];
      this.bg.draw(this.ctx, stageData);

      // 2. Power-ups
      for (let pu of this.powerups) pu.draw(this.ctx);

      // 3. Inimigos Comuns
      for (let e of this.enemies) e.draw(this.ctx);

      // 4. Chefão
      if (this.boss && !this.boss.dead) this.boss.draw(this.ctx);

      // 5. Projéteis
      for (let p of this.projectiles) p.draw(this.ctx);

      // 6. Jogador
      if (
        this.state === STATES.PLAYING ||
        this.state === STATES.WAVE_CLEAR ||
        this.state === STATES.BOSS_INTRO ||
        this.state === STATES.BOSS_FIGHT ||
        this.state === STATES.STAGE_CLEAR
      ) {
        this.player.draw(this.ctx);
      }

      // 7. Partículas
      this.particles.draw(this.ctx);

      this.ctx.restore();
    }

    /* ========================================================================
       SINCRONIZAÇÃO DE HUD
       ======================================================================== */
    updateHud() {
      this.hudScore.textContent = this.score.toString().padStart(6, '0');
      this.hudBest.textContent = this.bestScore.toString().padStart(6, '0');
      this.hudStage.textContent = (this.currentStageIndex + 1).toString();
      this.hudWave.textContent = `${this.currentWave} / ${this.maxWavesPerStage}`;
      this.hudCombo.textContent = `x${this.combo}`;
      this.hudCombo.style.color = this.combo > 1 ? '#ff7700' : '#00eaff';
    }

    updateHudBars() {
      // Barra de HP
      const hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
      this.hpBarFill.style.width = `${hpPct}%`;
      this.hpText.textContent = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;

      // Barra de Dash
      const dashReady = this.player.dashCooldown <= 0;
      const dashPct = dashReady
        ? 100
        : ((this.player.dashMaxCooldown - this.player.dashCooldown) / this.player.dashMaxCooldown) * 100;
      this.dashBarFill.style.width = `${dashPct}%`;
      this.dashText.textContent = dashReady ? 'READY' : 'CHARGING';
      this.dashText.style.color = dashReady ? '#00eaff' : '#ff00cc';
    }

    updateBossHud() {
      if (!this.boss) return;
      const hpPct = Math.max(0, (this.boss.hp / this.boss.maxHp) * 100);
      this.bossHpFill.style.width = `${hpPct}%`;

      // Atualiza tags de fases I, II, III
      this.phaseTags.forEach((tag, idx) => {
        if (idx + 1 === this.boss.phase) {
          tag.classList.add('active');
        } else {
          tag.classList.remove('active');
        }
      });
    }

    /* ========================================================================
       GAME LOOP COM DELTATIME
       ======================================================================== */
    loop(timestamp) {
      if (!this.lastTime) this.lastTime = timestamp;
      const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
      this.lastTime = timestamp;

      this.update(dt);
      this.draw();

      requestAnimationFrame((t) => this.loop(t));
    }

    start() {
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  // Inicializa o jogo ao carregar a página
  window.addEventListener('DOMContentLoaded', () => {
    const engine = new GameEngine();
    engine.start();
  });
})();
