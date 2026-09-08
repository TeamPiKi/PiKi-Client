export type DiscordMessageT = { id: string; content: string; timestamp: string };

const API_BASE = 'https://discord.com/api/v10';
const REQUEST_TIMEOUT_MS = 10_000;

export class DiscordApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const discordRequest = async (path: string, init?: RequestInit) => {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error('DISCORD_BOT_TOKEN 환경변수가 없습니다');

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new DiscordApiError(
      `Discord API 실패 (${init?.method ?? 'GET'} ${path} → HTTP ${response.status}) ${await response.text()}`,
      response.status
    );
  }
  return response;
};

const requireChannelId = () => {
  const channelId = process.env.DISCORD_DEPLOY_CHANNEL_ID;
  if (!channelId) throw new Error('DISCORD_DEPLOY_CHANNEL_ID 환경변수가 없습니다');
  return channelId;
};

/** 외부 텍스트가 섞여도 멘션이 울리지 않도록 파싱 차단 — 지정한 유저만 예외로 허용 */
const messageBody = (content: string, mentionUserIds?: string[]) =>
  JSON.stringify({
    content,
    allowed_mentions: mentionUserIds?.length ? { parse: [], users: mentionUserIds } : { parse: [] },
  });

export const sendDiscordMessage = async (content: string) => {
  await discordRequest(`/channels/${requireChannelId()}/messages`, {
    method: 'POST',
    body: messageBody(content),
  });
};

export const listRecentMessages = async (): Promise<DiscordMessageT[]> => {
  const response = await discordRequest(`/channels/${requireChannelId()}/messages?limit=50`);
  return (await response.json()) as DiscordMessageT[];
};

export const postChannelMessage = async (content: string): Promise<DiscordMessageT> => {
  const response = await discordRequest(`/channels/${requireChannelId()}/messages`, {
    method: 'POST',
    body: messageBody(content),
  });
  return (await response.json()) as DiscordMessageT;
};

export const editChannelMessage = async (messageId: string, content: string) => {
  await discordRequest(`/channels/${requireChannelId()}/messages/${messageId}`, {
    method: 'PATCH',
    body: messageBody(content),
  });
};

/** 메시지에서 스레드 생성 (스레드 id == 메시지 id) — "이미 존재"(400)만 무시, 그 외는 전파 */
export const ensureThreadOnMessage = async (messageId: string, name: string) => {
  try {
    await discordRequest(`/channels/${requireChannelId()}/messages/${messageId}/threads`, {
      method: 'POST',
      body: JSON.stringify({ name, auto_archive_duration: 10080 }),
    });
  } catch (error) {
    if (error instanceof DiscordApiError && error.status === 400) return;
    throw error;
  }
};

/** 스레드 닫기 — 새 글이 올라오면 디스코드가 자동으로 다시 연다 */
export const archiveThread = async (threadId: string) => {
  await discordRequest(`/channels/${threadId}`, {
    method: 'PATCH',
    body: JSON.stringify({ archived: true }),
  });
};

/** 멘션은 이 경로에만 실린다 — 상태판은 수정이라 Discord 가 알림을 보내지 않는다 */
export const postThreadMessage = async (
  threadId: string,
  content: string,
  mentionUserIds?: string[]
) => {
  await discordRequest(`/channels/${threadId}/messages`, {
    method: 'POST',
    body: messageBody(content, mentionUserIds),
  });
};

/** 링크 라벨 인젝션(](url)) 차단용 Markdown 특수문자 이스케이프 */
export const escapeMarkdown = (text: string) => text.replace(/[[\]`\\]/g, '\\$&');
