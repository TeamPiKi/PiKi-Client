import type { InitialProps as ShareExtensionProps } from 'expo-share-extension';
import { close, openHostApp } from 'expo-share-extension';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getWishFromShare } from '@/utils/getWishFromShare';
import {
  type ShareFailureReasonT,
  type ShareItemT,
  postWishLinkFromShare,
} from '@/utils/postWishLinkFromShare';
import { subscribeItemParsingFromShare } from '@/utils/subscribeItemParsingFromShare';

/** 실패 사유별 서브 문구. 서버 카탈로그와 별개로 시안 문구를 그대로 쓴다. */
const FAILURE_DESCRIPTION: Record<ShareFailureReasonT, string> = {
  unauthenticated: '',
  sessionExpired: '로그인이 만료됐어요',
  network: '네트워크 연결을 확인해주세요',
  server: '일시적인 오류가 발생했어요',
};

/** 로그인으로 유도할 사유 — 재시도해도 결과가 같다 */
const LOGIN_REQUIRED_REASONS: ShareFailureReasonT[] = ['unauthenticated', 'sessionExpired'];

/** 재시도는 1회까지. 또 실패하면 확인 버튼만 남긴다. */
const MAX_RETRY_COUNT = 1;

export type SheetStateT =
  /** POST 진행 중 + 파싱 대기(SSE) — 화면은 동일한 로딩 */
  | { status: 'loading' }
  /** 파싱 결과를 못 받은 폴백 — 저장 성공은 POST 응답으로 이미 확정 */
  | { status: 'success'; wishId?: number }
  | { status: 'ready'; item: ShareItemT; wishId: number }
  | { status: 'incomplete'; wishId: number }
  | { status: 'failed'; wishId: number }
  | { status: 'error'; reason: ShareFailureReasonT; retryable: boolean };

const formatPrice = (price: number) => `${price.toLocaleString('ko-KR')}원`;

export default function ShareBottomSheet(props: ShareExtensionProps) {
  return (
    <SafeAreaProvider>
      <ShareBottomSheetContent {...props} />
    </SafeAreaProvider>
  );
}

function ShareBottomSheetContent({ url, text }: ShareExtensionProps) {
  const [sheetState, setSheetState] = useState<SheetStateT>({ status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  /** openHostApp path 규칙: `/{path}?{query}` — `web=...`만 넘기면 `/web=...` 라우트로 해석됨 */
  const openHostAppAt = (webPath: string) => {
    /** 호스트 앱으로 넘어가면 시트는 볼 일이 없다 — SSE 연결부터 정리 */
    abortRef.current?.abort();
    openHostApp(`/?web=${encodeURIComponent(webPath)}`);
  };

  const handleOpenWishlist = () => openHostAppAt('/archive/wish');
  const handleOpenLogin = () => openHostAppAt('/login');
  const handleOpenWishEdit = (wishId: number) => openHostAppAt(`/archive/wish/${wishId}`);

  const handleClose = () => {
    abortRef.current?.abort();
    close();
  };

  useEffect(() => {
    /**
     * NOTE: 웹은 url, 앱은 text로 링크와 상품 설명이 함께 오는 경우가 많음
     *
     * ex)
     * - 웹: {"rootTag":11,"initialProps":{"pixelRatio":3,"initialViewWidth":390,"url":"https://29cm.onelink.me/1080201211/sacus9l2","initialViewHeight":844,"fontScale":0.8823529411764706},"fabric":true}
     * - 앱: {"rootTag":11,"initialProps":{"pixelRatio":3,"initialViewWidth":390,"fontScale":0.8823529411764706,"initialViewHeight":844,"text":"[제작/빅사이즈]이블렛 케이닌 쿨링 리본 뷔스티에 미니원피스 제이스타일\nhttps://s.zigzag.kr/XWnpU1fuZx"},"fabric":true}
     */
    const urlFromText = text?.match(/https?:\/\/[^\s]+/)?.[0]?.replace(/[),.]+$/, '');
    const productUrl = url ?? urlFromText;

    /** 링크를 못 찾은 경우 — 공유된 내용이 그대로라 다시 눌러도 같다 */
    if (!productUrl) {
      setSheetState({ status: 'error', reason: 'server', retryable: false });
      return;
    }

    let isMounted = true;
    const abortController = new AbortController();
    abortRef.current = abortController;

    /** 응답·SSE 어느 쪽이든 아이템이 종결 상태면 해당 화면으로 전환 */
    const applyParsedItem = (item: ShareItemT, wishId: number): boolean => {
      if (item.status === 'READY') {
        setSheetState({ status: 'ready', item, wishId });
        return true;
      }
      if (item.status === 'INCOMPLETE') {
        setSheetState({ status: 'incomplete', wishId });
        return true;
      }
      if (item.status === 'FAILED') {
        setSheetState({ status: 'failed', wishId });
        return true;
      }
      return false;
    };

    const registerWish = async () => {
      const result = await postWishLinkFromShare(productUrl);

      if (!isMounted) return;

      if (!result.ok) {
        setSheetState({ status: 'error', reason: result.reason, retryable: result.retryable });
        return;
      }

      const { wish, item, accessToken } = result;

      /** 응답 body 를 못 읽으면 파싱 안내 없이 기존 성공 화면 */
      if (!wish || !item) {
        setSheetState({ status: 'success' });
        return;
      }

      /** reused 등으로 이미 종결된 아이템 — SSE 생략 */
      if (applyParsedItem(item, wish.id)) return;

      /** PENDING·PROCESSING — 로딩을 유지한 채 파싱 결과를 기다린다 */
      const sseResult = await subscribeItemParsingFromShare({
        itemId: item.id,
        accessToken,
        signal: abortController.signal,
      });

      if (!isMounted) return;

      if (sseResult === 'READY') {
        /** SSE payload 에는 상품명·가격이 없어 상세를 재조회해 카드를 채운다 */
        const detailItem = await getWishFromShare(wish.id, accessToken);

        if (!isMounted) return;

        if (detailItem && applyParsedItem(detailItem, wish.id)) return;
        /** 재조회 실패 — 저장은 확정이므로 기존 성공 화면으로 폴백 */
        setSheetState({ status: 'success', wishId: wish.id });
        return;
      }

      if (sseResult === 'INCOMPLETE') {
        setSheetState({ status: 'incomplete', wishId: wish.id });
        return;
      }

      if (sseResult === 'FAILED') {
        setSheetState({ status: 'failed', wishId: wish.id });
        return;
      }

      /** 타임아웃·연결 실패 — 기존 성공 화면 폴백 */
      setSheetState({ status: 'success', wishId: wish.id });
    };

    void registerWish();

    return () => {
      isMounted = false;
      abortController.abort();
    };
    // retryCount 가 바뀌면 같은 링크로 다시 등록을 시도한다
  }, [url, text, retryCount]);

  const handleRetry = () => {
    setSheetState({ status: 'loading' });
    setRetryCount(count => count + 1);
  };

  const canRetry =
    sheetState.status === 'error' && sheetState.retryable && retryCount < MAX_RETRY_COUNT;

  return (
    <ShareBottomSheetView
      state={sheetState}
      canRetry={canRetry}
      onClose={handleClose}
      onRetry={handleRetry}
      onOpenLogin={handleOpenLogin}
      onOpenWishlist={handleOpenWishlist}
      onOpenWishEdit={handleOpenWishEdit}
    />
  );
}

type ShareBottomSheetViewProps = {
  state: SheetStateT;
  canRetry: boolean;
  onClose: () => void;
  onRetry: () => void;
  onOpenLogin: () => void;
  onOpenWishlist: () => void;
  onOpenWishEdit: (wishId: number) => void;
};

/** 상태별 렌더만 담당 — dev 프리뷰(dev/share-sheet-preview)에서 mock 상태로 재사용한다 */
export function ShareBottomSheetView({
  state: sheetState,
  canRetry,
  onClose,
  onRetry,
  onOpenLogin,
  onOpenWishlist,
  onOpenWishEdit,
}: ShareBottomSheetViewProps) {
  if (sheetState.status === 'loading')
    return (
      <SheetContainer>
        <View style={styles.handle} />

        <Text allowFontScaling={false} style={styles.title}>
          위시를 담고 있어요
        </Text>

        <View style={styles.imageArea}>
          <Image
            source={require('@/assets/images/share-bottom-sheet/basket.png')}
            style={styles.basket}
          />

          <LoadingDots />
        </View>
      </SheetContainer>
    );

  if (sheetState.status === 'error') {
    const { reason } = sheetState;
    const isLoginRequired = LOGIN_REQUIRED_REASONS.includes(reason);
    /** 토큰 자체가 없으면 실패가 아니라 로그인 유도 화면 (세션 만료는 실패 화면 + 로그인 버튼) */
    const isLoginPrompt = reason === 'unauthenticated';

    return (
      <SheetContainer onDimPress={onClose}>
        <View style={styles.handle} />

        <View style={styles.titleGroup}>
          <Text allowFontScaling={false} style={styles.title}>
            {isLoginPrompt ? '위시를 담으려면 로그인 해주세요' : '위시를 저장하지 못했어요'}
          </Text>
          {FAILURE_DESCRIPTION[reason] ? (
            <Text allowFontScaling={false} style={styles.description}>
              {FAILURE_DESCRIPTION[reason]}
            </Text>
          ) : null}
        </View>

        {isLoginPrompt ? (
          <View style={styles.imageArea}>
            <Image
              source={require('@/assets/images/share-bottom-sheet/login-tag.png')}
              style={styles.loginImage}
            />
          </View>
        ) : (
          <View style={styles.imageArea}>
            <Image
              source={require('@/assets/images/share-bottom-sheet/basket.png')}
              style={styles.basket}
            />

            <Image
              source={require('@/assets/images/share-bottom-sheet/icon-error.png')}
              style={styles.overlayIcon}
            />
          </View>
        )}

        {isLoginRequired || canRetry ? (
          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.buttonSecondary]} onPress={onClose}>
              <Text allowFontScaling={false} style={styles.buttonSecondaryText}>
                {isLoginRequired ? '나중에 할게요' : '확인'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.buttonPrimary]}
              onPress={isLoginRequired ? onOpenLogin : onRetry}
            >
              <Text allowFontScaling={false} style={styles.buttonText}>
                {isLoginRequired ? '로그인하기' : '다시 시도'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={[styles.button, styles.buttonFull]} onPress={onClose}>
            <Text allowFontScaling={false} style={styles.buttonText}>
              확인
            </Text>
          </Pressable>
        )}
      </SheetContainer>
    );
  }

  if (sheetState.status === 'ready') {
    const { item, wishId } = sheetState;

    return (
      <SheetContainer onDimPress={onClose}>
        <View style={styles.handle} />

        <Text allowFontScaling={false} style={styles.title}>
          위시를 담았어요
        </Text>

        <View style={styles.productCard}>
          <View style={styles.productThumbnailWrap}>
            <View style={styles.productThumbnail}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
              ) : null}
              <View style={styles.productImageDim} />
            </View>

            <Image
              source={require('@/assets/images/share-bottom-sheet/icon-success.png')}
              style={styles.productCheckBadge}
            />
          </View>

          <View style={styles.productInfo}>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.productName}>
              {item.name}
            </Text>
            {item.price != null ? (
              <Text allowFontScaling={false} style={styles.productPrice}>
                {formatPrice(item.price)}
              </Text>
            ) : null}
          </View>
        </View>

        <Pressable
          style={[styles.button, styles.buttonFull]}
          onPress={() => onOpenWishEdit(wishId)}
        >
          <Text allowFontScaling={false} style={styles.buttonText}>
            위시 보러가기
          </Text>
        </Pressable>
      </SheetContainer>
    );
  }

  if (sheetState.status === 'incomplete' || sheetState.status === 'failed') {
    const isIncomplete = sheetState.status === 'incomplete';

    return (
      <SheetContainer onDimPress={onClose}>
        <View style={styles.handle} />

        <View style={styles.titleGroup}>
          <Text allowFontScaling={false} style={styles.title}>
            {isIncomplete ? '일부 누락된 상품 정보가 있어요' : '위시를 저장하지 못했어요'}
          </Text>
          <Text allowFontScaling={false} style={styles.description}>
            {isIncomplete ? '누락된 정보를 직접 입력해주세요' : '상품 정보를 직접 입력해주세요'}
          </Text>
        </View>

        <View style={styles.imageArea}>
          <Image
            source={require('@/assets/images/share-bottom-sheet/basket.png')}
            style={styles.basket}
          />

          <Image
            source={
              isIncomplete
                ? require('@/assets/images/share-bottom-sheet/icon-warning.png')
                : require('@/assets/images/share-bottom-sheet/icon-error.png')
            }
            style={styles.overlayIcon}
          />
        </View>

        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.buttonSecondary]} onPress={onClose}>
            <Text allowFontScaling={false} style={styles.buttonSecondaryText}>
              나중에 할게요
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => onOpenWishEdit(sheetState.wishId)}
          >
            <Text allowFontScaling={false} style={styles.buttonText}>
              {isIncomplete ? '상품정보 확인하기' : '상품정보 입력하기'}
            </Text>
          </Pressable>
        </View>
      </SheetContainer>
    );
  }

  return (
    <SheetContainer onDimPress={onClose}>
      <View style={styles.handle} />

      <Text allowFontScaling={false} style={styles.title}>
        위시를 담았어요
      </Text>

      <View style={styles.imageArea}>
        <Image
          source={require('@/assets/images/share-bottom-sheet/basket.png')}
          style={styles.basket}
        />

        <Image
          source={require('@/assets/images/share-bottom-sheet/icon-success.png')}
          style={styles.overlayIcon}
        />
      </View>

      <Pressable
        style={[styles.button, styles.buttonFull]}
        onPress={() =>
          sheetState.wishId != null ? onOpenWishEdit(sheetState.wishId) : onOpenWishlist()
        }
      >
        <Text allowFontScaling={false} style={styles.buttonText}>
          위시 보러가기
        </Text>
      </Pressable>
    </SheetContainer>
  );
}

type SheetContainerProps = {
  children: ReactNode;
  onDimPress?: () => void;
};

function SheetContainer({ children, onDimPress }: SheetContainerProps) {
  const { top, bottom } = useSafeAreaInsets();

  return (
    <View style={styles.wrapper}>
      <Pressable style={[styles.dim, { top: -top }]} onPress={onDimPress} disabled={!onDimPress} />
      {/* 시안 하단 패딩 20 보장 — 홈 인디케이터 인셋이 더 크면 그만큼 띄운다 */}
      <View style={[styles.sheet, { paddingBottom: Math.max(bottom, 20) }]}>{children}</View>
    </View>
  );
}

const DOT_COUNT = 3;
const DOT_INTERVAL_MS = 400;

function LoadingDots() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveIndex(previousIndex => (previousIndex + 1) % DOT_COUNT);
    }, DOT_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <View style={styles.dots}>
      {Array(DOT_COUNT)
        .fill(0)
        .map((_, dotIndex) => (
          <View
            key={dotIndex}
            style={[
              styles.dot,
              {
                backgroundColor: dotIndex === activeIndex ? '#191B1F' : '#F4F4F6',
              },
            ]}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#00000066',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  handle: {
    height: 4,
    width: 36,
    backgroundColor: '#D9D9D9',
    borderRadius: 24,
    marginBottom: 16,
  },
  titleGroup: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.6,
    fontWeight: 'bold',
    color: '#2D3037',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.6,
    fontWeight: '500',
    color: '#686F7E',
    textAlign: 'center',
  },
  imageArea: {
    width: 320,
    height: 169,
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  basket: {
    width: 145,
    height: 106,
    marginTop: 32,
  },
  overlayIcon: {
    width: 48,
    height: 46,
    position: 'absolute',
    top: 73,
  },
  loginImage: {
    width: 118,
    height: 143,
    marginTop: 13,
  },
  dots: {
    position: 'absolute',
    top: 94,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F4F4F6',
  },

  productCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    width: '100%',
    marginTop: 32,
    marginBottom: 32,
  },
  /** iOS 는 overflow hidden 이 그림자를 잘라 그림자·클리핑 레이어를 분리 */
  productThumbnailWrap: {
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  productThumbnail: {
    width: 68,
    height: 68,
    borderRadius: 16,
    borderWidth: 1.85,
    borderColor: '#FFFFFF',
    backgroundColor: '#F4F4F6',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImageDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  productCheckBadge: {
    width: 28,
    height: 27,
    position: 'absolute',
    top: 21.5,
    left: 20,
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.6,
    fontWeight: '600',
    color: '#171719',
  },
  productPrice: {
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.6,
    fontWeight: '600',
    color: 'rgba(55, 56, 60, 0.61)',
  },

  /** 시안 버튼 폭 175/176 + gap 12 — 기기 폭에 맞춰 균등 분할한다 */
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFull: {
    width: '100%',
    backgroundColor: '#191B1F',
    borderWidth: 1,
    borderColor: '#2D3037',
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: '#191B1F',
    borderWidth: 1,
    borderColor: '#2D3037',
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: '#E9E9ED',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.6,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#686F7E',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.6,
    fontWeight: '600',
  },
});
