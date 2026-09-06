import {
  archiveThread,
  editChannelMessage,
  ensureThreadOnMessage,
  listRecentMessages,
  postChannelMessage,
  postThreadMessage,
} from './discord.js';

/** 진행 중 사이클 판별 마커 — 출시/반려 시 제목이 🎉/❌로 바뀌며 다음 사이클과 분리된다 */
const OPEN_PREFIX = '📦 [iOS] PiKi';
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export const PROFILE_LABEL: Record<string, string> = {
  production: '심사용',
  'production-dev': '팀 테스트용',
};

/** 상태판 줄에 남기는 빌드 번호 — 빌드 식별 정보가 없는 ASC 이벤트가 되짚는 유일한 단서 */
export const buildTag = (buildVersion?: string | null) => (buildVersion ? `빌드 ${buildVersion} ` : '');

export type RootStateT = { title: string; lines: string[] };

export type ReleaseUpdateT = {
  /** 스레드에 남길 로그 — 함수면 갱신 전 상태판 기반으로 계산 */
  log: string | ((root: RootStateT) => string);
  /** 루트 상태판에서 갱신할 줄 — 함수면 기존 값 기반으로 계산 (카운터 등) */
  line?: { key: string; value: string | ((prev: string | null) => string) };
  /** 알게 된 시점에 제목·스레드명에 1회 채워지는 버전 */
  version?: string | null;
  /** 사이클 종료 (출시·반려) 시 제목 교체 */
  final?: { emoji: string; text: string };
};

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
  await ensureThreadOnMessage(root.id, `iOS${versionSuffix} 배포`);

  const [title = '', ...lines] = root.content.split('\n');
  const log = typeof update.log === 'function' ? update.log({ title, lines }) : update.log;

  let nextTitle = title;
  if (update.final) {
    const version = / v[\d.]+/.exec(nextTitle)?.[0] ?? '';
    nextTitle = `${update.final.emoji} [iOS] PiKi${version} ${update.final.text}`;
  }

  if (update.line) {
    const prefix = `• ${update.line.key}:`;
    const index = lines.findIndex(line => line.startsWith(prefix));
    const prev = index >= 0 ? (lines[index]?.slice(prefix.length).trim() ?? null) : null;
    const value = typeof update.line.value === 'function' ? update.line.value(prev) : update.line.value;
    const nextLine = `${prefix} ${value}`;
    if (index >= 0) lines[index] = nextLine;
    else lines.push(nextLine);
  }

  await editChannelMessage(root.id, [nextTitle, ...lines].join('\n'));
  /** 빈 로그는 상태판만 갱신하라는 뜻 (중복 알림 억제) */
  if (log) await postThreadMessage(root.id, log);
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
