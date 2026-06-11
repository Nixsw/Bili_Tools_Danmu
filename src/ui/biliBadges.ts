import type { FanMedalColors, GuardType } from "../core/types";

interface FanMedalPalette {
  start: string;
  end: string;
  border: string;
  text: string;
  level: string;
}

const BILI_WEALTH_MEDAL_MAX_LEVEL = 80;

const BILI_WEALTH_MEDAL_SOURCE_URLS: Record<number, string> = {
  1: "https://i0.hdslb.com/bfs/live/119d1b5e2cc1ecff7dba8a3b2e66d1bcf9d85942.png",
  2: "https://i0.hdslb.com/bfs/live/d5d9012ac85acd04a127f81ce252a533d5bc6bbf.png",
  3: "https://i0.hdslb.com/bfs/live/5d5e873b7b0d1894c56c4843bfba4617ff22e490.png",
  4: "https://i0.hdslb.com/bfs/live/5fbc1f0cdc0ed37bd050be8d6d7f0f0b9041d025.png",
  5: "https://i0.hdslb.com/bfs/live/24f6ef867c3905064136f5c4e33a8d423d41ebdd.png",
  6: "https://i0.hdslb.com/bfs/live/b97aa0c6375f1db1881992cbcc440c18fb58ed7a.png",
  7: "https://i0.hdslb.com/bfs/live/d5625ac19f4b3218c35f58befb7117676115bd91.png",
  8: "https://i0.hdslb.com/bfs/live/1dbea7af623d5a815cd8b165943780533ff8deab.png",
  9: "https://i0.hdslb.com/bfs/live/9c4cb36748ef273aeef40acf66b01ffaab9bf571.png",
  10: "https://i0.hdslb.com/bfs/live/257f76917abd25d1012ab71c3f3de4ef9b78e735.png",
  11: "https://i0.hdslb.com/bfs/live/47ca74b4068ee8ffaee37b3bf3b9590d7ffcb303.png",
  12: "https://i0.hdslb.com/bfs/live/f5f0cb238bfa8a4481fc67ee7e99c32e3b62ce83.png",
  13: "https://i0.hdslb.com/bfs/live/bdcf04886c2989982ce7099aba62d0a54696d8f7.png",
  14: "https://i0.hdslb.com/bfs/live/7bac2946dd45b392350767deb8a61a088577300a.png",
  15: "https://i0.hdslb.com/bfs/live/97cfaab2e9586d0f71d9620ffc583262d7f16fab.png",
  16: "https://i0.hdslb.com/bfs/live/ea32c9db0a5402580541ec974f336ad55b473869.png",
  17: "https://i0.hdslb.com/bfs/live/b6f2bf3e27f22b3039594842f0005b05a0dc5dae.png",
  18: "https://i0.hdslb.com/bfs/live/256d22fcb8375155a29b01709960bfa74124ae1b.png",
  19: "https://i0.hdslb.com/bfs/live/904f4103b940a9a219fca139b2470f61276fb3ac.png",
  20: "https://i0.hdslb.com/bfs/live/f2e9bb8c425fe5676274ad53d94bf09f2e64ec15.png",
  21: "https://i0.hdslb.com/bfs/live/690c9a06d47e9cc53d78c0d951caef97bfcc6374.png",
  22: "https://i0.hdslb.com/bfs/live/432b56353ba54539ecdfbd4787ac202d1ebdedb0.png",
  23: "https://i0.hdslb.com/bfs/live/caeb95e67eb8f447d55e526a67fb065eb01a9fb7.png",
  24: "https://i0.hdslb.com/bfs/live/d3162320a7b844113343faae9eedbe840860f77f.png",
  25: "https://i0.hdslb.com/bfs/live/7e3c647c9b6abea76703f43fe89f0dd729a63954.png",
  26: "https://i0.hdslb.com/bfs/live/eb0eb470781f40cc0b89744d957fd7691b3c82fb.png",
  27: "https://i0.hdslb.com/bfs/live/30239fa2c87649764441994f34e977070a00cc83.png",
  28: "https://i0.hdslb.com/bfs/live/62fe89aef112353cfd97016b4b2cc653438642ac.png",
  29: "https://i0.hdslb.com/bfs/live/42ab698deecaef1e3b762dfbbc7251dc04b2f3d4.png",
  30: "https://i0.hdslb.com/bfs/live/a33f6d3e7c49f1c48cd04711d41d37423edc64b1.png",
  31: "https://i0.hdslb.com/bfs/live/70c26e99737de722d1cd40fc796655fad3d97d8f.png",
  32: "https://i0.hdslb.com/bfs/live/8dac191a14bdef6bb28cd2465b9f58bc3719e072.png",
  33: "https://i0.hdslb.com/bfs/live/8d0656d3a7a74480b2faf6c9488794e54d0da026.png",
  34: "https://i0.hdslb.com/bfs/live/6c8e9dcc45d287ddcacf3ce173adb0e2efae4766.png",
  35: "https://i0.hdslb.com/bfs/live/feeeb932f1a49b7f9ecba64f219303e6ad8735ef.png",
  36: "https://i0.hdslb.com/bfs/live/1f2c072ea8a2c97f78bcc6d75d04d5efd36374b6.png",
  37: "https://i0.hdslb.com/bfs/live/fe08f62c736f93362b307d02f13beff0bd630d61.png",
  38: "https://i0.hdslb.com/bfs/live/1ab6867526cb353b50f95523b848610d66ac8e8d.png",
  39: "https://i0.hdslb.com/bfs/live/569833b0ec45dc23b9c1255c1861093579b83047.png",
  40: "https://i0.hdslb.com/bfs/live/8408c0e430954d5fbd62136216f95ea296405c11.png",
  41: "https://i0.hdslb.com/bfs/live/2a956d7d87a2fa0af0c0874e9cb80202b4159516.png",
  42: "https://i0.hdslb.com/bfs/live/2ddda12d433eeed4fb4f96c224cb8a47969cc9ce.png",
  43: "https://i0.hdslb.com/bfs/live/cb770942daf9418442cc2425368e2c3975c7bb1a.png",
  44: "https://i0.hdslb.com/bfs/live/f2e514f40d81133b5195a340e74b9183efa888ec.png",
  45: "https://i0.hdslb.com/bfs/live/5a2f391da163b04872b3beb74f9ed52db3bf5288.png",
  46: "https://i0.hdslb.com/bfs/live/63a4c359713cb9a595e310e1738b59cd4fdee373.png",
  47: "https://i0.hdslb.com/bfs/live/6613b195feb091aae8e2c3225ee0b9b087922796.png",
  48: "https://i0.hdslb.com/bfs/live/17617c5b54b3f9de31ba0737f87266b201a3ad51.png",
  49: "https://i0.hdslb.com/bfs/live/71c4e43ef758802d55e8294b32cab59393b959a0.png",
  50: "https://i0.hdslb.com/bfs/live/251c195061fd9ca573cb9e6207ca05c3cebc1def.png",
  51: "https://i0.hdslb.com/bfs/live/cc327f1dcfecfd333f93c28ac9fa0588ac90e118.png",
  52: "https://i0.hdslb.com/bfs/live/d89b1dbed63531c43b6b5ef903be3ddb6bee0b23.png",
  53: "https://i0.hdslb.com/bfs/live/4a7190a04d94a87d2f760f5d4ced11be2d197438.png",
  54: "https://i0.hdslb.com/bfs/live/7b35507cb0f31a964731c4d7cc02b8d76df5df9d.png",
  55: "https://i0.hdslb.com/bfs/live/3a33a87fcdb4f0b4aae08d3894cd5486fd6790ba.png",
  56: "https://i0.hdslb.com/bfs/live/a4a5e5f7a52e954dc18995928fcdaceae41d8add.png",
  57: "https://i0.hdslb.com/bfs/live/127f155cd574e6f9dbadf005d950ed50824ce7dc.png",
  58: "https://i0.hdslb.com/bfs/live/17fabe17c6852a369ff0b23288f41eca9ecb2a67.png",
  59: "https://i0.hdslb.com/bfs/live/d1bb2255903d71f10db5e37869535685baf32210.png",
  60: "https://i0.hdslb.com/bfs/live/6cefae10e2801a9e27a38267e2b9cf5a9e03bddd.png",
  61: "https://i0.hdslb.com/bfs/live/a40f6e3616e4ae545ca64467687366fddc701c39.png",
  62: "https://i0.hdslb.com/bfs/live/24ac8d77a937a8d732b1ef79e0d7ced49ac6060d.png",
  63: "https://i0.hdslb.com/bfs/live/cf0031c5d0a80e3a10bbb1b219a63d2bda52fb11.png",
  64: "https://i0.hdslb.com/bfs/live/15f21f0c7f5f391148ac1a52df9d1bc1b1190835.png",
  65: "https://i0.hdslb.com/bfs/live/47d471560351fd82b61ec67a0fe1fe95e1c7dca8.png",
  66: "https://i0.hdslb.com/bfs/live/fa44dffeca568f3c01dad20d558d717ec18a1a9d.png",
  67: "https://i0.hdslb.com/bfs/live/ba4d7ce0bf7fbaf47feaf4f61dfb4e6aae127f31.png",
  68: "https://i0.hdslb.com/bfs/live/ce6a2ca64b8cd945d14b49807124b7a8a4ea946d.png",
  69: "https://i0.hdslb.com/bfs/live/1b539a6e84e2c6d56c156d58390079e29f4b1e86.png",
  70: "https://i0.hdslb.com/bfs/live/5cc2e7c4d170ed0607318455866df73cf521b8c4.png",
  71: "https://i0.hdslb.com/bfs/live/5fb31d57a85639e9b5bbb2193e2d05dd371d141f.png",
  72: "https://i0.hdslb.com/bfs/live/63c68ed11c975ae41e64bfc84a1a9181707edb93.png",
  73: "https://i0.hdslb.com/bfs/live/7fbf9b8259cc77ed1df005bb1531a945b7a03973.png",
  74: "https://i0.hdslb.com/bfs/live/62badcba91f6c0ed65abcf5bcd54e04fd35cbb7e.png",
  75: "https://i0.hdslb.com/bfs/live/cd784b3ba557c1d111eaafac35a803a421d6eaa1.png",
  76: "https://i0.hdslb.com/bfs/live/66db7b197e489be5aaa17c6b0c02ad52985feb66.png",
  77: "https://i0.hdslb.com/bfs/live/7c3365720cfad5bd2978825b0e48abe5e51ae229.png",
  78: "https://i0.hdslb.com/bfs/live/1ebfeefad355e5def3e9070a78721bab8077a009.png",
  79: "https://i0.hdslb.com/bfs/live/549b31ea6af55a3559a8d3ff46380e0a22b10c08.png",
  80: "https://i0.hdslb.com/bfs/live/6da9d5d7e68722cb7ec018c4f15dcbe15937ce8f.webp"
};

const BILI_GUARD_MEDAL_SOURCE_URLS: Record<Exclude<GuardType, 0>, string> = {
  1: "https://i0.hdslb.com/bfs/live/0d2b29717af2e7b1bbdc21a4fba8619636f82517.png",
  2: "https://i0.hdslb.com/bfs/live/405bffdfd78bb562e0394dd828f8bf69ea01f400.png",
  3: "https://i0.hdslb.com/bfs/live/00749d246e2b49b2328cb981de02142fb6aeceba.png"
};

const FAN_MEDAL_LEVEL_PALETTES: Array<{ max: number } & FanMedalPalette> = [
  {
    max: 4,
    start: "rgba(151, 158, 189, 0.80)",
    end: "rgba(151, 158, 189, 0.80)",
    border: "rgba(151, 158, 189, 0.8)",
    text: "#FFFFFF",
    level: "#FFFFFF"
  },
  {
    max: 20,
    start: "#3FB4F699",
    end: "#3FB4F699",
    border: "#3FB4F699",
    text: "#FFFFFF",
    level: "#FFFFFF"
  },
  {
    max: 40,
    start: "#4C7DFF99",
    end: "#4C7DFF99",
    border: "#4C7DFF99",
    text: "#FFFFFF",
    level: "#FFFFFF"
  },
  {
    max: 60,
    start: "#9660E5CC",
    end: "#9660E5CC",
    border: "#D47AFFFF",
    text: "#FFFFFF",
    level: "#FFFFFF"
  },
  {
    max: 80,
    start: "#FF8C5CCC",
    end: "#FFB84CCC",
    border: "#FFD86AFF",
    text: "#FFFFFF",
    level: "#FFFFFF"
  },
  {
    max: 120,
    start: "#FF5C7ACC",
    end: "#FFB35CCC",
    border: "#FFE17AFF",
    text: "#FFFFFF",
    level: "#FFFFFF"
  }
];

export function getWealthMedalUrl(level: number) {
  const medalLevel = getWealthMedalLevel(level);
  if (!medalLevel) {
    return null;
  }

  const extension = medalLevel === 80 ? "webp" : "png";
  return `/bili/wealth/${medalLevel}.${extension}`;
}

export function getWealthMedalSourceUrl(level: number) {
  const medalLevel = getWealthMedalLevel(level);
  return medalLevel ? (BILI_WEALTH_MEDAL_SOURCE_URLS[medalLevel] ?? null) : null;
}

export function getGuardMedalIconUrl(guardType: GuardType | number) {
  const guardLevel = normalizeGuardType(guardType);
  return guardLevel ? `/bili/guard/${guardLevel}.png` : null;
}

export function getGuardMedalSourceUrl(guardType: GuardType | number) {
  const guardLevel = normalizeGuardType(guardType);
  return guardLevel ? BILI_GUARD_MEDAL_SOURCE_URLS[guardLevel] : null;
}

export function getFanMedalStyle(
  level: number,
  colors: FanMedalColors = {}
): Record<string, string> {
  if (!Number.isFinite(level) || level <= 0) {
    return {};
  }

  const palette = resolveFanMedalPalette(level, colors);
  return {
    "--borderColor": palette.border,
    "--fanMedalTextColor": palette.text,
    "--fanMedalLevelColor": palette.level,
    backgroundImage: `linear-gradient(45deg, ${palette.start}, ${palette.end})`
  };
}

export function getFanMedalLayoutStyle(
  level: number,
  guardType: GuardType | number
): Record<string, string> {
  const hasGuard = Boolean(normalizeGuardType(guardType));
  return {
    "--fanMedalIconLeft": hasGuard ? "6px" : "0",
    "--fanMedalIconMarginLeft": hasGuard ? "-12px" : "0",
    "--fanMedalLabelWidth": hasGuard ? "16px" : "3px",
    "--fanMedalLevelWidth": getFallbackFontLevelWidth(level)
  };
}

export function getFanMedalLevelClass(level: number) {
  if (level > 99) {
    return "three-digits-level";
  }

  if (level > 0 && level < 10) {
    return "one-digit-level";
  }

  return "";
}

export function getFanMedalLabelClass(guardType: GuardType | number) {
  return normalizeGuardType(guardType)
    ? "fans-medal-label guard"
    : "fans-medal-label is-compact";
}

function resolveFanMedalPalette(
  level: number,
  colors: FanMedalColors
): FanMedalPalette {
  const fallback =
    FAN_MEDAL_LEVEL_PALETTES.find((palette) => level <= palette.max) ??
    FAN_MEDAL_LEVEL_PALETTES[FAN_MEDAL_LEVEL_PALETTES.length - 1];

  return {
    start: colors.start || fallback.start,
    end: colors.end || colors.start || fallback.end,
    border: colors.border || fallback.border,
    text: colors.text || fallback.text,
    level: colors.level || colors.text || fallback.level
  };
}

function getWealthMedalLevel(level: number) {
  if (!Number.isFinite(level) || level <= 0) {
    return null;
  }

  return Math.min(Math.trunc(level), BILI_WEALTH_MEDAL_MAX_LEVEL);
}

function normalizeGuardType(guardType: GuardType | number) {
  return guardType === 1 || guardType === 2 || guardType === 3
    ? guardType
    : null;
}

function getFallbackFontLevelWidth(level: number) {
  const length = Math.max(1, Math.trunc(Math.abs(level)).toString().length);
  if (length === 1) {
    return "7px";
  }

  if (length === 2) {
    return "13px";
  }

  return "20px";
}
