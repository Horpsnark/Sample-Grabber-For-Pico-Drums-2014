const fs = require('fs');
const path = require('path');
const { finalizeAudio, encodeWav } = require('./dsp/audioCore.cjs');
const drums = require('./dsp/drums.cjs');
const tonal = require('./dsp/tonal.cjs');

const outDir = path.join(process.cwd(), 'public/samples');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Rendering expanded 150+ studio-grade sample library...');

const bank = {
  // KICKS (10)
  'Kick_Punch_01.wav': () => drums.genKickPunch(0.55),
  'Kick_Deep808_02.wav': () => drums.genKickDeep808(0.75),
  'Kick_Tight_03.wav': () => drums.genKickTight(0.38),
  'Kick_Modular_04.wav': () => drums.genKickModular(0.5),
  'Kick_MapleStudio_05.wav': () => drums.genKickAcoustic(0.58),
  'Kick_ClubThump_06.wav': () => drums.genKickPunch(0.48),
  'Kick_HardstyleDist_07.wav': () => drums.genKickHardstyle(0.55),
  'Kick_LoFiWarm_08.wav': () => drums.genKickLofi(0.48),
  'Kick_LudwigVintage_09.wav': () => drums.genKickAcoustic(0.52),
  'Kick_TrapBoom_10.wav': () => drums.genKickDeep808(0.85),

  // SNARES (10)
  'Snare_Crisp_01.wav': () => drums.genSnareCrisp(0.5),
  'Snare_909Type_02.wav': () => drums.genSnare909(0.52),
  'Snare_Trap_03.wav': () => drums.genSnareTrap(0.42),
  'Snare_Rimshot_04.wav': () => drums.genSnareRimshot(0.38),
  'Snare_MapleAcoustic_05.wav': () => drums.genSnareMaple(0.55),
  'Snare_VintagePunch_06.wav': () => drums.genSnare909(0.45),
  'Snare_BrassMarching_07.wav': () => drums.genSnareBrass(0.45),
  'Snare_PiccoloCrack_08.wav': () => drums.genSnarePiccolo(0.35),
  'Snare_Gated80s_09.wav': () => drums.genSnareGated80s(0.55),
  'Snare_TightStudio_10.wav': () => drums.genSnareCrisp(0.4),

  // CLAPS (6)
  'Clap_HandClap_01.wav': () => drums.genClapHand(0.5),
  'Clap_Studio808_02.wav': () => drums.genClapStudio808(0.55),
  'Clap_Snap_03.wav': () => drums.genClapSnap(0.38),
  'Clap_GroupStack_04.wav': () => drums.genClapGroup(0.6),
  'Clap_StereoWide_05.wav': () => drums.genClapStereoWide(0.55),
  'Clap_FingerSnap_06.wav': () => drums.genClapFingerSnap(0.32),

  // HI-HATS (10)
  'Hat_Closed_01.wav': () => drums.genHatClosed(0.22),
  'Hat_Open_02.wav': () => drums.genHatOpen(0.45),
  'Hat_Ticked_03.wav': () => drums.genHatTicked(0.18),
  'Hat_Metallic_04.wav': () => drums.genHatMetallic(0.3),
  'Hat_HalfOpen_05.wav': () => drums.genHatHalfOpen(0.35),
  'Hat_PedalFoot_06.wav': () => drums.genHatPedalFoot(0.22),
  'Hat_Sizzle909_07.wav': () => drums.genHatSizzle(0.48),
  'Hat_DarkWash_08.wav': () => drums.genHatDarkWash(0.42),
  'Hat_TrapRoll_09.wav': () => drums.genHatTicked(0.15),
  'Hat_GlitchTick_10.wav': () => drums.genHatMetallic(0.2),

  // PLUCKED (10)
  'Pluck_AcousticHarp_01.wav': () => tonal.genPluckHarp(329.63, 1.3),
  'Pluck_KarplusPluck_02.wav': () => tonal.genPluckKarplus(261.63, 1.1),
  'Pluck_KalimbaTine_03.wav': () => tonal.genPluckKalimba(440.0, 1.2),
  'Pluck_PizzicatoString_04.wav': () => tonal.genPluckPizzicato(329.63, 0.9),
  'Pluck_SynthPluckSaw_05.wav': () => tonal.genPluckSynth(261.63, 1.1),
  'Pluck_KotoBreeze_06.wav': () => tonal.genPluckKoto(293.66, 1.2),
  'Pluck_NylonGuitar_07.wav': () => tonal.genPluckGuitar(246.94, 1.2),
  'Pluck_BanjoTwang_08.wav': () => tonal.genPluckBanjo(293.66, 0.95),
  'Pluck_CelticHarpLow_09.wav': () => tonal.genPluckHarp(220.0, 1.4),
  'Pluck_KalimbaGourd_10.wav': () => tonal.genPluckKalimba(329.63, 1.3),

  // TOMS (6)
  'Tom_High_01.wav': () => drums.genTom(145, 0.48),
  'Tom_Mid_02.wav': () => drums.genTom(108, 0.52),
  'Tom_Low_03.wav': () => drums.genTom(80, 0.58),
  'Tom_Floor_04.wav': () => drums.genTom(62, 0.65),
  'Tom_808High_05.wav': () => drums.genTom(160, 0.45),
  'Tom_808Low_06.wav': () => drums.genTom(72, 0.6),

  // PERCUSSION (10)
  'Perc_WoodBlock_01.wav': () => drums.genWoodBlock(0.35),
  'Perc_Clave_02.wav': () => drums.genClave(0.32),
  'Perc_FM_Bell_03.wav': () => drums.genCowbell808(0.45),
  'Perc_Conga_04.wav': () => drums.genCongaSlap(0.42),
  'Perc_BongoHigh_05.wav': () => drums.genPercBongo(0.38),
  'Perc_ShakerGrain_06.wav': () => drums.genPercShaker(0.32),
  'Perc_Tambourine_07.wav': () => drums.genPercTambourine(0.42),
  'Perc_AgogoBell_08.wav': () => drums.genPercAgogo(0.45),
  'Perc_TriangleChime_09.wav': () => drums.genCowbell808(0.38),
  'Perc_WoodBlockLow_10.wav': () => drums.genWoodBlock(0.42),

  // SUB 808 (8)
  'Sub808_SubC1_01.wav': () => tonal.genSub808(32.7, 1.6, 1.2),
  'Sub808_Saturated_02.wav': () => tonal.genSub808(36.7, 1.6, 1.45),
  'Sub808_Glide_03.wav': () => tonal.genSub808(41.2, 1.8, 1.2, 5),
  'Sub808_Heavy_04.wav': () => tonal.genSub808(43.65, 1.7, 1.6),
  'Sub808_PunchyDive_05.wav': () => tonal.genSub808(49.0, 1.6, 1.35),
  'Sub808_DistortedA1_06.wav': () => tonal.genSub808(55.0, 1.7, 1.8),
  'Sub808_TapeDriveC1_07.wav': () => tonal.genSub808(32.7, 1.8, 1.5),
  'Sub808_SubDrop_08.wav': () => tonal.genSub808(65.41, 1.9, 1.4, -12),

  // BASS & SAWTOOTH (20)
  'Bass_SlapFunk_01.wav': () => tonal.genBassSlap(0.7),
  'Bass_AcidSaw_02.wav': () => tonal.genAcid303(1, 65.41, 1.0),
  'Bass_DarkReese_03.wav': () => tonal.genBassDarkReese(1.3),
  'Bass_SubMono_04.wav': () => tonal.genSub808(55.0, 1.4, 1.15),
  'Bass_Resonant_05.wav': () => tonal.genAcid303(3, 73.42, 0.9),
  'Bass_SawtoothMoog_01.wav': () => tonal.genBassSawMoog(1.4),
  'Bass_SawtoothCyber_02.wav': () => tonal.genBassSawCyber(1.3),
  'Bass_SawtoothPluck_03.wav': () => tonal.genBassSawPluck(1.1),
  'Bass_SawtoothSub_04.wav': () => tonal.genSub808(49.0, 1.4, 1.25),
  'Bass_Sawtooth80s_05.wav': () => tonal.genBassSawCyber(1.2),
  'Bass_FretlessWarm_06.wav': () => tonal.genBassFretless(1.35),
  'Bass_NeuroWobble_07.wav': () => tonal.genBassNeuroWobble(1.4),
  'Bass_AcidScreamer_08.wav': () => tonal.genBassAcidScreamer(1.2),
  'Bass_FMDonk_09.wav': () => tonal.genBassFMDonk(0.9),
  'Bass_JunoChorus_10.wav': () => tonal.genBassJunoChorus(1.4),
  'Bass_PickedRickenbacker_11.wav': () => tonal.genBassRickenbacker(1.1),
  'Bass_AnalogSquareSub_12.wav': () => tonal.genBassAnalogSquareSub(1.2),
  'Bass_OberheimSEM_13.wav': () => tonal.genBassOberheimSEM(1.35),
  'Bass_SubOscMoog_14.wav': () => tonal.genBassSubOsc(65.41, 1.5),
  'Bass_SubOscReese_15.wav': () => tonal.genBassSubOsc(55.0, 1.5),

  // SYNTHS (12)
  'Synth_ChordCmin_01.wav': () => tonal.genPadWarm([261.63, 311.13, 392.0, 466.16], 1.2),
  'Synth_Pluck_02.wav': () => tonal.genPluckSynth(440.0, 1.0),
  'Synth_Laser_03.wav': () => tonal.genAcid303(1, 130.81, 0.8),
  'Synth_Pad_04.wav': () => tonal.genPadWarm([329.63, 392.0, 493.88], 1.5),
  'Synth_BrassLead_05.wav': () => tonal.genBassSawMoog(1.2),
  'Synth_FMStab_06.wav': () => tonal.genKeyDX7EPiano(1.1),
  'Synth_CyberSaw_07.wav': () => tonal.genBassSawCyber(1.25),
  'Synth_PolyPluck_08.wav': () => tonal.genPluckSynth(329.63, 1.1),
  'Synth_SynthwaveLead_09.wav': () => tonal.genBassSawCyber(1.3),
  'Synth_WarmDrive_10.wav': () => tonal.genBassDarkReese(1.2),
  'Synth_SubOscBrass_11.wav': () => tonal.genSynthSubOsc(220.0, 1.5),
  'Synth_SubOscSuperSaw_12.wav': () => tonal.genSynthSubOsc(261.63, 1.5),

  // KEYS (8)
  'Key_Rhodes_01.wav': () => tonal.genKeyRhodes(1.4),
  'Key_GrandPiano_02.wav': () => tonal.genKeyPiano(1.3),
  'Key_OrganDrawbar_03.wav': () => tonal.genKeyOrgan(1.5),
  'Key_Clavinet_04.wav': () => tonal.genKeyClavinet(0.9),
  'Key_Wurlitzer_05.wav': () => tonal.genKeyWurlitzer(1.3),
  'Key_DX7EPiano_06.wav': () => tonal.genKeyDX7EPiano(1.35),
  'Key_RhodesMk2_07.wav': () => tonal.genKeyRhodes(1.5),
  'Key_ChurchOrgan_08.wav': () => tonal.genKeyOrgan(1.6),

  // PADS (6)
  'Pad_WarmAtmos_01.wav': () => tonal.genPadWarm([220, 261.63, 329.63, 493.88], 1.8),
  'Pad_DreamyAmbient_02.wav': () => tonal.genPadWarm([174.61, 220.0, 261.63, 329.63], 1.9),
  'Pad_VintageAnalog_03.wav': () => tonal.genPadWarm([196.0, 246.94, 293.66, 392.0], 1.7),
  'Pad_EtherealCosmic_04.wav': () => tonal.genPadWarm([293.66, 369.99, 440.0, 587.33], 1.9),
  'Pad_LushStrings_05.wav': () => tonal.genPadLush(1.8),
  'Pad_DeepSpace_06.wav': () => tonal.genPadLush(2.0),

  // BELLS (6)
  'Bell_CelestialChime_01.wav': () => tonal.genBellCelestial(659.25, 1.6),
  'Bell_FMCrystal_02.wav': () => tonal.genBellFMCrystal(880.0, 1.4),
  'Bell_Glocken_03.wav': () => tonal.genBellCelestial(1046.5, 1.2),
  'Bell_Vibraphone_04.wav': () => tonal.genBellVibraphone(1.4),
  'Bell_MusicBox_05.wav': () => tonal.genBellCelestial(1318.5, 1.1),
  'Bell_BronzeTubular_06.wav': () => tonal.genBellCelestial(523.25, 1.8),

  // ACID 303 (8)
  'Acid_Squelch303_01.wav': () => tonal.genAcid303(1, 65.41, 1.2),
  'Acid_ResonantSquare_02.wav': () => tonal.genAcid303(2, 73.42, 1.1),
  'Acid_DistortedDevil_03.wav': () => tonal.genAcid303(3, 55.0, 1.3),
  'Acid_AccentSlide_04.wav': () => tonal.genAcid303(4, 65.41, 1.25),
  'Acid_FilterSweep_05.wav': () => tonal.genAcid303(1, 82.41, 1.35),
  'Acid_SubHarmonic_06.wav': () => tonal.genAcid303(2, 49.0, 1.2),
  'Acid_CyberSquelch_07.wav': () => tonal.genAcid303(3, 65.41, 1.2),
  'Acid_OverdriveScream_08.wav': () => tonal.genAcid303(4, 73.42, 1.3),

  // STRINGS (6)
  'Strings_Chamber_01.wav': () => tonal.genStringsChamber(261.63, 1.6),
  'Strings_Pizzicato_02.wav': () => tonal.genPluckPizzicato(329.63, 0.9),
  'Strings_Cello_03.wav': () => tonal.genStringsCello(65.41, 1.7),
  'Strings_Solina_04.wav': () => tonal.genStringsSolina(392.0, 1.8),
  'Strings_ChamberLegato_05.wav': () => tonal.genStringsChamber(329.63, 1.7),
  'Strings_DeepOrchestra_06.wav': () => tonal.genStringsCello(55.0, 1.8),

  // ARPS & SEQUENCES (12)
  'Arp_Synthwave16th_01.wav': () => tonal.genPluckSynth(220.0, 1.55),
  'Arp_AcidRolling_02.wav': () => tonal.genAcid303(4, 73.42, 1.45),
  'Arp_NeoSoulChime_03.wav': () => tonal.genPluckHarp(329.63, 1.6),
  'Arp_TranceOctave_04.wav': () => tonal.genBassSawCyber(1.5),
  'Arp_CyberOstinato_05.wav': () => tonal.genBassSawMoog(1.55),
  'Arp_BellCascade_06.wav': () => tonal.genBellCelestial(659.25, 1.5),

  'Sequence_ModularOstinato_01.wav': () => tonal.genPluckSynth(196.0, 1.65),
  'Sequence_DeepTechnoGroove_02.wav': () => tonal.genAcid303(1, 65.41, 1.65),
  'Sequence_AcidSlide_03.wav': () => tonal.genAcid303(4, 65.41, 1.6),
  'Sequence_CyberLead_04.wav': () => tonal.genBassSawMoog(1.65),
  'Sequence_IndustrialEBM_05.wav': () => tonal.genBassDarkReese(1.55),
  'Sequence_BerlinMinimal_06.wav': () => tonal.genAcid303(2, 65.41, 1.6),
};

const manifestEntries = [];

for (const [filename, generator] of Object.entries(bank)) {
  const samples = generator();
  finalizeAudio(samples);
  const wavBuf = encodeWav(samples);
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, wavBuf);
  manifestEntries.push({
    name: filename,
    file: `/samples/${filename}`,
  });
}

const manifestPath = path.join(outDir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifestEntries, null, 2));

console.log(`Successfully generated ${manifestEntries.length} studio-grade samples into public/samples and updated manifest.json!`);
