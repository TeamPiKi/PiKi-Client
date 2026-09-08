import {
  archiveThread,
  editChannelMessage,
  ensureThreadOnMessage,
  listRecentMessages,
  postChannelMessage,
  postThreadMessage,
} from './discord.js';

/** 진행 중 사이클 판별 마커 — 출시/반려 시 제목이 🎉/❌로 바뀌며 다음 사이클과 분리된다 */
const OPEN_PREFIX = '📦 PiKi';
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export const PROFILE_LABEL: Record<string, string> = {
  production: '심사용',
  'production-dev': '팀 테스트용',
};

export const PLATFORM_LABEL: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
};

/** 상태판 줄 키 — 한 사이클에서 양 플랫폼을 같이 빌드하므로 프로필만으로는 서로 덮어쓴다 */
export const lineKey = (platform: string, profile: string) =>
  `${PLATFORM_LABEL[platform] ?? platform} ${PROFILE_LABEL[profile] ?? profile}`;

/** 상태판 줄에 남기는 빌드 번호 — 빌드 식별 정보가 없는 ASC 이벤트가 되짚는 단서 */
export const buildTag = (buildVersion?: string | null) => (buildVersion ? `빌드 ${buildVersion} ` : '');

/** 줄 값에 적힌 빌드 번호 (`빌드 36 …` → `36`) */
export const buildOfLine = (value: string) => /^빌드 (\d+)/.exec(value)?.[1] ?? null;

export type RootStateT = { title: string; lines: string[] };

export type ReleaseLineT = { key: string; value: string | ((prev: string | null) => string) };

export type ReleaseUpdateT = {
  /** 스레드에 남길 로그 — 함수면 갱신 전 상태판 기반으로 계산 */
  log: string | ((root: RootStateT) => string);
  /** 루트 상태판에서 갱신할 줄 — 함수면 갱신 전 상태판 기반으로 계산 */
  lines?: ReleaseLineT[] | ((root: RootStateT) => ReleaseLineT[]);
  /** 알게 된 시점에 제목·스레드명에 1회 채워지는 버전 */
  version?: string | null;
  /** 사이클 종료 (출시·반려) 시 제목 교체 */
  final?: { emoji: string; text: string };
  /** 스레드 로그에서 핑을 허용할 유저 — 상태판 수정으로는 알림이 가지 않는다 */
  mentionUserIds?: string[] | ((root: RootStateT) => string[]);
};

/** `• 키: 값` 형태의 상태판 줄을 파싱 */
export const parseLines = ({ lines }: RootStateT) =>
  lines.flatMap(line => {
    const matched = /^• ([^:]+): (.*)$/.exec(line);
    return matched ? [{ key: matched[1] ?? '', value: matched[2] ?? '' }] : [];
  });

/** 진행 중 루트 상태판을 찾아(없으면 새로 열어) 갱신하고 스레드에 로그를 남긴다 */
export const updateReleaseThread = async (update: ReleaseUpdateT) => {
  const versionSuffix = update.version ? ` v${update.version}` : '';

  let root = (await listRecentMessages()).find(message => {
    if (!message.content.startsWith(OPEN_PREFIX)) return false;
    if (Date.now() - Date.parse(message.timestamp) >= MAX_AGE_MS) return false;
    /** 버전을 아는 이벤트는 같은 버전 루트에만 붙는다 (ASC 이벤트는 버전이 없어 최신 열린 루트) */
    if (update.version) {
      const rootVersion = / v([\d.]+)/.exec(message.content.split('\n')[0] ?? '')?.[1];
      if (rootVersion !== update.version) return false;
    }
    return true;
  });
  if (!root) {
    root = await postChannelMessage(`${OPEN_PREFIX}${versionSuffix} 배포 진행 중`);
  }
  await ensureThreadOnMessage(root.id, `${versionSuffix.trim() || '앱'} 배포`);

  const [title = '', ...lines] = root.content.split('\n');
  const state: RootStateT = { title, lines };
  const log = typeof update.log === 'function' ? update.log(state) : update.log;
  const mentionUserIds =
    typeof update.mentionUserIds === 'function'
      ? update.mentionUserIds(state)
      : update.mentionUserIds;

  let nextTitle = title;
  if (update.final) {
    const version = / v[\d.]+/.exec(nextTitle)?.[0] ?? '';
    nextTitle = `${update.final.emoji} PiKi${version} ${update.final.text}`;
  }

  const lineUpdates = typeof update.lines === 'function' ? update.lines(state) : (update.lines ?? []);
  for (const lineUpdate of lineUpdates) {
    const prefix = `• ${lineUpdate.key}:`;
    const index = lines.findIndex(line => line.startsWith(prefix));
    const prev = index >= 0 ? (lines[index]?.slice(prefix.length).trim() ?? null) : null;
    const value =
      typeof lineUpdate.value === 'function' ? lineUpdate.value(prev) : lineUpdate.value;
    const nextLine = `${prefix} ${value}`;
    if (index >= 0) lines[index] = nextLine;
    else lines.push(nextLine);
  }

  await editChannelMessage(root.id, [nextTitle, ...lines].join('\n'));
  /** 빈 로그는 상태판만 갱신하라는 뜻 (중복 알림 억제) */
  if (log) await postThreadMessage(root.id, log, mentionUserIds);
  /** 사이클이 끝났으면 스레드를 닫는다 — 글을 올린 뒤여야 다시 열리지 않는다 */
  if (update.final) {
    try {
      await archiveThread(root.id);
    } catch (error) {
      /** 닫기 실패로 502 를 내면 재시도가 붙어 메시지가 중복된다 — 로그는 이미 남았으니 삼킨다 */
      console.error('스레드 닫기 실패:', error);
    }
  }
};
